import React, { useState } from 'react';

function ObservationInput({ onObservationSubmit }) {
    const [observation, setObservation] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!observation.trim()) return;

        setLoading(true);
        try {
            const data = await onObservationSubmit(observation);
            setResult(data);
            if (data.success) {
                setObservation(''); // Clear input on success
            }
        } catch (error) {
            setResult({ success: false, error: error.message });
        } finally {
            setLoading(false);
        }
    };

    const examples = [
        "We have a Marketing department that handles brand management",
        "The Sales team uses a CRM process that takes about 5 days",
        "Our company serves enterprise customers in the healthcare sector",
        "The Engineering Manager is responsible for the code review process"
    ];

    return (
        <div className="observation-input">
            <h2>🤖 Add Business Observation</h2>
            <p className="subtitle">Describe something about your business, and the AI agents will update the knowledge graph</p>

            <form onSubmit={handleSubmit}>
                <textarea
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Describe a business fact... (e.g., 'Our marketing team has 5 people and manages social media campaigns')"
                    rows="3"
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Submit Observation'}
                </button>
            </form>

            <div className="examples">
                <strong>Examples:</strong>
                {examples.map((ex, i) => (
                    <button
                        key={i}
                        className="example-btn"
                        onClick={() => setObservation(ex)}
                    >
                        {ex}
                    </button>
                ))}
            </div>

            {result && (
                <div className="observation-result">
                    {result.success ? (
                        <>
                            <div className="success">
                                ✓ {result.message}
                            </div>
                            {result.applied && result.applied.length > 0 && (
                                <div className="applied">
                                    <strong>Applied Changes:</strong>
                                    <ul>
                                        {result.applied.map((item, i) => (
                                            <li key={i}>
                                                {item.type === 'entity' ? `Added entity: ${item.id}` :
                                                    `Added relationship: ${item.from} → ${item.relType} → ${item.to}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.critique && (
                                <details>
                                    <summary>Agent Critique (Quality: {result.critique.qualityScore}/10)</summary>
                                    <div className="critique">
                                        <p><strong>Strengths:</strong></p>
                                        <ul>
                                            {result.critique.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                        <p><strong>Improvements:</strong></p>
                                        <ul>
                                            {result.critique.improvements?.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                </details>
                            )}
                        </>
                    ) : (
                        <div className="error">
                            Error: {result.error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ObservationInput;