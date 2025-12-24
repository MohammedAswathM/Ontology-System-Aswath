const geminiService = require('../config/gemini');
const crypto = require('crypto');

class ProposerAgent {
    constructor() {
        this.name = 'Proposer';
        this.cache = new Map(); // In-memory cache
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            apiCalls: 0,
            avgLatency: 0,
            errors: 0
        };
    }

    getCacheKey(observation) {
        return crypto.createHash('md5').update(observation.toLowerCase()).digest('hex');
    }

    async propose(observation) {
        const startTime = Date.now();
        this.stats.totalRequests++;

        try {
            // Check cache first
            const cacheKey = this.getCacheKey(observation);
            if (this.cache.has(cacheKey)) {
                console.log('✅ Cache hit for observation');
                this.stats.cacheHits++;
                return this.cache.get(cacheKey);
            }

            console.log('🤖 Proposer Agent analyzing observation...');
            this.stats.apiCalls++;

            const prompt = `
You are an AI Knowledge Graph Architect extracting structured data from business observations.

STRICT RULES:
1. Entity Types MUST be one of: [Organization, Department, Role, Process, Resource, Metric, Product, Service, Location, Event]
2. Generate unique IDs using snake_case format
3. Extract ONLY entities explicitly mentioned
4. Relationship types MUST follow domain logic:
   - Organization → HAS_DEPARTMENT → Department
   - Department → CONTAINS → Role  
   - Role → WORKS_IN → Department
   - Role → RESPONSIBLE_FOR → Process
   - Process → REQUIRES → Resource
   - Department → LOCATED_IN → Location

OUTPUT FORMAT (JSON ONLY):
{
  "entities": [
    {
      "id": "unique_snake_case_id",
      "label": "Human Readable Name",
      "type": "EntityType",
      "properties": {
        "description": "Brief description",
        "confidence": 0.95
      }
    }
  ],
  "relationships": [
    {
      "from": "source_entity_id",
      "to": "target_entity_id",
      "type": "RELATIONSHIP_TYPE",
      "properties": {
        "confidence": 0.90
      }
    }
  ],
  "metadata": {
    "extractedEntityCount": 2,
    "complexity": "simple|medium|complex"
  }
}

OBSERVATION: "${observation}"

Return ONLY valid JSON, no markdown, no explanation.
            `;

            const proposal = await geminiService.generateJSON(prompt);

            // Validate proposal structure
            if (!proposal.entities || !Array.isArray(proposal.entities)) {
                throw new Error('Invalid proposal structure: missing entities array');
            }

            // Add quality metrics
            proposal.metadata = {
                ...proposal.metadata,
                processingTime: Date.now() - startTime,
                cacheKey: cacheKey
            };

            // Cache the result
            this.cache.set(cacheKey, proposal);

            // Update stats
            const latency = Date.now() - startTime;
            this.stats.avgLatency = 
                (this.stats.avgLatency * (this.stats.totalRequests - 1) + latency) / this.stats.totalRequests;

            console.log(`   ✓ Proposed ${proposal.entities.length} entities, ${proposal.relationships.length} relationships`);
            return proposal;

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Proposer Agent Error:', error.message);
            throw new Error(`Proposer failed: ${error.message}`);
        }
    }

    getMetrics() {
        return {
            agent: this.name,
            ...this.stats,
            cacheHitRate: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = new ProposerAgent();