import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

/**
 * Initialisation dynamique pour garantir que la clé sélectionnée par l'utilisateur est utilisée.
 */
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

/**
 * Analyse un déchet. Utilise Gemini 2.5 Flash pour la stabilité.
 */
export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  try {
    const ai = getAIInstance();
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
    
    // Utilisation du modèle 2.5 Flash pour garantir que cela fonctionne avec 100% des clés
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction: "Tu es un expert du tri en France. Réponds uniquement en JSON. Bacs: JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.",
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
    console.error("Erreur Gemini Service:", e);
    // Gestion des erreurs de droits/clé
    const errorMsg = e.message?.toLowerCase() || "";
    if (errorMsg.includes("403") || errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("key")) {
      throw new Error("AUTH_ERROR");
    }
    throw e;
  }
};

/**
 * Recherche de points de collecte via Google Maps Grounding.
 */
export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où jeter mes déchets de type ${binType} près de lat ${lat}, lng ${lng} ?`,
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
    console.warn("Maps Grounding indisponible:", e);
    return []; 
  }
};

/**
 * Génération d'image (Requiert Billing).
 */
export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Utilisation de flash-image pour plus de flexibilité
      contents: {
        parts: [{ text: `A professional 3D isometric icon of ${itemName} for a recycling app, white background.` }]
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    console.warn("Image gen failed (billing may be required):", e);
    return null; 
  }
};