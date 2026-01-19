import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

// Initialisation dynamique pour garantir l'accès à la clé d'environnement
const getAi = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getAi();
    const isImage = typeof input !== 'string';
    const contents = isImage 
      ? { parts: [{ inlineData: input }, { text: "Analyse ce déchet pour le tri en France (CITEO 2025). Réponds exclusivement en JSON." }] }
      : "Consigne de tri 2025 pour l'objet : \"" + input + "\". Réponds exclusivement en JSON.";

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: "Tu es SnapSort. Détermine le bac (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT). Retourne un JSON : itemName, bin, explanation, isRecyclable, impact (co2Saved: number, waterSaved: number, energySaved: string).",
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
    console.error("Erreur Gemini Analyze:", error);
    throw error;
  }
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAi();
    // Utilisation de gemini-3-flash-preview pour le grounding qui est plus permissif que le modèle Pro Image
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Où jeter : ${itemName} (${binType}) autour de la position lat: ${lat}, lng: ${lng} ?`,
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
      contents: { parts: [{ text: `High quality 3D icon of ${itemName} for a recycling app, clean white background.` }] },
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
      systemInstruction: `Tu es l'EcoCoach SnapSort. Aide l'utilisateur avec son déchet : ${result.itemName}.`,
    },
  });
};

export const getDailyEcoTip = async (): Promise<{ title: string; content: string } | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne un conseil de tri 2025. Réponds en JSON.",
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
    return { title: "Le tri", content: "Chaque geste compte." };
  }
};

export const PRIVACY_POLICY = `<h2 class="text-xl font-black mb-4">Privacy</h2><p>Traitement local via Gemini.</p>`;
export const TERMS_OF_SERVICE = `<h2 class="text-xl font-black mb-4">Terms</h2><p>Usage éducatif uniquement.</p>`;