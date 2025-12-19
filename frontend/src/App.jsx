import React, { useState, useEffect } from 'react';
import './App.css';
import api from './services/api';
import QueryInterface from './components/QueryInterface';
import ObservationInput from './components/ObservationInput';
import GraphVisualization from './components/GraphVisualization';
import AgentActivity from './components/AgentActivity';

function App() {
    const [initialized, setInitialized] = useState(false);
    const [graphData, setGraphData] = useState(null);
    const [lastPipeline, setLastPipeline] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkInitialization();
    }, []);

    const checkInitialization = async () => {
        try {
            const stats = await api.getStats();
            if (stats.totalNodes > 0) {
                setInitialized(true);
                loadGraphData();
            }
        } catch (error) {
            console.error('Error checking initialization:', error);
        }
    };

    const handleInitialize = async () => {
        setLoading(true);
        try {
            await api.initializeGraph();
            setInitialized(true);
            await loadGraphData();
            alert('✓ Base ontology initialized successfully!');
        } catch (error) {
            alert('Error initializing: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadGraphData = async () => {
        try {
            const data = await api.getVisualization();
            setGraphData(data);
        } catch (error) {
            console.error('Error loading graph:', error);
        }
    };

    const handleQuery = async (query) => {
        return await api.submitQuery(query);
    };

    const handleObservation = async (observation) => {
        const result = await api.submitObservation(observation);
        if (result.success && result.pipeline) {
            setLastPipeline(result.pipeline);
        }
        if (result.success) {
            await loadGraphData(); // Refresh graph
        }
        return result;
    };

    if (!initialized) {
        return (
            <div className="App">
                <div className="welcome">
                    <h1>Ontology-Based Knowledge Graph System</h1>
                    <p>Multi-Agent AI System for Dynamic Business Knowledge Management</p>
                    <button
                        onClick={handleInitialize}
                        disabled={loading}
                        className="init-button"
                    >
                        {loading ? 'Initializing...' : 'Initialize Base Ontology'}
                    </button>
                    <div className="features">
                        <div className="feature">
                            <span className="icon">🧠</span>
                            <h3>Base Ontology</h3>
                            <p>Generic business model that adapts to any industry</p>
                        </div>
                        <div className="feature">
                            <span className="icon">🤖</span>
                            <h3>Multi-Agent System</h3>
                            <p>Proposer → Validator → Critic pipeline</p>
                        </div>
                        <div className="feature">
                            <span className="icon">🔍</span>
                            <h3>Natural Language Queries</h3>
                            <p>Ask questions in plain English, powered by Gemini</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <header>
                <h1>🧠 Ontology Knowledge Graph System</h1>
                <p>Multi-Agent AI for Business Intelligence</p>
            </header>

            <div className="main-content">
                <div className="left-panel">
                    <QueryInterface onQuerySubmit={handleQuery} />
                    <ObservationInput onObservationSubmit={handleObservation} />
                    {lastPipeline && <AgentActivity pipeline={lastPipeline} />}
                </div>

                <div className="right-panel">
                    <GraphVisualization data={graphData} onRefresh={loadGraphData} />
                </div>
            </div>
        </div>
    );
}

export default App;