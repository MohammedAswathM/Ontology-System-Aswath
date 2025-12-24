const express = require('express');
const router = express.Router();
const kgService = require('../services/kgService');

// Get Graph Statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await kgService.getGraphStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Visualization Data (Nodes & Edges)
router.get('/visualization', async (req, res) => {
    try {
        const data = await kgService.getVisualizationData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Initialize Base Ontology
router.post('/init', async (req, res) => {
    try {
        const result = await kgService.initializeBaseOntology();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;