import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getAi();
    const isImage = typeof input !== 'string';
    
    const prompt = isImage 
      ? "Analyse cet objet pour le tri sélectif en France selon les normes de 2026. Réponds en JSON."
      : `Donne la consigne de tri 2026 pour : "${input}". Réponds en JSON.`;

    const contents = isImage 
      ? { parts: [{ inlineData: input }, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: "Tu es SnapSort v2026. Détermine le bac (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT). Sois précis sur les nouvelles obligations de compostage et textiles. Retourne STRICTEMENT un JSON valide avec : itemName, bin, explanation, isRecyclable (boolean), impact (co2Saved, waterSaved, energySaved).",
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

    return response.text ? JSON.parse(response.text) : null;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAi();
    // Prompt optimisé pour utiliser Google Search Grounding
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Trouve des points de collecte réels (déchetteries, bornes de tri, points d'apport) pour un déchet de type '${itemName}' qui va dans le bac '${binType}' près de ma position (lat: ${lat}, lng: ${lng}). Donne les noms exacts et les liens.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return chunks
      .filter(c => c.web)
      .map(c => ({
        name: c.web?.title || "Point de collecte identifié",
        uri: c.web?.uri || `https://www.google.com/maps/search/${encodeURIComponent(c.web?.title || 'collecte tri')}`,
      }));
  } catch (e) {
    console.error("Grounding error:", e);
    return [];
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A clean 3D isometric icon of ${itemName} on white background.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};

export const startEcoChat = (result: SortingResult): Chat => {
  const ai = getAi();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es l'EcoCoach SnapSort. Aide l'utilisateur à réduire l'impact de son déchet : ${result.itemName}.`,
    },
  });
};

export const getDailyEcoTip = async (): Promise<{ title: string; content: string } | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne un conseil de tri 2026. Réponse en JSON.",
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
  } catch (error) { return null; }
};

export const PRIVACY_POLICY = `<h2>Confidentialité 2026</h2><p>SnapSort utilise l'IA Gemini pour analyser vos déchets. Vos données de localisation sont uniquement utilisées pour trouver des points de collecte proches.</p>`;
export const TERMS_OF_SERVICE = `<h2>Conditions d'utilisation</h2><p>SnapSort est un guide indicatif basé sur les normes nationales 2026. Référez-vous aux consignes locales en cas de doute.</p>`;