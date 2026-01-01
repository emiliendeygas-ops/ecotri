import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

/**
 * Analyse un déchet ou un code-barres via Gemini.
 * On initialise l'instance GoogleGenAI à chaque appel pour utiliser la clé sélectionnée.
 */
export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Clé API manquante dans l'environnement.");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    let parts: any[] = [];
    
    if (typeof input === 'string') {
      parts = [{ text: `Indique précisément le bac de tri en France pour l'objet : "${input}".` }];
    } else {
      parts = [
        { inlineData: input },
        { text: isBarcode 
            ? "Identifie ce code-barres et donne les consignes de tri exactes en France." 
            : "Identifie cet objet sur la photo et donne les consignes de tri exactes en France." 
        }
      ];
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Tu es un expert en tri sélectif français. Réponds exclusivement au format JSON. Si l'objet est inconnu, essaie de deviner sa catégorie principale. Bacs acceptés : JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.",
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
    console.error("Erreur lors de l'analyse Gemini:", e);
    return null; 
  }
};

/**
 * Recherche des points de collecte via Google Maps Grounding.
 */
export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return [];
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où se trouvent les points de collecte les plus proches pour "${binType}" ? Position actuelle : lat ${lat}, lng ${lng}.`,
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
        name: c.maps.title || "Point de collecte",
        uri: c.maps.uri,
        lat: parseFloat(c.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)?.[1] || "0"),
        lng: parseFloat(c.maps.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)?.[2] || "0")
      }))
      .filter((p: any) => p.lat !== 0);
  } catch (e) { 
    console.error("Erreur Google Maps Grounding:", e);
    return []; 
  }
};

/**
 * Génère une icône 3D du déchet via Gemini Image.
 */
export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: `A clean 3D isometric icon of ${itemName} for a recycling app, professional studio lighting, isolated on white background.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    console.error("Erreur Génération Image:", e);
    return null; 
  }
};