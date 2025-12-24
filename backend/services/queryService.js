const ragService = require('./ragService');

const queryService = {
    naturalLanguageQuery: async (query) => {
        try {
            if (!query) throw new Error("Query cannot be empty");

            console.log(`🧠 Processing Natural Language Query: "${query}"`);

            // Use the RAG Service to handle the heavy lifting
            const result = await ragService.queryWithRAG(query);

            return {
                success: true,
                answer: result.answer,
                cypherQuery: result.cypherQuery,
                context: result.context,
                similarEntities: result.similarEntities
            };

        } catch (error) {
            console.error('QueryService Error:', error);
            return {
                success: false,
                answer: "I encountered an error processing your request.",
                error: error.message
            };
        }
    }
};

module.exports = queryService;