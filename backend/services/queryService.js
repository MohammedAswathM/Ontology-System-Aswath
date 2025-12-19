const { model } = require('../config/gemini'); // Matches the new export structure
const kgService = require('./kgService');

const queryService = {
    naturalLanguageQuery: async (query) => {
        try {
            // Step 1: Get the Graph Context
            const graphContext = await kgService.getGraphContext();
            
            // Step 2: Construct the Prompt
            const prompt = `
                You are an intelligent business assistant powered by a Knowledge Graph.
                
                Context from the Knowledge Graph (Facts):
                ${graphContext}
                
                User Query: "${query}"
                
                Instructions:
                1. Answer the query using ONLY the provided context.
                2. If the answer is found, explain the relationship (e.g., "Engineering executes Software Development").
                3. If the context is empty or doesn't contain the answer, say "I don't have enough information in the Knowledge Graph yet."
            `;

            console.log("🤖 Asking Gemini...");

            // Step 3: Call Gemini
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const answer = response.text();

            return {
                success: true,
                answer: answer,
                cypherQuery: `MATCH (n)-[r]-(m) WHERE toLower(n.label) CONTAINS '${query.split(' ')[0].toLowerCase()}' RETURN n,r,m`,
                results: graphContext.split('\n').slice(0, 5)
            };

        } catch (error) {
            console.error('Query Error:', error);
            return {
                success: false,
                answer: "I encountered an error processing your request.",
                error: error.message
            };
        }
    }
};

module.exports = queryService;