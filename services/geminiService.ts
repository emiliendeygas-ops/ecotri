import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

// Utilitaire pour récupérer la clé API de manière robuste
const getApiKey = (): string => {
  // @ts-ignore
  const key = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY || "";
  if (!key) {
    console.warn("⚠️ SnapSort: API_KEY non trouvée. Vérifiez vos secrets/env.");
  }
  return key;
};

const getAi = () => {
  return new GoogleGenAI({ apiKey: getApiKey() });
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getAi();
    const isImage = typeof input !== 'string';
    
    const prompt = isImage 
      ? "Analyse cet objet pour le tri sélectif en France (consignes 2025). Réponds en JSON."
      : `Donne la consigne de tri 2025 pour : "${input}". Réponds en JSON.`;

    const contents = isImage 
      ? { parts: [{ inlineData: input }, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: "Tu es SnapSort. Détermine le bac (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT). Retourne STRICTEMENT un JSON : itemName, bin, explanation, isRecyclable (boolean), impact (co2Saved: number, waterSaved: number, energySaved: string).",
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

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");
    return JSON.parse(text);
  } catch (error) {
    console.error("Erreur Gemini Analyze:", error);
    throw error;
  }
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAi();
    // Utilisation systématique de gemini-3-flash-preview pour le grounding
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Où se trouve le point de collecte de type ${binType} le plus proche pour jeter ${itemName} autour de ma position (lat: ${lat}, lng: ${lng}) ?`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return chunks
      .filter(c => c.web)
      .map(c => ({
        name: c.web?.title || "Point de collecte",
        uri: c.web?.uri || "",
      }));
  } catch (e) {
    console.error("Erreur Gemini Grounding:", e);
    return [];
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `High quality 3D icon of ${itemName} for a recycling app, professional clean style, white background.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) { 
    return null; 
  }
};

export const startEcoChat = (result: SortingResult): Chat => {
  const ai = getAi();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es l'EcoCoach SnapSort. Aide l'utilisateur avec son déchet : ${result.itemName}. Sois bref et encourageant.`,
    },
  });
};

export const getDailyEcoTip = async (): Promise<{ title: string; content: string } | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne un conseil de tri rapide pour 2025. Réponds en JSON.",
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
    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    return { title: "Le tri", content: "Chaque geste compte pour la planète." };
  }
};

export const PRIVACY_POLICY = `<h2 class="text-xl font-black mb-4">Confidentialité</h2><p>SnapSort analyse vos images via l'IA sans stockage permanent.</p>`;
export const TERMS_OF_SERVICE = `<h2 class="text-xl font-black mb-4">Conditions</h2><p>SnapSort est un guide indicatif. Respectez les consignes locales.</p>`;