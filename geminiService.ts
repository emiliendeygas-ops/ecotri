
import { GoogleGenAI } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const parts = typeof input === 'string' 
      ? [{ text: input }] 
      : [{ inlineData: input }, { text: isBarcode ? "Identifie ce produit via son code-barres et donne les consignes de tri." : "Identifie ce déchet." }];
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Expert tri France 2025. Réponds en JSON : {itemName, bin (JAUNE|VERT|GRIS|COMPOST|DECHETTERIE|POINT_APPORT), explanation, tips[], isRecyclable, zeroWasteAlternative}.",
        responseMimeType: "application/json"
      }
    });

    const jsonStr = response.text;
    return jsonStr ? JSON.parse(jsonStr) as SortingResult : null;
  } catch (e) { 
    console.error("Gemini analysis error:", e); 
    return null; 
  }
};

export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return chunks
      .filter((c: any) => c.maps)
      .map((c: any) => ({
        name: c.maps.title,
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

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A clear 3D render icon of ${itemName} for a waste sorting app, white background.` }] }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    console.error("Gemini Image error:", e);
    return null; 
  }
};
