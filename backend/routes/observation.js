const express = require('express');
const router = express.Router();
const agentService = require('../services/agentService');

// Process user observation with multi-agent system
router.post('/', async (req, res) => {
    try {
        const { observation } = req.body;
        
        if (!observation) {
            return res.status(400).json({ error: 'Observation is required' });
        }

        const result = await agentService.processObservation(observation);
        res.json(result);
    } catch (error) {
        console.error('Observation route error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;