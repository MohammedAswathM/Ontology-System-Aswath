import React from 'react';

function AgentActivity({ pipeline }) {
    if (!pipeline || !pipeline.steps) return null;

    return (
        <div className="agent-activity">
            <h3>🤖 Agent Activity Pipeline</h3>
            <div className="timeline">
                {pipeline.steps.map((step, i) => (
                    <div key={i} className="timeline-item">
                        <div className="timeline-marker">{i + 1}</div>
                        <div className="timeline-content">
                            <div className="agent-name">{step.agent}</div>
                            {step.action && <div className="action">{step.action}</div>}
                            {step.output && (
                                <details>
                                    <summary>View Output</summary>
                                    <pre>{JSON.stringify(step.output, null, 2)}</pre>
                                </details>
                            )}
                            {step.error && <div className="error">Error: {step.error}</div>}
                            <div className="timestamp">{new Date(step.timestamp).toLocaleTimeString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AgentActivity;