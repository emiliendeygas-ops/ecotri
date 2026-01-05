
import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("API_KEY_INVALID");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getClient();
    const isImage = typeof input !== 'string';
    
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Analyse ce déchet pour le tri en France (normes 2025). Soyez précis sur le type de matière." }]
      : [{ text: `Consigne de tri officielle France 2025 pour : "${input}".` }];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `Tu es EcoTri, expert français du tri sélectif. 
        DIRECTIVES CRITIQUES :
        1. Réponds UNIQUEMENT en JSON. 
        2. Bacs autorisés : JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.
        3. COHÉRENCE : Si le déchet est une pile, batterie, ampoule ou cartouche d'encre, choisis obligatoirement POINT_APPORT.
        4. EXPLICATION : Pour POINT_APPORT, mentionne toujours explicitement 'les bacs de collecte à l'entrée des supermarchés ou commerces'.
        5. Pour les encombrants ou produits dangereux (peinture, solvants), choisis DECHETTERIE.
        6. Si un déchet va en POINT_APPORT, l'explication doit être cohérente avec cette destination.`,
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

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as SortingResult;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.toLowerCase().includes("key") || error.message?.includes("403") || error.message === "API_KEY_INVALID") {
      throw new Error("API_KEY_INVALID");
    }
    return null;
  }
};

export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Donne-moi les 3 points de collecte les plus proches pour le type de déchet ${binType} près de ma position (lat:${lat}, lng:${lng}).`,
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
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `A clean minimalist 3D isometric icon of ${itemName} for a recycling app, isolated on white background.` }] 
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) {
    return null;
  }
};
