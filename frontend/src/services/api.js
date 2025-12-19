import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = {
    // Initialize base ontology
    initializeGraph: async () => {
        const response = await axios.post(`${API_URL}/graph/initialize`);
        return response.data;
    },

    // Get graph stats
    getStats: async () => {
        const response = await axios.get(`${API_URL}/graph/stats`);
        return response.data;
    },

    // Get visualization data
    getVisualization: async () => {
        const response = await axios.get(`${API_URL}/graph/visualization`);
        return response.data;
    },

    // Submit natural language query
    submitQuery: async (query) => {
        const response = await axios.post(`${API_URL}/query`, { query });
        return response.data;
    },

    // Submit observation for multi-agent processing
    submitObservation: async (observation) => {
        const response = await axios.post(`${API_URL}/observation`, { observation });
        return response.data;
    }
};

export default api;