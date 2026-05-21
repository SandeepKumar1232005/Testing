const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyzeQA(testResults, targetUrl) {
    if (!process.env.GEMINI_API_KEY) {
        return { error: 'Gemini API Key missing' };
    }

    const prompt = `
    You are an expert QA Automation Engineer and Web Development AI. Analyze the following Playwright test report for a student's website.
    
    Target URL: ${targetUrl}
    Test Results: ${JSON.stringify(testResults, null, 2)}
    
    Provide the following in pure JSON format (NO markdown formatting, just the raw JSON object):
    {
      "websiteType": "Guess the type of website based on the URL or common patterns (e.g., 'Portfolio', 'E-commerce', 'Blog')",
      "overallFeedback": "A 2-3 sentence encouraging, high-level feedback to the student about their website quality.",
      "criticalFixes": ["list of strings containing actionable advice to fix the specific failed tests, focusing on code fixes if possible"],
      "missingFeatures": ["list of strings suggesting 1 or 2 features that are missing from a typical website of this type"]
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const rawText = response.text;
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { error: 'Failed to parse AI response' };

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return { error: error.message };
    }
}

module.exports = { analyzeQA };
