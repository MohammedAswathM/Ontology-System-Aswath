// Base Business Ontology Structure
// This represents a universal business model that can adapt to any industry

const BASE_ONTOLOGY = {
  entities: [
    {
      type: 'Organization',
      properties: ['name', 'industry', 'size', 'founded'],
      description: 'Top-level business entity'
    },
    {
      type: 'Department',
      properties: ['name', 'function', 'headcount'],
      description: 'Organizational unit within a company'
    },
    {
      type: 'Role',
      properties: ['title', 'level', 'responsibilities'],
      description: 'Job position or function'
    },
    {
      type: 'Process',
      properties: ['name', 'duration', 'frequency', 'description'],
      description: 'Business workflow or procedure'
    },
    {
      type: 'Resource',
      properties: ['name', 'type', 'cost', 'availability'],
      description: 'Assets used in business operations'
    },
    {
      type: 'Product',
      properties: ['name', 'category', 'price', 'description'],
      description: 'Goods or services offered'
    },
    {
      type: 'Customer',
      properties: ['name', 'segment', 'value', 'since'],
      description: 'Buyers of products or services'
    },
    {
      type: 'Metric',
      properties: ['name', 'value', 'unit', 'target'],
      description: 'Key performance indicators'
    }
  ],
  
  relationships: [
    { from: 'Organization', to: 'Department', type: 'HAS_DEPARTMENT' },
    { from: 'Department', to: 'Role', type: 'HAS_ROLE' },
    { from: 'Department', to: 'Process', type: 'EXECUTES' },
    { from: 'Process', to: 'Resource', type: 'REQUIRES' },
    { from: 'Process', to: 'Product', type: 'PRODUCES' },
    { from: 'Role', to: 'Process', type: 'RESPONSIBLE_FOR' },
    { from: 'Organization', to: 'Customer', type: 'SERVES' },
    { from: 'Organization', to: 'Metric', type: 'MEASURES' },
    { from: 'Product', to: 'Customer', type: 'SOLD_TO' }
  ]
};

// Cypher queries to initialize the base ontology
const INIT_QUERIES = [
  // Create constraints for unique IDs
  `CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE`,
  
  // Create example organization
  `MERGE (org:Entity:Organization {id: 'org_demo', name: 'Demo Corporation', industry: 'Technology', size: 'Medium'})`,
  
  // Create example departments
  `MERGE (dept1:Entity:Department {id: 'dept_eng', name: 'Engineering', function: 'Product Development'})`,
  `MERGE (dept2:Entity:Department {id: 'dept_sales', name: 'Sales', function: 'Revenue Generation'})`,
  
  // Create example roles
  `MERGE (role1:Entity:Role {id: 'role_dev', title: 'Software Developer', level: 'Individual Contributor'})`,
  `MERGE (role2:Entity:Role {id: 'role_manager', title: 'Engineering Manager', level: 'Management'})`,
  
  // Create example processes
  `MERGE (proc1:Entity:Process {id: 'proc_dev', name: 'Software Development', duration: '2 weeks', frequency: 'Continuous'})`,
  `MERGE (proc2:Entity:Process {id: 'proc_sales', name: 'Sales Pipeline', duration: '30 days', frequency: 'Ongoing'})`,
  
  // Create relationships
  `MATCH (org:Organization {id: 'org_demo'}), (dept:Department {id: 'dept_eng'})
   MERGE (org)-[:HAS_DEPARTMENT]->(dept)`,
  
  `MATCH (org:Organization {id: 'org_demo'}), (dept:Department {id: 'dept_sales'})
   MERGE (org)-[:HAS_DEPARTMENT]->(dept)`,
  
  `MATCH (dept:Department {id: 'dept_eng'}), (role:Role {id: 'role_dev'})
   MERGE (dept)-[:HAS_ROLE]->(role)`,
  
  `MATCH (dept:Department {id: 'dept_eng'}), (proc:Process {id: 'proc_dev'})
   MERGE (dept)-[:EXECUTES]->(proc)`,
  
  `MATCH (role:Role {id: 'role_manager'}), (proc:Process {id: 'proc_dev'})
   MERGE (role)-[:RESPONSIBLE_FOR]->(proc)`
];

module.exports = {
  BASE_ONTOLOGY,
  INIT_QUERIES
};