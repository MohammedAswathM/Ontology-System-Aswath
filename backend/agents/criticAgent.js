const geminiService = require('../config/gemini');

class CriticAgent {
    constructor() {
        this.name = 'Critic';
        this.stats = {
            totalCritiques: 0,
            avgQualityScore: 0,
            avgLatency: 0,
            errors: 0,
            dimensionScores: {
                completeness: [],
                specificity: [],
                utility: [],
                structure: []
            }
        };
    }

    async critique(proposal, graphContext = []) {
        const startTime = Date.now();
        this.stats.totalCritiques++;

        try {
            console.log('🎯 Critic Agent evaluating proposal quality...');

            const prompt = `
You are an expert Knowledge Graph Quality Evaluator.

EVALUATION FRAMEWORK (Score each 1-10):
1. **Completeness**: Are all necessary entities and relationships captured?
2. **Specificity**: Are entities detailed enough with proper properties?
3. **Utility**: Will this data enable useful business queries?
4. **Structure**: Is the graph well-organized and navigable?

CURRENT GRAPH (for context):
${JSON.stringify(graphContext.slice(0, 10), null, 2)}

PROPOSED CHANGES:
${JSON.stringify(proposal, null, 2)}

Return ONLY JSON:
{
  "overallScore": 7.5,
  "dimensions": {
    "completeness": 8,
    "specificity": 7,
    "utility": 8,
    "structure": 7
  },
  "strengths": ["Clear entity definitions", "Proper relationship types"],
  "improvements": ["Add more properties to entities", "Consider temporal information"],
  "missingElements": ["No metrics defined", "Location not specified"],
  "recommendations": [
    "Add Metric entities to track KPIs",
    "Include Location for spatial context"
  ],
  "riskAssessment": {
    "dataQuality": "high|medium|low",
    "integrationComplexity": "simple|moderate|complex"
  }
}
            `;

            const critique = await geminiService.generateJSON(prompt);

            // Update statistics
            const latency = Date.now() - startTime;
            this.stats.avgLatency = 
                (this.stats.avgLatency * (this.stats.totalCritiques - 1) + latency) / this.stats.totalCritiques;

            this.stats.avgQualityScore = 
                (this.stats.avgQualityScore * (this.stats.totalCritiques - 1) + critique.overallScore) / this.stats.totalCritiques;

            // Track dimension scores
            Object.keys(critique.dimensions).forEach(dim => {
                if (this.stats.dimensionScores[dim]) {
                    this.stats.dimensionScores[dim].push(critique.dimensions[dim]);
                }
            });

            console.log(`   📊 Quality Score: ${critique.overallScore}/10`);

            return {
                agent: this.name,
                success: true,
                critique,
                processingTime: latency,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Critic Agent Error:', error.message);
            
            // Return fallback critique
            return {
                agent: this.name,
                success: false,
                critique: {
                    overallScore: 5,
                    dimensions: {
                        completeness: 5,
                        specificity: 5,
                        utility: 5,
                        structure: 5
                    },
                    strengths: [],
                    improvements: ['Critique failed - manual review recommended'],
                    missingElements: [],
                    recommendations: [],
                    error: error.message
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    getMetrics() {
        const dimensionAverages = {};
        Object.keys(this.stats.dimensionScores).forEach(dim => {
            const scores = this.stats.dimensionScores[dim];
            dimensionAverages[dim] = scores.length > 0
                ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
                : 0;
        });

        return {
            agent: this.name,
            totalCritiques: this.stats.totalCritiques,
            avgQualityScore: this.stats.avgQualityScore.toFixed(2),
            avgLatency: this.stats.avgLatency.toFixed(0) + 'ms',
            errors: this.stats.errors,
            dimensionAverages
        };
    }
}

module.exports = new CriticAgent();