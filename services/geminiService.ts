import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

/**
 * Récupère la clé API. 
 * Dans GitHub, le secret est VITE_API_KEY.
 * Vite l'injecte dans import.meta.env.VITE_API_KEY lors du build.
 */
const getApiKey = () => {
  // @ts-ignore
  const viteKey = import.meta.env?.VITE_API_KEY;
  // @ts-ignore
  const processKey = typeof process !== 'undefined' ? process.env?.API_KEY : "";
  
  return viteKey || processKey || "";
};

const getAi = () => {
  const apiKey = getApiKey();
  // On crée l'instance seulement au moment de l'appel
  return new GoogleGenAI({ apiKey });
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getAi();
    const isImage = typeof input !== 'string';
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Analyse ce déchet pour le tri en France (Règles CITEO 2025). Réponds exclusivement en JSON." }]
      : [{ text: `Consigne de tri 2025 pour l'objet : "${input}". Réponds exclusivement en JSON.` }];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `Tu es SnapSort, l'expert ultime du tri sélectif.
        Détermine le bac approprié (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT).
        Sois précis sur les consignes françaises 2025 (tous les emballages se trient).
        Retourne : itemName, bin, explanation, isRecyclable, et impact (co2Saved, waterSaved, energySaved).`,
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
    console.error("Erreur d'analyse SnapSort:", error);
    throw error;
  }
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Où jeter : ${itemName} (${binType}) autour de moi (lat: ${lat}, lng: ${lng}) ?`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const points: CollectionPoint[] = chunks
      .filter(c => c.maps)
      .map(c => ({
        name: c.maps?.title || "Point de collecte",
        uri: c.maps?.uri || "",
      }));

    return points;
  } catch (e) {
    return [];
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Isometric 3D 4K render of ${itemName} on a solid white background, high quality recycling icon style.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    return null; 
  }
};

export const startEcoChat = (result: SortingResult): Chat => {
  const ai = getAi();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es l'EcoCoach de SnapSort. L'utilisateur vient de trier "${result.itemName}". Donne des astuces de réduction à la source ou d'Upcycling. Sois fun et encourageant.`,
    },
  });
};

export const getDailyEcoTip = async (): Promise<{ title: string; content: string } | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne un conseil de tri 2025 inédit. Réponds en JSON.",
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
    return { title: "Le tri, c'est la vie", content: "Chaque geste compte pour protéger notre planète." };
  }
};

export const PRIVACY_POLICY = `
  <h2 class="text-xl font-black mb-4">Protection des données</h2>
  <p class="mb-4">SnapSort utilise l'IA Gemini pour traiter vos images localement. Aucune photo n'est vendue à des tiers.</p>
  <p>Votre position GPS est utilisée uniquement pour la recherche de bornes via Google Maps Grounding.</p>
`;

export const TERMS_OF_SERVICE = `
  <h2 class="text-xl font-black mb-4">Engagement EcoSnap</h2>
  <p class="mb-4">SnapSort est un guide éducatif. Les consignes locales prévalent toujours sur les suggestions de l'IA.</p>
  <p>En utilisant SnapSort, vous rejoignez une communauté engagée pour le zéro déchet.</p>
`;