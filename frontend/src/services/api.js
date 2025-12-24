import axios from 'axios';

// Ensure this points to port 5000
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = {
    // Initialize base ontology
    initializeGraph: async () => {
        // FIXED: Changed '/graph/initialize' to '/graph/init' to match backend
        const response = await axios.post(`${API_URL}/graph/init`);
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
        // Ensure backend/routes/query.js expects a POST at root '/'
        const response = await axios.post(`${API_URL}/query`, { query });
        return response.data;
    },

    // Submit observation for multi-agent processing
    submitObservation: async (observation) => {
        // Ensure backend/routes/observation.js expects a POST at root '/'
        const response = await axios.post(`${API_URL}/observation`, { observation });
        return response.data;
    }
};

export default api;