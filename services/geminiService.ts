
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

const handleApiError = (error: any) => {
  console.error("Gemini API Error Detail:", error);
  const errorText = error?.message || "";
  if (errorText.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorText.includes("blocked") && errorText.includes("referer")) {
    throw new Error("API_KEY_REFERRER_BLOCKED");
  }
  if (error?.status === "PERMISSION_DENIED" || errorText.includes("403") || errorText.includes("key") || errorText.includes("invalid")) {
    throw new Error("API_KEY_INVALID");
  }
  throw error;
};

export const getDailyEcoTip = async (): Promise<{ title: string, content: string }> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne-moi un conseil court et percutant sur le tri ou l'écologie en France. Format JSON: { \"title\": \"...\", \"content\": \"...\" }",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "content"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { title: "Le tri, c'est la vie", content: "Chaque geste compte pour protéger notre planète." };
  }
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getClient();
    const isImage = typeof input !== 'string';
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Analyse ce déchet pour le tri en France (normes 2025). Calcule aussi son impact écologique." }]
      : [{ text: `Consigne de tri officielle France 2025 pour : "${input}".` }];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `Tu es EcoTri, expert français du tri sélectif. Réponds en JSON uniquement.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            bin: { type: Type.STRING, enum: Object.values(BinType) },
            explanation: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            isRecyclable: { type: Type.BOOLEAN },
            impact: {
              type: Type.OBJECT,
              properties: {
                co2Saved: { type: Type.NUMBER },
                waterSaved: { type: Type.NUMBER },
                energySaved: { type: Type.STRING }
              },
              required: ["co2Saved", "waterSaved", "energySaved"]
            },
            suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["itemName", "bin", "explanation", "tips", "isRecyclable", "impact", "suggestedQuestions"]
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error: any) {
    handleApiError(error);
    return null;
  }
};

export const startEcoChat = (result: SortingResult): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es l'EcoCoach d'EcoTri. L'utilisateur vient d'analyser ${result.itemName}. Réponds de manière experte et courte.`,
    },
  });
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Points de collecte pour "${itemName}" (${binType}) autour de lat:${lat}, lng:${lng}.`,
      config: { tools: [{ googleMaps: {} }], toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return chunks.filter((c: any) => c.maps).map((c: any) => ({
      name: c.maps.title || "Point de collecte",
      uri: c.maps.uri,
      lat: parseFloat(c.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)?.[1] || "0"),
      lng: parseFloat(c.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)?.[2] || "0")
    })).filter((p: any) => p.uri);
  } catch (e) {
    return [];
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist 3D isometric icon of ${itemName} for recycling app, white background.` }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { return null; }
};
