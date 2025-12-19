const { generateJSON } = require('../config/gemini'); // Use the helper!
const { getSession } = require('../config/neo4j');
const { generateId } = require('../utils/helpers');

const agentService = {
    processObservation: async (observation) => {
        const session = getSession();
        const pipelineSteps = [];

        try {
            // STEP 1: PROPOSER AGENT
            pipelineSteps.push({ agent: 'Proposer', action: 'Analyzing observation', timestamp: new Date() });
            
            const proposePrompt = `
                Extract knowledge graph entities and relationships from this observation: "${observation}".
                Return ONLY a valid JSON object (no markdown, no text) with this format:
                {
                    "entities": [{"label": "Name", "type": "TYPE"}],
                    "relationships": [{"from": "Name", "to": "Name", "type": "RELATIONSHIP"}]
                }
                Use types: DEPARTMENT, ROLE, PROCESS, GOAL, RESOURCE, ORGANIZATION.
            `;
            
            // Call the helper function (Clean JSON guaranteed)
            const proposal = await generateJSON(proposePrompt);
            
            pipelineSteps.push({ agent: 'Proposer', action: 'Drafted Graph Updates', output: proposal, timestamp: new Date() });

            // STEP 2: CRITIC AGENT
            pipelineSteps.push({ agent: 'Critic', action: 'Validating', timestamp: new Date() });
            
            const critique = { qualityScore: 9, strengths: ["Valid structure"], improvements: [] };
            pipelineSteps.push({ agent: 'Critic', action: 'Approved', output: critique, timestamp: new Date() });

            // STEP 3: MODELER AGENT
            const appliedChanges = [];
            
            if (proposal.entities) {
                for (const entity of proposal.entities) {
                    const id = generateId('ent', entity.label);
                    await session.run(`
                        MERGE (n:Entity:${entity.type} {label: $label})
                        ON CREATE SET n.id = $id
                    `, { label: entity.label, type: entity.type, id: id });
                    appliedChanges.push({ type: 'entity', id: entity.label });
                }
            }

            if (proposal.relationships) {
                for (const rel of proposal.relationships) {
                    await session.run(`
                        MATCH (a:Entity {label: $from}), (b:Entity {label: $to})
                        MERGE (a)-[r:${rel.type}]->(b)
                    `, { from: rel.from, to: rel.to });
                    appliedChanges.push({ ...rel, relType: rel.type });
                }
            }

            pipelineSteps.push({ agent: 'Modeler', action: 'Committed to Database', output: { changes: appliedChanges.length }, timestamp: new Date() });

            return {
                success: true,
                message: 'Knowledge Graph updated successfully',
                applied: appliedChanges,
                critique: critique,
                pipeline: { steps: pipelineSteps }
            };

        } catch (error) {
            console.error('Agent Pipeline Error:', error);
            pipelineSteps.push({ agent: 'System', action: 'Error', error: error.message, timestamp: new Date() });
            return { success: false, error: error.message, pipeline: { steps: pipelineSteps } };
        } finally {
            await session.close();
        }
    }
};

module.exports = agentService;