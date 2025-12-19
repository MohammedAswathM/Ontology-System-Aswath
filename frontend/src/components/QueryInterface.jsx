import React, { useState } from 'react';

function QueryInterface({ onQuerySubmit }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const data = await onQuerySubmit(query);
            setResult(data);
        } catch (error) {
            setResult({ success: false, error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="query-interface">
            <h2>🔍 Query Knowledge Graph</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about your business... (e.g., 'What departments exist?')"
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Querying...' : 'Ask'}
                </button>
            </form>

            {result && (
                <div className="query-result">
                    {result.success ? (
                        <>
                            <div className="answer">
                                <strong>Answer:</strong>
                                <p>{result.answer}</p>
                            </div>
                            {result.cypherQuery && (
                                <details>
                                    <summary>Technical Details</summary>
                                    <div className="technical">
                                        <p><strong>Cypher Query:</strong></p>
                                        <code>{result.cypherQuery}</code>
                                        <p><strong>Raw Results:</strong></p>
                                        <pre>{JSON.stringify(result.results, null, 2)}</pre>
                                    </div>
                                </details>
                            )}
                        </>
                    ) : (
                        <div className="error">
                            <strong>Error:</strong> {result.error || result.answer}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default QueryInterface;