import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

// Initialisation de l'IA avec la clé d'environnement
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getAi();
    const isImage = typeof input !== 'string';
    
    const prompt = isImage 
      ? "Analyse cet objet pour le tri sélectif selon les NOUVELLES normes 2026. Réponds en JSON."
      : `Donne la consigne de tri mise à jour (2026) pour : "${input}". Réponds en JSON.`;

    const contents = isImage 
      ? { parts: [{ inlineData: input }, { text: prompt }] }
      : { parts: [{ text: prompt }] };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: "Tu es SnapSort, expert en gestion des déchets avec les standards Européens et Français de 2026. Détermine le bac correct (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT). Sois strict sur le compostage obligatoire et le tri universel des emballages plastiques. Retourne STRICTEMENT un JSON valide : {itemName: string, bin: string, explanation: string, isRecyclable: boolean, impact: {co2Saved: number, waterSaved: number, energySaved: string}}.",
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
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Où se trouve le point de collecte le plus proche pour '${itemName}' (${binType}) près de lat: ${lat}, lng: ${lng} ? Utilise Google Search pour trouver des lieux réels de recyclage ou déchetteries.`,
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
    return [];
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A professional 3D isometric icon of ${itemName} on a clean white background for a modern recycling mobile app.` }] },
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
      systemInstruction: `Tu es l'EcoCoach SnapSort spécialisé dans le tri 2026. Aide l'utilisateur à réduire ses déchets pour l'objet : ${result.itemName}. Sois bref et pratique.`,
    },
  });
};

export const getDailyEcoTip = async (): Promise<{ title: string; content: string } | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne un conseil de tri ou de réduction des déchets pour l'année 2026 en France. Réponds en JSON.",
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
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) { return null; }
};

export const PRIVACY_POLICY = `<h2>Privacy 2026</h2><p>SnapSort traite vos photos localement via l'API Gemini. Aucune donnée n'est vendue ou stockée au-delà de la session d'analyse.</p>`;
export const TERMS_OF_SERVICE = `<h2>Conditions 2026</h2><p>SnapSort est un outil éducatif. En cas de doute, la consigne locale affichée sur vos bacs de collecte prévaut.</p>`;