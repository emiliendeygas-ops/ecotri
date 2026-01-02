import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

/**
 * Analyse un déchet ou un code-barres.
 * Utilise gemini-3-flash-preview pour une meilleure compatibilité.
 */
export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    let parts: any[] = [];
    if (typeof input === 'string') {
      parts = [{ text: `Consigne de tri précise en France pour : "${input}".` }];
    } else {
      parts = [
        { inlineData: input },
        { text: isBarcode 
            ? "Identifie ce code-barres et donne les consignes de tri en France (JSON)." 
            : "Identifie cet objet et donne les consignes de tri en France (JSON)." 
        }
      ];
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Expert tri France. Réponds en JSON uniquement. Bacs: JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.",
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

    const resultText = response.text;
    if (!resultText) return null;
    return JSON.parse(resultText) as SortingResult;
  } catch (e: any) { 
    console.error("Erreur Analyse:", e);
    if (e.message?.includes("entity was not found") || e.message?.includes("404") || e.message?.includes("403")) {
      throw new Error("API_KEY_INVALID_OR_BILLING_REQUIRED");
    }
    throw e;
  }
};

/**
 * Recherche de points de collecte (Optionnel, ne bloque pas l'app).
 */
export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return [];
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Points de collecte ${binType} autour de lat: ${lat}, lng: ${lng} en France.`,
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

/**
 * Génération d'image 3D (Optionnel, très sensible au Billing).
 */
export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `A clean 3D isometric icon of a ${itemName} for a recycling app, professional lighting, white background.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    console.warn("Image gen skipped:", e);
    return null; 
  }
};