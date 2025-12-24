const { ChromaClient } = require('chromadb');

class VectorStoreService {
  constructor() {
    this.client = new ChromaClient({ path: process.env.CHROMA_URL || "http://localhost:8000" });
    this.collectionName = 'kg_entities';
    this.collection = null;
    this.isInitialized = false;
    
    this.stats = {
      totalEmbeddings: 0,
      totalSearches: 0,
      cacheHits: 0,
      avgSearchLatency: 0
    };

    // Simple cache for recent searches
    this.searchCache = new Map();
    this.maxCacheSize = 100;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'Knowledge graph entity embeddings',
          'hnsw:space': 'cosine', // Use HNSW for fast similarity search
          'hnsw:construction_ef': 200,
          'hnsw:M': 16
        }
      });
      
      this.isInitialized = true;
      console.log('✓ ChromaDB vector store initialized with HNSW');

    } catch (error) {
      console.warn('⚠️ ChromaDB unavailable:', error.message);
      console.warn('   Vector search will be disabled. Run: docker run -p 8000:8000 chromadb/chroma');
    }
  }

  async addEntity(id, text, metadata) {
    if (!this.collection) {
      await this.initialize();
      if (!this.collection) return; // Still failed
    }

    try {
      await this.collection.add({
        ids: [id],
        documents: [text],
        metadatas: [metadata]
      });

      this.stats.totalEmbeddings++;

    } catch (error) {
      console.error('Vector add error:', error.message);
    }
  }

  async addBatch(entities) {
    if (!this.collection) {
      await this.initialize();
      if (!this.collection) return;
    }

    try {
      const ids = entities.map(e => e.id);
      const documents = entities.map(e => 
        `${e.type}: ${e.label}. ${JSON.stringify(e.properties || {})}`
      );
      const metadatas = entities.map(e => ({
        id: e.id,
        type: e.type,
        label: e.label,
        ...e.properties
      }));

      await this.collection.add({
        ids,
        documents,
        metadatas
      });

      this.stats.totalEmbeddings += entities.length;
      console.log(`✓ Batch added ${entities.length} embeddings`);

    } catch (error) {
      console.error('Vector batch add error:', error.message);
    }
  }

  async search(query, limit = 5) {
    if (!this.collection) {
      await this.initialize();
      if (!this.collection) return [];
    }

    const startTime = Date.now();
    this.stats.totalSearches++;

    // Check cache
    const cacheKey = `${query}:${limit}`;
    if (this.searchCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.searchCache.get(cacheKey);
    }

    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit
      });

      if (!results.ids || results.ids.length === 0) return [];

      const formatted = results.ids[0].map((id, idx) => ({
        id,
        document: results.documents[0][idx],
        metadata: results.metadatas[0][idx],
        distance: results.distances[0][idx],
        similarity: (1 - results.distances[0][idx]).toFixed(3)
      }));

      // Update cache
      if (this.searchCache.size >= this.maxCacheSize) {
        const firstKey = this.searchCache.keys().next().value;
        this.searchCache.delete(firstKey);
      }
      this.searchCache.set(cacheKey, formatted);

      // Update stats
      const latency = Date.now() - startTime;
      this.stats.avgSearchLatency = 
        (this.stats.avgSearchLatency * (this.stats.totalSearches - 1) + latency) / this.stats.totalSearches;

      return formatted;

    } catch (error) {
      console.error('Vector search error:', error.message);
      return [];
    }
  }

  async deleteEntity(id) {
    if (!this.collection) return;

    try {
      await this.collection.delete({ ids: [id] });
    } catch (error) {
      console.error('Vector delete error:', error.message);
    }
  }

  async clearAll() {
    if (!this.collection) return;

    try {
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = null;
      this.isInitialized = false;
      await this.initialize();
      
      this.stats.totalEmbeddings = 0;
      console.log('✓ Vector store cleared');

    } catch (error) {
      console.error('Vector clear error:', error.message);
    }
  }

  getMetrics() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalSearches > 0
        ? (this.stats.cacheHits / this.stats.totalSearches * 100).toFixed(2) + '%'
: '0%',
avgSearchLatency: this.stats.avgSearchLatency.toFixed(0) + 'ms'
};
}
}
module.exports = new VectorStoreService();