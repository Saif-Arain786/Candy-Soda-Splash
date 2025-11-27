import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: process.env.API_KEY is injected by the environment
// We use a fallback for initialization to prevent immediate crashes if the env var is missing,
// though actual calls will fail gracefully.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateLevelLore = async (level: number): Promise<string> => {
  // Return default immediately if no key is configured to avoid unnecessary API calls/errors
  if (!process.env.API_KEY) {
    return `Welcome to the delicious Level ${level}!`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, whimsical, one-sentence description for Level ${level} of a candy match-3 game called "Candy Soda Splash". 
      It should sound magical or delicious. Max 15 words.`,
    });
    return response.text || `Welcome to the delicious Level ${level}!`;
  } catch (error) {
    // Silently handle errors to ensure smooth gameplay
    return `Sweet challenges await in Level ${level}!`;
  }
};

export const getLevelTips = async (level: number, moves: number): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Match 4 candies to create a blast!";
  }

   try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Give me a super short, encouraging tip for a player starting level ${level} with ${moves} moves in a match-3 game. Max 10 words.`,
    });
    return response.text || "Match 4 candies to create a blast!";
  } catch (error) {
    return "Look for patterns and match 3!";
  }
}