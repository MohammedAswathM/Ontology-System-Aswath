const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { Neo4jGraph } = require('@langchain/community/graphs/neo4j_graph');
const { GraphCypherQAChain } = require('@langchain/community/chains/graph_qa/cypher');
const { PromptTemplate } = require('@langchain/core/prompts');
require('dotenv').config();

// 1. Initialize Gemini with the Lite model for speed & higher limits
const llm = new ChatGoogleGenerativeAI({
  modelName: 'gemini-2.5-flash', // Exact model name from your list
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0, // Keep it logical (0 is best for code/Cypher generation)
});

let graph = null;

// 2. Initialize Neo4j Connection
async function initializeGraph() {
  try {
    graph = await Neo4jGraph.initialize({
      url: process.env.NEO4J_URI,
      username: process.env.NEO4J_USER,
      password: process.env.NEO4J_PASSWORD,
    });
    console.log('✓ LangChain Neo4j Graph initialized');
    return graph;
  } catch (error) {
    console.error('LangChain Graph initialization error:', error);
    return null; 
  }
}

// 3. Define a Robust Prompt for Cypher Generation
const CYPHER_GENERATION_TEMPLATE = `
You are an expert Neo4j Cypher translator.
Your goal is to translate a user's question into a Cypher query.

Schema:
{schema}

Instructions:
1. The user input might contain "Database Hints" (names of entities actually found in the DB).
2. **CRITICAL:** If hints are provided, you MUST use the exact property values from the hints in your WHERE clauses.
   - Example Input: "What does Security do? (Hints: 'IT Security')"
   - Correct Query: MATCH (n) WHERE n.name = 'IT Security' ...
   - Incorrect Query: MATCH (n) WHERE n.name = 'Security' ...
3. Use case-insensitive matching if unsure: \`WHERE toLower(n.name) CONTAINS toLower('search_term')\`
4. Return ONLY the Cypher query. No markdown, no json.

Question:
{question}
`;

const cypherPrompt = new PromptTemplate({
  template: CYPHER_GENERATION_TEMPLATE,
  inputVariables: ["schema", "question"],
});

// 4. Create the Chain
async function createCypherChain() {
  if (!graph) await initializeGraph();
  if (!graph) return null;

  return GraphCypherQAChain.fromLLM({
    llm,
    graph,
    cypherPrompt: cypherPrompt,
    returnIntermediateSteps: true,
    verbose: true,
  });
}

module.exports = {
  llm,
  initializeGraph,
  createCypherChain,
  getGraph: () => graph
};