// Cypher queries to initialize the database constraints and base data
const INIT_QUERIES = [
    // 1. Create Constraints (Optimization)
    "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
    
    // 2. Clear old data (Optional - be careful in production!)
    // "MATCH (n) DETACH DELETE n", 

    // 3. Create Base Data
    `MERGE (org:Entity:Organization {id: 'org_demo'})
     ON CREATE SET org.name = 'Demo Corporation', org.description = 'A sample enterprise'`,

    `MERGE (dept_eng:Entity:Department {id: 'dept_eng'})
     ON CREATE SET dept_eng.name = 'Engineering', dept_eng.function = 'Product Development'`,

    `MERGE (dept_sales:Entity:Department {id: 'dept_sales'})
     ON CREATE SET dept_sales.name = 'Sales', dept_sales.function = 'Revenue Generation'`,

    `MATCH (org:Entity {id: 'org_demo'}), (dept:Entity {id: 'dept_eng'})
     MERGE (org)-[:HAS_DEPARTMENT]->(dept)`,

    `MATCH (org:Entity {id: 'org_demo'}), (dept:Entity {id: 'dept_sales'})
     MERGE (org)-[:HAS_DEPARTMENT]->(dept)`
];

module.exports = { INIT_QUERIES };