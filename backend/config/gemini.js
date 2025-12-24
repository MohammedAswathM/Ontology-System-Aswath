const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Rate limiting state
        this.requestQueue = [];
        this.isProcessing = false;
        this.minDelay = 1000; // 1 second between requests
        this.lastRequestTime = 0;
        
        // Retry configuration
        this.maxRetries = 3;
        this.baseDelay = 2000;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async exponentialBackoff(attempt) {
        const delay = this.baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry attempt ${attempt + 1}, waiting ${delay}ms...`);
        await this.sleep(delay);
    }

    async generateJSON(prompt, retryCount = 0) {
        try {
            // Enforce rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.minDelay) {
                await this.sleep(this.minDelay - timeSinceLastRequest);
            }
            
            this.lastRequestTime = Date.now();

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Clean and parse
            const cleanText = text
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();
            
            return JSON.parse(cleanText);

        } catch (error) {
            // Handle rate limiting with exponential backoff
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                if (retryCount < this.maxRetries) {
                    console.warn(`⚠️ Rate limited, retrying... (${retryCount + 1}/${this.maxRetries})`);
                    await this.exponentialBackoff(retryCount);
                    return this.generateJSON(prompt, retryCount + 1);
                }
                throw new Error('Rate limit exceeded after max retries');
            }
            
            // Handle parsing errors
            if (error instanceof SyntaxError) {
                console.error('JSON Parse Error:', error.message);
                throw new Error(`Failed to parse AI response: ${error.message}`);
            }
            
            throw error;
        }
    }

    async generateText(prompt, retryCount = 0) {
        try {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.minDelay) {
                await this.sleep(this.minDelay - timeSinceLastRequest);
            }
            
            this.lastRequestTime = Date.now();

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();

        } catch (error) {
            if (error.message?.includes('429') && retryCount < this.maxRetries) {
                await this.exponentialBackoff(retryCount);
                return this.generateText(prompt, retryCount + 1);
            }
            throw error;
        }
    }
}

module.exports = new GeminiService();