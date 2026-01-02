import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

/**
 * Crée une nouvelle instance de l'IA au moment de l'appel pour garantir
 * l'utilisation de la clé la plus récente sélectionnée par l'utilisateur.
 */
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyse un déchet via texte ou image.
 * Utilise gemini-3-flash-preview (modèle de base recommandé).
 */
export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  try {
    const ai = getAI();
    let parts: any[] = [];
    
    if (typeof input === 'string') {
      parts = [{ text: `Objet à trier en France : "${input}". Donne la consigne de tri précise.` }];
    } else {
      parts = [
        { inlineData: input },
        { text: isBarcode 
            ? "Identifie ce code-barres et donne les consignes de tri en France au format JSON." 
            : "Identifie cet objet et donne les consignes de tri en France au format JSON." 
        }
      ];
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Tu es un expert du tri sélectif en France (consignes 2025). Réponds UNIQUEMENT au format JSON. Bacs autorisés: JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.",
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
    console.error("Erreur API Gemini:", e);
    const msg = e.message || "";
    // On propage l'erreur brute pour que App.tsx puisse détecter "Requested entity was not found"
    throw e;
  }
};

/**
 * Recherche de points de collecte (Requis Gemini 2.5 pour Maps Grounding).
 */
export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où se trouve le point de collecte pour ${binType} le plus proche de lat:${lat}, lng:${lng} ?`,
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
 * Génération d'image d'illustration.
 */
export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A professional 3D isometric icon of ${itemName} on a white background, minimalist style.` }]
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    return null; 
  }
};