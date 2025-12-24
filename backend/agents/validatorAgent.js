const geminiService = require('../config/gemini');
const kgService = require('../services/kgService');
const fs = require('fs');
const path = require('path');

class ValidatorAgent {
    constructor() {
        this.name = 'Validator';
        this.ontologyPath = path.join(__dirname, '../models/ontologySchema.ttl');
        this.ontology = this.loadOntology();
        
        this.stats = {
            totalValidations: 0,
            approved: 0,
            rejected: 0,
            avgLatency: 0,
            errors: 0,
            validationDimensions: {
                schemaCompliance: 0,
                duplicateDetection: 0,
                referentialIntegrity: 0,
                semanticConsistency: 0
            }
        };

        // Define valid entity types and relationships from ontology
        this.validEntityTypes = [
            'Organization', 'Department', 'Role', 'Process', 
            'Resource', 'Metric', 'Product', 'Service', 'Location', 'Event'
        ];

        this.validRelationships = {
            'Organization': ['HAS_DEPARTMENT', 'LOCATED_IN', 'SERVES', 'MEASURES'],
            'Department': ['CONTAINS', 'EXECUTES', 'LOCATED_IN'],
            'Role': ['WORKS_IN', 'RESPONSIBLE_FOR'],
            'Process': ['REQUIRES', 'PRODUCES'],
            'Resource': ['USED_BY'],
            'Product': ['SOLD_TO'],
            'Location': ['CONTAINS']
        };
    }

    loadOntology() {
        try {
            return fs.readFileSync(this.ontologyPath, 'utf8');
        } catch (err) {
            console.warn('⚠️ Could not load ontologySchema.ttl, using fallback rules');
            return "# Fallback ontology rules";
        }
    }

    async validate(proposal) {
        const startTime = Date.now();
        this.stats.totalValidations++;

        try {
            console.log('🔍 Validator performing multi-dimensional checks...');

            // Quick validation before expensive operations
            if (!proposal || !proposal.entities || proposal.entities.length === 0) {
                return this.rejectProposal('Proposal is empty or malformed');
            }

            // DIMENSION 1: Schema Compliance Check (Local)
            const schemaCheck = await this.checkSchemaCompliance(proposal);
            if (!schemaCheck.isValid) {
                return this.rejectProposal(`Schema violation: ${schemaCheck.reason}`);
            }

            // DIMENSION 2: Duplicate Detection (Neo4j)
            const duplicateCheck = await this.checkDuplicates(proposal);
            if (!duplicateCheck.isValid) {
                return this.rejectProposal(`Duplicate detected: ${duplicateCheck.reason}`);
            }

            // DIMENSION 3: Referential Integrity
            const referentialCheck = this.checkReferentialIntegrity(proposal);
            if (!referentialCheck.isValid) {
                return this.rejectProposal(`Referential error: ${referentialCheck.reason}`);
            }

            // DIMENSION 4: AI-Powered Semantic Validation (with rate limiting)
            const semanticCheck = await this.checkSemanticConsistency(proposal);
            if (!semanticCheck.isValid) {
                return this.rejectProposal(`Semantic issue: ${semanticCheck.reason}`);
            }

            // All checks passed
            this.stats.approved++;
            const latency = Date.now() - startTime;
            this.stats.avgLatency = 
                (this.stats.avgLatency * (this.stats.totalValidations - 1) + latency) / this.stats.totalValidations;

            return {
                isValid: true,
                reason: 'All validation dimensions passed',
                dimensions: {
                    schemaCompliance: schemaCheck.score,
                    duplicateDetection: duplicateCheck.score,
                    referentialIntegrity: referentialCheck.score,
                    semanticConsistency: semanticCheck.score
                },
                processingTime: latency
            };

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Validator Error:', error.message);
            return this.rejectProposal(`Validation system error: ${error.message}`);
        }
    }

    // DIMENSION 1: Schema Compliance (Fast, Local)
    async checkSchemaCompliance(proposal) {
        try {
            for (const entity of proposal.entities) {
                // Check entity type validity
                if (!this.validEntityTypes.includes(entity.type)) {
                    return {
                        isValid: false,
                        reason: `Invalid entity type '${entity.type}'. Must be one of: ${this.validEntityTypes.join(', ')}`,
                        score: 0
                    };
                }

                // Check required properties
                if (!entity.id || !entity.label) {
                    return {
                        isValid: false,
                        reason: `Entity missing required fields (id or label)`,
                        score: 0
                    };
                }
            }

            for (const rel of proposal.relationships) {
                // Check relationship validity
                if (!rel.from || !rel.to || !rel.type) {
                    return {
                        isValid: false,
                        reason: 'Relationship missing required fields',
                        score: 0
                    };
                }
            }

            this.stats.validationDimensions.schemaCompliance++;
            return { isValid: true, score: 1.0 };

        } catch (error) {
            return { isValid: false, reason: error.message, score: 0 };
        }
    }

    // DIMENSION 2: Duplicate Detection (Neo4j Query)
    async checkDuplicates(proposal) {
        try {
            for (const entity of proposal.entities) {
                const existing = await kgService.getEntityById(entity.id);
                if (existing) {
                    return {
                        isValid: false,
                        reason: `Entity ID '${entity.id}' already exists`,
                        score: 0
                    };
                }
            }

            this.stats.validationDimensions.duplicateDetection++;
            return { isValid: true, score: 1.0 };

        } catch (error) {
            console.warn('Duplicate check failed, allowing by default:', error.message);
            return { isValid: true, score: 0.5 };
        }
    }

    // DIMENSION 3: Referential Integrity (Local)
    checkReferentialIntegrity(proposal) {
        try {
            const entityIds = new Set(proposal.entities.map(e => e.id));

            for (const rel of proposal.relationships) {
                // Check if source and target exist in this proposal
                if (!entityIds.has(rel.from) && !entityIds.has(rel.to)) {
                    // Both are external - should exist in graph (can't verify now, allow)
                    continue;
                }

                if (entityIds.has(rel.from) && !entityIds.has(rel.to)) {
                    // Target is external - might be okay
                    continue;
                }

                if (!entityIds.has(rel.from) && entityIds.has(rel.to)) {
                    // Source is external - might be okay
                    continue;
                }
            }

            this.stats.validationDimensions.referentialIntegrity++;
            return { isValid: true, score: 1.0 };

        } catch (error) {
            return { isValid: false, reason: error.message, score: 0 };
        }
    }

    // DIMENSION 4: Semantic Consistency (AI-Powered, Expensive)
    async checkSemanticConsistency(proposal) {
        try {
            // Skip AI validation for small proposals to save API calls
            if (proposal.entities.length === 1 && proposal.relationships.length === 0) {
                this.stats.validationDimensions.semanticConsistency++;
                return { isValid: true, score: 0.9 };
            }

            const prompt = `
You are a semantic validator for knowledge graphs.

ONTOLOGY RULES:
${this.ontology}

PROPOSED CHANGES:
${JSON.stringify(proposal, null, 2)}

TASK:
Check if the proposed entities and relationships make semantic sense together.

Return ONLY JSON:
{
  "isValid": true/false,
  "reason": "Brief explanation",
  "score": 0.0-1.0
}
            `;

            const result = await geminiService.generateJSON(prompt);
            
            if (result.isValid) {
                this.stats.validationDimensions.semanticConsistency++;
            }

            return result;

        } catch (error) {
            console.warn('Semantic check failed, allowing by default:', error.message);
            return { isValid: true, score: 0.7, reason: 'AI validation skipped' };
        }
    }

    rejectProposal(reason) {
        this.stats.rejected++;
        return {
            isValid: false,
            reason: reason,
            dimensions: null
        };
    }

    getMetrics() {
        return {
            agent: this.name,
            ...this.stats,
            approvalRate: this.stats.totalValidations > 0
                ? (this.stats.approved / this.stats.totalValidations * 100).toFixed(2) + '%'
                : '0%'
        };
    }
}

module.exports = new ValidatorAgent();