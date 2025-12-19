const express = require('express');
const router = express.Router();
const kgService = require('../services/kgService');

// Initialize base ontology
router.post('/initialize', async (req, res) => {
    try {
        const result = await kgService.initializeBaseOntology();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get graph statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await kgService.getGraphStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get visualization data
router.get('/visualization', async (req, res) => {
    try {
        const data = await kgService.getVisualizationData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;