// backend/services/ragService.js
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { driver } = require('../config/neo4j');
const vectorStore = require('../config/vectorStore');

class RAGService {
  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      // Use the Lite model for speed & stability
      modelName: 'gemini-2.5-flash', 
      apiKey: process.env.GEMINI_API_KEY,
      temperature: 0,
    });
  }

  async queryWithRAG(userQuery) {
    console.log(`\nProcessing Natural Language Query: "${userQuery}"`);
    
    // Step 1: Try Vector Search
    console.log('🔍 Performing vector similarity search...');
    let relevantIds = [];
    try {
        const vectorResults = await vectorStore.search(userQuery, 3);
        relevantIds = vectorResults.map(r => r.metadata.id);
    } catch (err) {
        console.warn("⚠️ Vector search failed:", err.message);
    }

    // --- UNIVERSAL KEYWORD FALLBACK ---
    if (relevantIds.length === 0) {
        console.log("⚠️ Vector search returned 0 results. Attempting Universal Keyword Search...");
        
        // Clean the query to get core keywords
        const stopWords = ['what', 'does', 'who', 'is', 'the', 'handle', 'responsible', 'for', '?', 'a', 'an'];
        const keywords = userQuery.split(' ')
            .filter(w => !stopWords.includes(w.toLowerCase()))
            .filter(w => w.length > 2); // Skip tiny words
        
        // Search for every meaningful word
        for (const word of keywords) {
            const matches = await this.findEntitiesByKeyword(word);
            relevantIds = [...relevantIds, ...matches];
        }
        // Deduplicate
        relevantIds = [...new Set(relevantIds)];
    }

    // Step 2: Get Context
    let graphContext = await this.getEnrichedContext(relevantIds);
    
    // FINAL SAFETY NET: If context is STILL empty, grab just ANY 5 relationships to show *something*
    if (graphContext.length === 0) {
        console.log("⚠️ Still no context. Fetching random relationships as last resort.");
        graphContext = await this.getGeneralContext();
    }

    // Log what we actually found
    const hintNames = graphContext.map(c => c.name).join(', ');
    console.log(`💡 Found Database Hints: [${hintNames.length > 0 ? hintNames : 'NONE'}]`);

    // Step 3: Generate Answer
    console.log('🤖 Generating answer with LangChain...');
    const prompt = `
      You are an AI assistant for a business knowledge graph.
      
      USER QUESTION: "${userQuery}"
      
      CONTEXT FROM DATABASE:
      ${JSON.stringify(graphContext, null, 2)}
      
      INSTRUCTIONS:
      - Answer the question using ONLY the provided context.
      - If the context contains the answer, state it clearly.
      - If the context is empty or irrelevant, say "I don't know based on the current data."
    `;

    const response = await this.llm.invoke(prompt);
    
    return {
      answer: response.content,
      context: graphContext,
      cypherQuery: relevantIds.length > 0 ? "Vector + Universal Keyword Search" : "Global Context Fallback",
      similarEntities: relevantIds
    };
  }

  // FIXED: Removed ':Entity' restriction. Matches ANY node.
  async findEntitiesByKeyword(keyword) {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (n) 
            WHERE toLower(n.id) CONTAINS toLower($keyword) 
               OR toLower(n.name) CONTAINS toLower($keyword)
               OR toLower(n.label) CONTAINS toLower($keyword)
            RETURN n.id as id LIMIT 5
        `, { keyword });
        return result.records.map(r => r.get('id'));
    } catch (e) {
        console.error("Keyword search error:", e.message);
        return [];
    } finally {
        await session.close();
    }
  }

  // FIXED: Removed ':Entity' restriction. Matches ANY node ID.
  async getEnrichedContext(ids) {
    if (!ids || ids.length === 0) return [];

    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (n)
        WHERE n.id IN $ids
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, collect({rel: type(r), target: m}) as rels
      `, { ids });

      return this._formatRecords(result.records);
    } catch (error) {
      console.error('Graph context error:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  // FIXED: Fetches ANY node that has a relationship (ignoring labels)
  async getGeneralContext() {
      const session = driver.session();
      try {
        const result = await session.run(`
            MATCH (n)-[r]->(m)
            RETURN n, collect({rel: type(r), target: m}) as rels
            LIMIT 10
        `);
        return this._formatRecords(result.records);
      } finally {
          await session.close();
      }
  }

  _formatRecords(records) {
      return records.map(record => {
        const node = record.get('n');
        const rels = record.get('rels');
        
        // Robust Label Finding: Try Name -> Label -> ID
        const name = node.properties.name || node.properties.label || node.properties.id;
        
        // Robust Type Finding: Get the first label that isn't 'Entity'
        const type = node.labels.find(l => l !== 'Entity') || 'Node';

        return {
          name: name,
          type: type,
          description: node.properties.description || "No description",
          relationships: rels.filter(r => r.rel).map(r => {
             const targetName = r.target.properties.name || r.target.properties.label || r.target.properties.id;
             return `${r.rel} -> ${targetName}`;
          })
        };
      });
  }
}

module.exports = new RAGService();