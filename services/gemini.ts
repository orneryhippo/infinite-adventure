import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ImageSize } from "../types";

// Helper to get client with current key
const getClient = () => {
  // Always create a new client to pick up the potentially selected API key
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Story Generation (Low Latency) ---
// Using gemini-2.5-flash-lite as requested for fast responses
const STORY_MODEL = "gemini-2.5-flash-lite";

const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: "The next paragraph of the story, reacting to the user's action. Vivid and immersive.",
    },
    inventory_add: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of item names to ADD to inventory.",
    },
    inventory_remove: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of item names to REMOVE from inventory.",
    },
    new_quest: {
      type: Type.STRING,
      description: "Update the quest description if it changes, or null if it remains the same.",
      nullable: true,
    },
    image_prompt: {
      type: Type.STRING,
      description: "A detailed visual description of the current scene for image generation. Focus on environment and characters.",
    },
    suggested_choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 concise options for the user's next action.",
    },
  },
  required: ["narrative", "inventory_add", "inventory_remove", "image_prompt", "suggested_choices"],
};

export async function generateStorySegment(
  history: string[], 
  userAction: string, 
  currentInventory: string[], 
  currentQuest: string
) {
  const ai = getClient();
  
  const systemPrompt = `
    You are an infinite RPG adventure engine. 
    Current Inventory: ${JSON.stringify(currentInventory)}
    Current Quest: ${currentQuest}
    
    Your goal is to advance the story based on the User Action. 
    Be creative. This is not a pre-written path.
    Maintain a consistent tone (High Fantasy or Sci-Fi depending on context).
    
    Return the response in strictly valid JSON matching the schema.
  `;

  // Provide last few turns for context
  const context = history.slice(-6).join("\n");
  const prompt = `
    Previous Story Context:
    ${context}
    
    User Action: ${userAction}
    
    Generate the next segment.
  `;

  try {
    const response = await ai.models.generateContent({
      model: STORY_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.8, // Little bit of creativity
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Story Gen Error:", error);
    // Fallback if JSON fails (rare with schema but possible on Lite)
    return {
      narrative: "The mists of uncertainty cloud your vision... (AI Generation Error, please try again).",
      inventory_add: [],
      inventory_remove: [],
      new_quest: null,
      image_prompt: "A foggy void of uncertainty.",
      suggested_choices: ["Try again"],
    };
  }
}

// --- Image Generation ---
// Using gemini-3-pro-image-preview
const IMAGE_MODEL = "gemini-3-pro-image-preview";

export async function generateSceneImage(prompt: string, size: ImageSize) {
  const ai = getClient();
  
  const enhancedPrompt = `
    Art Style: Digital fantasy painting, highly detailed, cinematic lighting, consistent character design, semi-realistic.
    Scene: ${prompt}
  `;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: {
          imageSize: size, // 1K, 2K, 4K
          aspectRatio: "16:9",
        }
      }
    });

    // Extract image
    // Note: 2.5/3 Pro Image usually returns it in parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
}

// --- Chatbot ---
// Using gemini-3-pro-preview
const CHAT_MODEL = "gemini-3-pro-preview";

export async function sendChatMessage(history: {role: string, parts: {text: string}[]}[], message: string, gameState: any) {
  const ai = getClient();
  
  const systemInstruction = `
    You are a helpful AI guide for the player of this adventure game.
    Current Game State:
    - Inventory: ${gameState.inventory.join(', ')}
    - Quest: ${gameState.currentQuest}
    
    Answer the player's questions about the world, lore, or game mechanics. 
    Keep answers concise and immersive.
  `;

  try {
    const chat = ai.chats.create({
      model: CHAT_MODEL,
      config: {
        systemInstruction,
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      })),
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "I cannot hear you clearly through the void... (Error)";
  }
}

// --- Utility to check/request Key ---
export async function checkAndRequestApiKey(): Promise<boolean> {
  // @ts-ignore - window.aistudio is injected
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        return true;
    }
    return true;
  }
  return true; // Fallback for dev env if not injected
}