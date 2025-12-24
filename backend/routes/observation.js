const express = require('express');
const router = express.Router();
const agentOrchestrator = require('../agents/agentOrchestrator');

router.post('/', async (req, res) => {
  try {
    const { observation } = req.body;
    if (!observation) return res.status(400).json({ error: 'Observation is required' });
    
    const result = await agentOrchestrator.orchestrate(observation);
    res.json(result);
  } catch (error) {
    console.error('Observation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;