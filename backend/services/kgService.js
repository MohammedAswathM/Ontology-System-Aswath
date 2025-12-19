const { getSession } = require('../config/neo4j');
// Removed generateId import if not used, or keep if you use it elsewhere
const { generateId } = require('../utils/helpers');

const kgService = {
    // 1. Initialize the Base Upper Ontology
    initializeBaseOntology: async () => {
        const session = getSession();
        try {
            const check = await session.run('MATCH (n) RETURN count(n) as count');
            if (check.records[0].get('count').toNumber() > 0) {
                return { message: 'Graph already contains data. Skipping initialization.' };
            }

            const cypher = `
                CREATE 
                (org:Entity:Organization {id: 'org_demo', label: 'Demo Corporation', type: 'ORGANIZATION'}),
                (dept1:Entity:Department {id: 'dept_eng', label: 'Engineering', type: 'DEPARTMENT'}),
                (dept2:Entity:Department {id: 'dept_sales', label: 'Sales', type: 'DEPARTMENT'}),
                (role1:Entity:Role {id: 'role_dev', label: 'role_dev', type: 'ROLE'}),
                (role2:Entity:Role {id: 'role_manager', label: 'role_manager', type: 'ROLE'}),
                (proc1:Entity:Process {id: 'proc_dev', label: 'Software Development', type: 'PROCESS'}),
                (proc2:Entity:Process {id: 'proc_sales', label: 'Sales Pipeline', type: 'PROCESS'}),
                
                (org)-[:HAS_DEPARTMENT]->(dept1),
                (org)-[:HAS_DEPARTMENT]->(dept2),
                (dept1)-[:HAS_ROLE]->(role1),
                (dept1)-[:EXECUTES]->(proc1),
                (role2)-[:RESPONSIBLE_FOR]->(proc1)
            `;
            
            await session.run(cypher);
            return { message: 'Base ontology initialized successfully' };
        } catch (error) {
            console.error('KG Init Error:', error);
            throw error;
        } finally {
            await session.close();
        }
    },

    // 2. Fetch Stats for Dashboard
    getGraphStats: async () => {
        const session = getSession();
        try {
            const nodeCount = await session.run('MATCH (n) RETURN count(n) as count');
            const relCount = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
            const types = await session.run('MATCH (n) RETURN distinct labels(n) as labels');
            
            const distinctTypes = types.records
                .map(r => r.get('labels').filter(l => l !== 'Entity')[0])
                .filter(Boolean);

            return {
                totalNodes: nodeCount.records[0].get('count').toNumber(),
                totalRelationships: relCount.records[0].get('count').toNumber(),
                nodesByType: [...new Set(distinctTypes)]
            };
        } finally {
            await session.close();
        }
    },

    // 3. Fetch Data for Visualization
    getVisualizationData: async () => {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (n)-[r]->(m) 
                RETURN n, r, m 
                LIMIT 50
            `);
            
            const nodes = new Map();
            const edges = [];

            result.records.forEach(record => {
                const n = record.get('n');
                const m = record.get('m');
                const r = record.get('r');

                const getType = (node) => node.labels.find(l => l !== 'Entity') || 'Unknown';

                if (!nodes.has(n.elementId)) {
                    nodes.set(n.elementId, { 
                        id: n.elementId, 
                        label: n.properties.label || n.properties.id, 
                        type: getType(n) 
                    });
                }
                if (!nodes.has(m.elementId)) {
                    nodes.set(m.elementId, { 
                        id: m.elementId, 
                        label: m.properties.label || m.properties.id, 
                        type: getType(m) 
                    });
                }

                edges.push({
                    from: n.properties.label || 'Unknown',
                    to: m.properties.label || 'Unknown',
                    label: r.type
                });
            });

            return {
                nodes: Array.from(nodes.values()),
                edges: edges
            };
        } finally {
            await session.close();
        }
    },

    // 4. THIS WAS MISSING: Get Graph Context for RAG
    getGraphContext: async () => {
        const session = getSession();
        try {
            // Retrieve a text summary of the graph (Triples)
            // e.g. "Engineering - EXECUTES -> Software Development"
            const result = await session.run(`
                MATCH (a)-[r]->(b)
                RETURN a.label + ' ' + type(r) + ' ' + b.label AS triple
                LIMIT 100
            `);
            
            const context = result.records.map(r => r.get('triple')).join('\n');
            return context;
        } catch (error) {
            console.error('Get Context Error:', error);
            return ""; // Return empty string on error so app doesn't crash
        } finally {
            await session.close();
        }
    }
};

module.exports = kgService;