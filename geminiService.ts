import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "./types";

export const analyzeWaste = async (input: string | { data: string, mimeType: string }, isBarcode: boolean = false): Promise<SortingResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let parts: any[] = [];
    
    if (typeof input === 'string') {
      parts = [{ text: `Identifie précisément ce déchet et donne les consignes de tri en France (bac jaune, verre, gris, compost, déchetterie ou point d'apport) : "${input}"` }];
    } else {
      parts = [
        { inlineData: input },
        { text: isBarcode 
            ? "Identifie ce produit par son code-barres et donne les consignes de tri exactes en France (JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT)." 
            : "Identifie cet objet déchet et donne les consignes de tri exactes en France." 
        }
      ];
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Tu es un expert en tri sélectif français. Réponds exclusivement en JSON valide suivant le schéma fourni. Les bacs (bin) autorisés sont : JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            bin: { 
              type: Type.STRING, 
              description: "Une des valeurs : JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT" 
            },
            explanation: { type: Type.STRING },
            tips: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            isRecyclable: { type: Type.BOOLEAN },
            zeroWasteAlternative: { type: Type.STRING }
          },
          required: ["itemName", "bin", "explanation", "tips", "isRecyclable"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.error("L'IA a renvoyé une réponse vide.");
      return null;
    }
    
    return JSON.parse(text) as SortingResult;
  } catch (e: any) { 
    // Log crucial pour le débogage utilisateur
    console.error("ERREUR CRITIQUE GEMINI:", e.message);
    if (e.message?.includes("API key")) {
      console.error("Problème de clé API. Vérifiez vos variables d'environnement.");
    }
    return null; 
  }
};

export const findNearbyPoints = async (binType: BinType, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Note: googleMaps nécessite souvent un projet avec facturation activée dans Google AI Studio
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où se trouve le point de collecte pour ${binType} le plus proche de ma position (lat: ${lat}, lng: ${lng}) ?`,
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
  } catch (e: any) { 
    console.warn("Erreur Maps (souvent dû à l'absence de facturation sur le projet):", e.message);
    return []; 
  }
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A professional 3D isometric icon of ${itemName} for a recycling app, isolated on white background.` }] }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { 
    return null; 
  }
};