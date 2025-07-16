const express = require('express');
const cors = require('cors');
const { calculateVedicPlanets } = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'RVA API - Vedic Astrology Calculator is running',
        version: '1.0.0',
        endpoints: {
            calculate: 'POST /calculate-planets',
            health: 'GET /'
        }
    });
});

// Main calculation endpoint
app.post('/calculate-planets', async (req, res) => {
    try {
        const { date, time, lat, lon, timezone } = req.body;
        
        // Validate input
        if (!date || !time || lat === undefined || lon === undefined || timezone === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['date', 'time', 'lat', 'lon', 'timezone'],
                example: {
                    date: '1990-01-15',
                    time: '14:30',
                    lat: 28.6139,
                    lon: 77.2090,
                    timezone: 5.5
                }
            });
        }

        // Calculate planetary positions
        const result = calculateVedicPlanets({ date, time, lat, lon, timezone });
        
        res.json({
            success: true,
            data: result,
            input: { date, time, lat, lon, timezone }
        });
        
    } catch (error) {
        console.error('Calculation error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Something went wrong!' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`RVA API running on port ${PORT}`);
});