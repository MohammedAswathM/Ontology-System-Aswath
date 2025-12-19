const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import the driver to check connection on startup
const { driver } = require('./config/neo4j');

const queryRouter = require('./routes/query');
const observationRouter = require('./routes/observation');
const graphRouter = require('./routes/graph');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/query', queryRouter);
app.use('/api/observation', observationRouter);
app.use('/api/graph', graphRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server AND check DB connection
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Graph API: http://localhost:${PORT}/api/graph`);
    console.log(`🔍 Query API: http://localhost:${PORT}/api/query`);
    console.log(`🤖 Observation API: http://localhost:${PORT}/api/observation`);

    // Verify Neo4j Connection
    try {
        await driver.verifyConnectivity();
        console.log('✅ Neo4j Connection Successful!');
        console.log(`🔌 Connected to: ${process.env.NEO4J_URI}`);
        console.log(`📂 Database: ${process.env.NEO4J_DATABASE || 'neo4j'}`);
    } catch (error) {
        console.error('❌ Neo4j Connection Failed:', error.message);
        console.error('   -> Check your .env username/password');
        console.error('   -> Check if Neo4j Desktop is running');
    }
});