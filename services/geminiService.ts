import { GoogleGenAI, Type, Schema } from "@google/genai";
import { EcosystemConfig } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the schema for the ecosystem generation
const ecosystemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Creative name for the ecosystem epoch" },
    description: { type: Type.STRING, description: "Short lore about this evolutionary stage" },
    species: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          color: { type: Type.STRING, description: "Hex color code" },
          description: { type: Type.STRING },
          maxSpeed: { type: Type.NUMBER, description: "Float between 1.0 and 3.5" },
          sizeRange: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Array of 2 numbers [min, max] e.g. [3, 6] or [5, 9]"
          },
          sensorRadius: { type: Type.NUMBER, description: "Detection radius 60-150" },
          behavior: {
            type: Type.STRING,
            enum: ["AGGRESSIVE", "PASSIVE", "SWARM", "CHAOTIC"]
          },
          aggression: { type: Type.NUMBER, description: "0.0 to 1.0" },
          attraction: { type: Type.NUMBER, description: "-1.0 (repel) to 1.0 (attract)" },
        },
        required: ["id", "name", "color", "description", "maxSpeed", "sizeRange", "sensorRadius", "behavior", "aggression", "attraction"]
      }
    }
  },
  required: ["name", "description", "species"]
};

export const generateNextEvolution = async (currentEraName: string): Promise<EcosystemConfig> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      The current ecosystem era is "${currentEraName}".
      Generate the NEXT evolutionary stage with 3 distinct species.
      
      CRITICAL BALANCE RULES:
      1. Create a 'Rock Paper Scissors' dynamic where no single species is perfect.
      2. Predators should be faster but rare or have smaller sensor radius.
      3. Prey should be slower but have high 'attraction' (flocking) for safety.
      4. Speeds must be between 1.0 and 3.5.
      5. Sizes must be between 3 and 12.
      
      Visuals: Vibrant, neon, sci-fi biological colors.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ecosystemSchema,
        systemInstruction: "You are an advanced xenobiology simulation engine. Your goal is to design balanced, interesting, and visually distinct artificial life forms for a particle simulation.",
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from AI");
    }
    
    const data = JSON.parse(text) as EcosystemConfig;
    // Ensure we have IDs if the model missed them (schema should enforce, but safety first)
    data.species = data.species.map((s, idx) => ({
        ...s,
        id: s.id || `gen_${Date.now()}_${idx}`
    }));

    return data;

  } catch (error) {
    console.error("Evolution failed:", error);
    throw error;
  }
};