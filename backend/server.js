const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Configuration Imports
const { initializeGraph } = require('./config/langchain');
const vectorStore = require('./config/vectorStore');
const { driver } = require('./config/neo4j'); 

// Route Imports
const queryRouter = require('./routes/query');
const observationRouter = require('./routes/observation');
const graphRouter = require('./routes/graph');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Services
async function initializeServices() {
    try {
        console.log('\n🚀 Initializing Ontology Knowledge Graph System...\n');

        // 1. Initialize LangChain Graph Wrapper
        await initializeGraph();

        // 2. Initialize Vector Store (ChromaDB)
        await vectorStore.initialize();

        // 3. Verify Neo4j Connectivity
        await driver.verifyConnectivity();
        console.log('✓ Neo4j Driver connected successfully');

        console.log('\n✓ All services initialized successfully\n');
    } catch (error) {
        console.error('❌ Initialization error:', error.message);
    }
}

// Start Initialization
initializeServices();

// Routes
app.use('/api/query', queryRouter);
app.use('/api/observation', observationRouter);
app.use('/api/graph', graphRouter);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            neo4j: 'active',
            chromadb: 'active'
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Ontology Knowledge Graph System`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Server: http://localhost:${PORT}`);
    console.log(`🔍 Query API: http://localhost:${PORT}/api/query`);
    console.log(`🤖 Observation API: http://localhost:${PORT}/api/observation`);
    console.log(`📈 Graph API: http://localhost:${PORT}/api/graph`);
    console.log(`${'='.repeat(60)}\n`);
});