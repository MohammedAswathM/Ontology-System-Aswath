const proposer = require('./proposerAgent');
const validator = require('./validatorAgent');
const critic = require('./criticAgent');
const kgService = require('../services/kgService');
const vectorStore = require('../config/vectorStore');

class AgentOrchestrator {
  constructor() {
    this.stats = {
      totalOrchestrations: 0,
      successful: 0,
      failed: 0,
      avgTotalLatency: 0,
      agentLatencies: {
        proposer: [],
        validator: [],
        critic: [],
        applier: []
      }
    };
  }

  async orchestrate(observation) {
    const orchestrationId = Date.now();
    const startTime = Date.now();
    this.stats.totalOrchestrations++;

    const pipeline = {
      id: orchestrationId,
      observation,
      steps: [],
      metrics: {}
    };

    try {
      console.log(`\n🎯 [${orchestrationId}] Starting Multi-Agent Pipeline...`);
      
      // ============================================
      // STEP 1: PROPOSER AGENT
      // ============================================
      let proposal;
      const proposerStart = Date.now();
      
      try {
        console.log('🤖 [Proposer] Analyzing observation...');
        proposal = await proposer.propose(observation);
        
        const proposerLatency = Date.now() - proposerStart;
        this.stats.agentLatencies.proposer.push(proposerLatency);

        pipeline.steps.push({
          agent: 'Proposer',
          status: 'success',
          latency: proposerLatency,
          output: {
            entities: proposal.entities.length,
            relationships: proposal.relationships.length,
            complexity: proposal.metadata?.complexity || 'unknown'
          },
          timestamp: new Date().toISOString()
        });

        console.log(`   ✓ Proposer completed in ${proposerLatency}ms`);
        
        if (!proposal.entities || proposal.entities.length === 0) {
          throw new Error("Proposer returned empty data");
        }

      } catch (err) {
        console.error("❌ Proposer Step Failed:", err.message);
        pipeline.steps.push({
          agent: 'Proposer',
          status: 'failed',
          error: err.message,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Proposer failed: ${err.message}`);
      }

      // ============================================
      // STEP 2: VALIDATOR AGENT
      // ============================================
      let validation;
      const validatorStart = Date.now();

      try {
        console.log('✅ [Validator] Performing multi-dimensional validation...');
        validation = await validator.validate(proposal);
        
        const validatorLatency = Date.now() - validatorStart;
        this.stats.agentLatencies.validator.push(validatorLatency);

        pipeline.steps.push({
          agent: 'Validator',
          status: validation.isValid ? 'success' : 'rejected',
          latency: validatorLatency,
          output: {
            isValid: validation.isValid,
            dimensions: validation.dimensions,
            reason: validation.reason
          },
          timestamp: new Date().toISOString()
        });

        console.log(`   ✓ Validator completed in ${validatorLatency}ms`);

        if (!validation.isValid) {
          console.log(`⚠️ Validator rejected: ${validation.reason}`);
          this.stats.failed++;
          
          return {
            success: false,
            reason: validation.reason,
            pipeline,
            metrics: this.getSystemMetrics()
          };
        }

      } catch (err) {
        console.error("❌ Validator Step Failed:", err.message);
        pipeline.steps.push({
          agent: 'Validator',
          status: 'failed',
          error: err.message,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Validator failed: ${err.message}`);
      }

      // ============================================
      // STEP 3: CRITIC AGENT (OPTIONAL - CONFIGURABLE)
      // ============================================
      let critique = null;
      const criticStart = Date.now();

      // Enable/disable critic based on environment variable
      const ENABLE_CRITIC = process.env.ENABLE_CRITIC !== 'false';

      if (ENABLE_CRITIC) {
        try {
          console.log('🎯 [Critic] Evaluating quality...');
          const graphContext = await kgService.getGraphContext(20);
          const critiqueResult = await critic.critique(proposal, graphContext);
          critique = critiqueResult.critique;
          
          const criticLatency = Date.now() - criticStart;
          this.stats.agentLatencies.critic.push(criticLatency);

          pipeline.steps.push({
            agent: 'Critic',
            status: 'success',
            latency: criticLatency,
            output: {
              qualityScore: critique.overallScore,
              dimensions: critique.dimensions
            },
            timestamp: new Date().toISOString()
          });

          console.log(`   ✓ Critic completed in ${criticLatency}ms (Score: ${critique.overallScore}/10)`);

        } catch (err) {
          console.warn('⚠️ Critic failed, continuing anyway:', err.message);
          critique = {
            overallScore: 5,
            dimensions: { completeness: 5, specificity: 5, utility: 5, structure: 5 },
            strengths: [],
            improvements: ['Critique unavailable'],
            error: err.message
          };

          pipeline.steps.push({
            agent: 'Critic',
            status: 'warning',
            error: err.message,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.log('⚡ [Critic] Skipped (ENABLE_CRITIC=false)');
        critique = {
          overallScore: 'N/A',
          note: 'Critic disabled for performance'
        };
      }

      // ============================================
      // STEP 4: APPLY CHANGES TO NEO4J
      // ============================================
      const applierStart = Date.now();

      try {
        console.log('💾 [Applier] Writing to Neo4j...');
        const changes = await this.applyChanges(proposal);
        
        const applierLatency = Date.now() - applierStart;
        this.stats.agentLatencies.applier.push(applierLatency);

        pipeline.steps.push({
          agent: 'Applier',
          status: 'success',
          latency: applierLatency,
          output: changes,
          timestamp: new Date().toISOString()
        });

        console.log(`   ✓ Applied ${changes.entities} entities, ${changes.relationships} relationships in ${applierLatency}ms`);

      } catch (err) {
        console.error("❌ Applier Step Failed:", err.message);
        pipeline.steps.push({
          agent: 'Applier',
          status: 'failed',
          error: err.message,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Applier failed: ${err.message}`);
      }

      // ============================================
      // STEP 5: UPDATE VECTOR STORE
      // ============================================
      try {
        console.log('🔍 [VectorStore] Updating embeddings...');
        await this.updateVectorStore(proposal.entities);
        console.log('   ✓ Vector store updated');
      } catch (err) {
        console.warn('⚠️ Vector store update failed (non-critical):', err.message);
      }

      // ============================================
      // FINALIZE METRICS
      // ============================================
      const totalLatency = Date.now() - startTime;
      this.stats.avgTotalLatency = 
        (this.stats.avgTotalLatency * (this.stats.totalOrchestrations - 1) + totalLatency) 
        / this.stats.totalOrchestrations;
      
      this.stats.successful++;

      pipeline.metrics = {
        totalLatency,
        agentBreakdown: pipeline.steps.reduce((acc, step) => {
          if (step.latency) acc[step.agent] = step.latency;
          return acc;
        }, {}),
        throughput: (1000 / totalLatency).toFixed(2) + ' obs/sec'
      };

      console.log(`\n✅ Pipeline completed in ${totalLatency}ms\n`);

      return {
        success: true,
        changes: pipeline.steps.find(s => s.agent === 'Applier')?.output,
        pipeline,
        critique,
        metrics: this.getSystemMetrics()
      };

    } catch (error) {
      this.stats.failed++;
      console.error(`\n❌ [${orchestrationId}] Pipeline failed:`, error.message);

      return {
        success: false,
        error: error.message,
        pipeline,
        metrics: this.getSystemMetrics()
      };
    }
  }

  async applyChanges(proposal) {
    const results = { entities: 0, relationships: 0, errors: [] };

    // Apply entities
    for (const entity of proposal.entities) {
      try {
        await kgService.createEntity(entity);
        results.entities++;
      } catch (err) {
        console.error(`Failed to create entity ${entity.id}:`, err.message);
        results.errors.push({ entity: entity.id, error: err.message });
      }
    }

    // Apply relationships
    for (const rel of proposal.relationships) {
      try {
        await kgService.createRelationship(rel);
        results.relationships++;
      } catch (err) {
        console.error(`Failed to create relationship ${rel.from}->${rel.to}:`, err.message);
        results.errors.push({ relationship: `${rel.from}->${rel.to}`, error: err.message });
      }
    }

    return results;
  }

  async updateVectorStore(entities) {
    for (const entity of entities) {
      try {
        const text = `${entity.type}: ${entity.label}. ${JSON.stringify(entity.properties || {})}`;
        const metadata = {
          id: entity.id,
          type: entity.type,
          label: entity.label,
          ...entity.properties
        };
        await vectorStore.addEntity(entity.id, text, metadata);
      } catch (err) {
        console.warn(`Vector store error for ${entity.id}:`, err.message);
      }
    }
  }

  getSystemMetrics() {
    const calculateAvg = (arr) => arr.length > 0 
      ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) 
      : 0;

    return {
      system: {
        totalOrchestrations: this.stats.totalOrchestrations,
        successRate: (this.stats.successful / this.stats.totalOrchestrations * 100).toFixed(2) + '%',
        avgTotalLatency: this.stats.avgTotalLatency.toFixed(0) + 'ms'
      },
      agents: {
        proposer: {
          avgLatency: calculateAvg(this.stats.agentLatencies.proposer) + 'ms',
          ...proposer.getMetrics()
        },
        validator: {
          avgLatency: calculateAvg(this.stats.agentLatencies.validator) + 'ms',
          ...validator.getMetrics()
        },
        critic: {
          avgLatency: calculateAvg(this.stats.agentLatencies.critic) + 'ms',
          ...critic.getMetrics()
        },
        applier: {
          avgLatency: calculateAvg(this.stats.agentLatencies.applier) + 'ms'
        }
      }
    };
  }

  resetMetrics() {
    this.stats = {
      totalOrchestrations: 0,
      successful: 0,
      failed: 0,
      avgTotalLatency: 0,
      agentLatencies: {
        proposer: [],
        validator: [],
        critic: [],
        applier: []
      }
    };
    
    proposer.clearCache();
  }
}

module.exports = new AgentOrchestrator();