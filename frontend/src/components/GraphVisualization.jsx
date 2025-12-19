/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';

function GraphVisualization({ data, onRefresh }) {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        // Fetch stats when component mounts
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/graph/stats');
            const statsData = await response.json();
            setStats(statsData);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    return (
        <div className="graph-visualization">
            <div className="header">
                <h2>📊 Knowledge Graph</h2>
                <button onClick={() => { onRefresh(); fetchStats(); }}>
                    Refresh
                </button>
            </div>

            {stats && (
                <div className="stats">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalNodes}</div>
                        <div className="stat-label">Total Entities</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalRelationships}</div>
                        <div className="stat-label">Relationships</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.nodesByType?.length || 0}</div>
                        <div className="stat-label">Entity Types</div>
                    </div>
                </div>
            )}

            {data && (
                <div className="graph-data">
                    <div className="nodes-section">
                        <h3>Entities ({data.nodes.length})</h3>
                        <div className="node-list">
                            {data.nodes.map(node => (
                                <div key={node.id} className={`node-item ${node.type}`}>
                                    <span className="node-type">{node.type}</span>
                                    <span className="node-label">{node.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="edges-section">
                        <h3>Relationships ({data.edges.length})</h3>
                        <div className="edge-list">
                            {data.edges.map((edge, i) => (
                                <div key={i} className="edge-item">
                                    {edge.from} → <strong>{edge.label}</strong> → {edge.to}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="neo4j-hint">
                <p>💡 <strong>Tip:</strong> Open Neo4j Browser at <a href="http://localhost:7474" target="_blank" rel="noopener noreferrer">localhost:7474</a> for visual graph exploration</p>
                {/* The fix is below: we used &gt; instead of > */}
                <p>Run query: <code>MATCH (n:Entity)-[r]-&gt;(m) RETURN n,r,m LIMIT 50</code></p>
            </div>
        </div>
    );
}

export default GraphVisualization;