
import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key === 'undefined') {
    throw new Error("API_KEY_INVALID");
  }
  return new GoogleGenAI({ apiKey: key });
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getAI();
    const isImage = typeof input !== 'string';
    
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Identifie précisément ce déchet et donne les consignes de tri en France." }]
      : [{ text: `Consigne de tri en France (normes 2025) pour cet objet : "${input}".` }];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Tu es l'expert tri EcoTri France. Réponds TOUJOURS en JSON pur. Bacs : JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT. Si tu ne reconnais pas l'objet, renvoie un JSON vide.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            bin: { type: Type.STRING, enum: Object.values(BinType) },
            explanation: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            isRecyclable: { type: Type.BOOLEAN },
            zeroWasteAlternative: { type: Type.STRING }
          },
          required: ["itemName", "bin", "explanation", "tips", "isRecyclable"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as SortingResult;
  } catch (error: any) {
    console.error("Analyse error:", error);
    if (error.message?.includes("API key not found") || error.message === "API_KEY_INVALID") {
      throw new Error("API_KEY_INVALID");
    }
    return null;
  }
};

export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Points de collecte pour ${binType} proches de lat:${lat}, lng:${lng}.`,
      config: { 
        tools: [{ googleMaps: {} }], 
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } 
      }
    });
    
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
    return [];
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `A clean 3D isometric icon of ${itemName} on a solid white background, high quality.` }] 
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) {
    return null;
  }
};
