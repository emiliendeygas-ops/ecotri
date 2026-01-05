import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

// Helper to get the AI client with the latest API key from the environment
// This ensures that we pick up the key selected via the ApiKeyGuard if it changes
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_INVALID");
  return new GoogleGenAI({ apiKey });
};

// Analyze waste using Gemini 3 Flash for text/image identification
export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  try {
    const ai = getAiClient();
    const parts = typeof input === 'string' 
      ? [{ text: input }] 
      : [{ inlineData: input }, { text: isBarcode ? "Identifie ce produit via son code-barres et donne les consignes de tri." : "Identifie ce déchet." }];
    
    // Using gemini-3-flash-preview for general text/image tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Tu es EcoTri, expert en tri sélectif en France (normes 2025). Réponds exclusivement en JSON selon le schéma fourni.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING, description: "Nom de l'objet identifié" },
            bin: { type: Type.STRING, enum: Object.values(BinType), description: "Type de bac de tri" },
            explanation: { type: Type.STRING, description: "Explication de la consigne de tri" },
            tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Conseils de tri" },
            isRecyclable: { type: Type.BOOLEAN, description: "Si l'objet est recyclable ou non" },
            zeroWasteAlternative: { type: Type.STRING, description: "Alternative zéro déchet si disponible" }
          },
          required: ["itemName", "bin", "explanation", "tips", "isRecyclable"]
        }
      }
    });

    // Extract generated text from the response using the .text property
    const jsonStr = response.text;
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as SortingResult;
  } catch (e: any) { 
    console.error("Gemini analysis error:", e); 
    // Handle potential API key issues (e.g. key from a non-paid project)
    if (e.message?.includes("entity was not found") || e.message === "API_KEY_INVALID") {
      throw new Error("API_KEY_INVALID");
    }
    return null; 
  }
};

// Find nearby collection points using Gemini 2.5 Flash and Google Maps tool
export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAiClient();
    // Maps grounding requires a Gemini 2.5 series model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Lieux de collecte pour ${binType} près de lat:${lat}, lng:${lng}.`,
      config: { 
        tools: [{ googleMaps: {} }], 
        toolConfig: { 
          retrievalConfig: { 
            latLng: { latitude: lat, longitude: lng } 
          } 
        } 
      }
    });
    
    // Extract location info from grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return chunks
      .filter((c: any) => c.maps)
      .map((c: any) => ({
        name: c.maps.title || "Point de collecte",
        uri: c.maps.uri,
        lat: parseFloat(c.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)?.[1] || "0"),
        lng: parseFloat(c.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)?.[2] || "0")
      }))
      .filter((p: any) => p.lat !== 0);
  } catch (e) { 
    console.error("Gemini Maps error:", e);
    return []; 
  }
};

// Generate an icon image for the identified waste using Gemini 2.5 Flash Image
export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A clear 3D render icon of ${itemName} for a waste sorting app, white background.` }] }
    });

    // Iterate through response parts to find the generated image
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    console.error("Gemini Image error:", e);
    return null; 
  }
};
