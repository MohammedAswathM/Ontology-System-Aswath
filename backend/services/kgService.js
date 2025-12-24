const { driver } = require('../config/neo4j');
const neo4j = require('neo4j-driver');

class KnowledgeGraphService {

  // 1. Initialize Base
  async initializeBaseOntology() {
    const session = driver.session();
    try {
      console.log('Initializing base ontology...');
      await session.run('CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE');
      return { success: true };
    } catch (error) {
      console.error('Ontology Init Error:', error.message);
      return { success: false };
    } finally {
      await session.close();
    }
  }

  // 2. Create Entity
  async createEntity(entity) {
    const session = driver.session();
    try {
      const safeType = entity.type ? entity.type.replace(/[^a-zA-Z0-9]/g, '') : 'Unknown';
      const query = `
        MERGE (e:Entity {id: $id})
        SET e:${safeType}, 
            e.name = $name, 
            e.label = $name,
            e.description = $desc,
            e.type = $type,
            e.lastUpdated = datetime()
        RETURN e
      `;
      await session.run(query, { 
        id: entity.id, 
        name: entity.label, 
        desc: entity.properties?.description || "No description",
        type: entity.type
      });
      return { success: true, id: entity.id };
    } catch (error) {
      console.error(`DB Error (Create Entity ${entity.id}):`, error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  // 3. Create Relationship
  async createRelationship(rel) {
    const session = driver.session();
    try {
      const safeType = rel.type.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      const query = `
        MATCH (a:Entity {id: $from})
        MATCH (b:Entity {id: $to})
        MERGE (a)-[r:${safeType}]->(b)
        SET r.confidence = $confidence
        RETURN r
      `;
      await session.run(query, { 
        from: rel.from, 
        to: rel.to,
        confidence: rel.properties?.confidence || 1.0 
      });
      return { success: true };
    } catch (error) {
      console.error(`DB Error (Create Rel):`, error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  // 4. Get Stats (The Dashboard Feeder)
  async getGraphStats() {
    const session = driver.session();
    try {
      // Independent subqueries to prevent "Zero Results" bug
      const query = `
        CALL { MATCH (n:Entity) RETURN count(n) as totalNodes }
        CALL { OPTIONAL MATCH ()-[r]->() RETURN count(r) as totalRels }
        CALL { MATCH (n:Entity) UNWIND labels(n) as l WITH l WHERE l <> 'Entity' RETURN collect(distinct l) as labels }
        RETURN totalNodes, totalRels, labels
      `;
      
      const result = await session.run(query);
      if (result.records.length === 0) return { totalNodes: 0, totalRelationships: 0, nodesByType: [] };

      const record = result.records[0];
      return {
        totalNodes: record.get('totalNodes') ? record.get('totalNodes').toNumber() : 0,
        totalRelationships: record.get('totalRels') ? record.get('totalRels').toNumber() : 0,
        nodesByType: record.get('labels') || []
      };
    } catch (error) {
      console.error('Stats Error:', error.message);
      return { totalNodes: 0, totalRelationships: 0, nodesByType: [] };
    } finally {
      await session.close();
    }
  }

  // 5. Get Context (For Agents)
  async getGraphContext(limit = 10) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (n:Entity)
        OPTIONAL MATCH (n)-[r]->(m:Entity)
        RETURN n, collect({rel: type(r), target: m}) as rels
        LIMIT $limit
      `, { limit: neo4j.int(limit) });

      return result.records.map(r => ({
          id: r.get('n').properties.id,
          label: r.get('n').properties.name,
          type: r.get('n').labels.find(l => l !== 'Entity')
      }));
    } catch (error) {
      return [];
    } finally {
      await session.close();
    }
  }

  // 6. Get Visualization Data (The List Feeder - RESTORED)
  async getVisualizationData() {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (n:Entity)
        OPTIONAL MATCH (n)-[r]->(m:Entity)
        RETURN n, collect({type: type(r), target: m}) as rels
        LIMIT 100
      `);

      const nodes = [];
      const edges = [];
      const seenIds = new Set();

      result.records.forEach(record => {
        const node = record.get('n');
        const id = node.properties.id;
        // Prioritize Name over ID for display
        const displayLabel = node.properties.name || node.properties.label || id;

        if (!seenIds.has(id)) {
            nodes.push({
                id: id,
                label: displayLabel,
                type: node.labels.find(l => l !== 'Entity') || 'Unknown',
                properties: node.properties
            });
            seenIds.add(id);
        }

        const rels = record.get('rels');
        rels.forEach(r => {
            if (r.type && r.target) {
                edges.push({
                    from: id,
                    to: r.target.properties.id,
                    label: r.type
                });
            }
        });
      });

      return { nodes, edges };
    } catch (error) {
      console.error('Vis Data Error:', error);
      return { nodes: [], edges: [] };
    } finally {
      await session.close();
    }
  }
}

module.exports = new KnowledgeGraphService();