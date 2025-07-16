const swisseph = require('swisseph');
const path = require('path');

// Use relative path that works on any server
const ephePath = path.join(__dirname, 'swisseph', 'ephe');
console.log('Setting ephemeris path to:', ephePath);
swisseph.swe_set_ephe_path(ephePath);

// Set Lahiri Ayanamsa
swisseph.swe_set_sid_mode(swisseph.SIDM_LAHIRI);

const vedicSigns = [
    'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)',
    'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
    'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)',
    'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'
];

const nakshatras = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

const PLANETS = [
    { name: 'Sun', code: swisseph.SE_SUN },
    { name: 'Moon', code: swisseph.SE_MOON },
    { name: 'Mercury', code: swisseph.SE_MERCURY },
    { name: 'Venus', code: swisseph.SE_VENUS },
    { name: 'Mars', code: swisseph.SE_MARS },
    { name: 'Jupiter', code: swisseph.SE_JUPITER },
    { name: 'Saturn', code: swisseph.SE_SATURN },
    { name: 'Rahu', code: swisseph.SE_MEAN_NODE },
    { name: 'Ketu', code: swisseph.SE_MEAN_NODE }
];

function calculateVedicPlanets({ date, time, lat, lon, timezone }) {
    try {
        // Input validation
        if (!date || !time || lat === undefined || lon === undefined || timezone === undefined) {
            throw new Error('Missing required parameters: date, time, lat, lon, timezone');
        }

        // Parse date and time
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);
        
        // Validate parsed values
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
            throw new Error('Invalid date or time format');
        }
        
        // Convert local time to UTC
        const utcDecimal = hour - timezone + (minute / 60);
        
        // Julian Day
        const julianDay = swisseph.swe_julday(year, month, day, utcDecimal, swisseph.SE_GREG_CAL);
        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SIDEREAL;

        let results = {};
        let rahuLongitude = null;

        // Calculate Rahu first to use for Ketu calculation
        const rahuResult = swisseph.swe_calc_ut(julianDay, swisseph.SE_MEAN_NODE, flags);
        if (rahuResult.rflag >= 0) {
            rahuLongitude = rahuResult.longitude;
        }

        PLANETS.forEach((planet, idx) => {
            const result = swisseph.swe_calc_ut(julianDay, planet.code, flags);
            if (result.rflag >= 0) {
                let longitude = result.longitude;
                
                // For Ketu, calculate as opposite to Rahu
                if (planet.name === 'Ketu') {
                    if (rahuLongitude === null) {
                        results[planet.name] = { error: 'Rahu calculation failed' };
                        return;
                    }
                    longitude = (rahuLongitude + 180) % 360;
                }

                const signIndex = Math.floor(longitude / 30);
                const degreeInSign = longitude % 30;
                const nakshatraIndex = Math.floor(longitude / 13.333333);
                const nakshatraPosition = (longitude % 13.333333) / 13.333333 * 100;
                const pada = Math.floor(nakshatraPosition / 25) + 1;

                results[planet.name] = {
                    longitude: Number(longitude.toFixed(6)),
                    rashi: `${degreeInSign.toFixed(2)}° ${vedicSigns[signIndex]}`,
                    nakshatra: `${nakshatras[nakshatraIndex]} (${nakshatraPosition.toFixed(1)}%)`,
                    pada: pada,
                    distance: Number(result.distance.toFixed(6))
                };
            } else {
                results[planet.name] = { error: 'Calculation failed' };
            }
        });
        
        return results;
    } catch (error) {
        throw new Error(`Calculation error: ${error.message}`);
    } finally {
        // Always close the ephemeris
        swisseph.swe_close();
    }
}

module.exports = { calculateVedicPlanets };