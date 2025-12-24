const vectorStore = require('../config/vectorStore');

class VectorService {
    // Add a new entity to the vector database
    async addEntity(entity) {
        if (!entity || !entity.id) {
            console.warn('VectorService: Cannot add invalid entity', entity);
            return;
        }

        try {
            console.log(`VectorService: Adding entity ${entity.id} (${entity.type})`);
            await vectorStore.addEntity(entity);
        } catch (error) {
            console.error(`VectorService Error adding entity ${entity.id}:`, error);
        }
    }

    // Search for similar entities based on a text query
    async searchSimilar(query, limit = 5) {
        try {
            return await vectorStore.searchSimilar(query, limit);
        } catch (error) {
            console.error('VectorService Search Error:', error);
            return [];
        }
    }

    // Delete an entity from the vector index
    async deleteEntity(id) {
        try {
            await vectorStore.deleteEntity(id);
        } catch (error) {
            console.error(`VectorService Error deleting entity ${id}:`, error);
        }
    }
}

module.exports = new VectorService();