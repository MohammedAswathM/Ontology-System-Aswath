const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use 'gemini-1.5-flash' or 'gemini-pro'. 
// 'gemini-2.5-flash' likely does not exist yet and will cause 404s.
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper to clean and parse JSON from AI response (Prevents agent crashes)
async function generateJSON(prompt) {
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Remove markdown backticks if present
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Gemini JSON Error:", error);
        throw new Error(`AI Generation Failed: ${error.message}`);
    }
}

// EXPORT BOTH
module.exports = {
    model,
    generateJSON
};