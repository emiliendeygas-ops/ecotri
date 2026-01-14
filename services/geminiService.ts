
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey: apiKey });
};

// Analyse ultra-rapide focalisée sur la consigne de tri
export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getClient();
    const isImage = typeof input !== 'string';
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Analyse rapide tri France 2025. Réponds en JSON." }]
      : [{ text: `Consigne tri 2025 pour : "${input}". Réponds en JSON.` }];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `Tu es EcoTri. Réponds en JSON avec itemName, bin (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT), explanation (max 150 car.), isRecyclable (boolean), et impact (co2Saved en g, waterSaved en L, energySaved en texte court).`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            bin: { type: Type.STRING, enum: Object.values(BinType) },
            explanation: { type: Type.STRING },
            isRecyclable: { type: Type.BOOLEAN },
            impact: {
              type: Type.OBJECT,
              properties: {
                co2Saved: { type: Type.NUMBER },
                waterSaved: { type: Type.NUMBER },
                energySaved: { type: Type.STRING }
              },
              required: ["co2Saved", "waterSaved", "energySaved"]
            }
          },
          required: ["itemName", "bin", "explanation", "isRecyclable", "impact"]
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error: any) {
    console.error("Analysis error:", error);
    return null;
  }
};

export const getDailyEcoTip = async (): Promise<{ title: string, content: string }> => {
  try {
    const ai = getClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne un conseil de tri court. JSON: { \"title\": \"...\", \"content\": \"...\" }",
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { title: "Le tri, c'est la vie", content: "Chaque geste compte pour protéger notre planète." };
  }
};

export const startEcoChat = (result: SortingResult): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es l'EcoCoach. Réponds brièvement sur ${result.itemName}.`,
    },
  });
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  const ai = getClient();
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `3 points de collecte pour ${itemName} (${binType}) à lat:${lat}, lng:${lng}. JSON list avec name, lat, lng.`,
      config: { 
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }] 
      }
    });
    const json = JSON.parse(response.text || "[]");
    return json.map((p: any) => ({
      ...p,
      uri: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    }));
  } catch (e) { return []; }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Icon of ${itemName}, white background.` }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { return null; }
};
