
import { GoogleGenAI, Type } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

const handleApiError = (error: any) => {
  console.error("Gemini API Error Detail:", error);
  
  const errorText = error?.message || "";
  const errorStatus = error?.status || "";
  
  // Détection spécifique du blocage par Referrer (Domaine)
  if (errorText.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorText.includes("blocked") && errorText.includes("referer")) {
    throw new Error("API_KEY_REFERRER_BLOCKED");
  }

  if (errorStatus === "PERMISSION_DENIED" || errorText.includes("403") || errorText.includes("key") || errorText.includes("invalid")) {
    throw new Error("API_KEY_INVALID");
  }

  throw error;
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getClient();
    const isImage = typeof input !== 'string';
    
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Analyse ce déchet pour le tri en France (normes 2025). Calcule aussi son impact écologique s'il est trié correctement." }]
      : [{ text: `Consigne de tri officielle France 2025 pour : "${input}". Calcule aussi l'impact écologique du recyclage de cet objet.` }];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `Tu es EcoTri, expert français du tri sélectif et de l'écologie.
        DIRECTIVES :
        1. Réponds en JSON uniquement.
        2. Bacs : JAUNE, VERT, GRIS, COMPOST, DECHETTERIE, POINT_APPORT.
        3. IMPACT : Estime de manière réaliste (basé sur les moyennes ADEME) le CO2 économisé (en g), l'eau (en L) et l'équivalent énergie.
        4. QUESTIONS : Suggère 3 questions que l'utilisateur pourrait se poser spécifiquement sur ce déchet (ex: "Faut-il laver le pot ?", "Et si le couvercle est en métal ?").
        5. COHÉRENCE : Piles/Batteries/Ampoules -> POINT_APPORT obligatoire avec mention supermarché.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            bin: { type: Type.STRING, enum: Object.values(BinType) },
            explanation: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            isRecyclable: { type: Type.BOOLEAN },
            zeroWasteAlternative: { type: Type.STRING },
            impact: {
              type: Type.OBJECT,
              properties: {
                co2Saved: { type: Type.NUMBER },
                waterSaved: { type: Type.NUMBER },
                energySaved: { type: Type.STRING }
              },
              required: ["co2Saved", "waterSaved", "energySaved"]
            },
            suggestedQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["itemName", "bin", "explanation", "tips", "isRecyclable", "impact", "suggestedQuestions"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as SortingResult;
  } catch (error: any) {
    handleApiError(error);
    return null;
  }
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où puis-je jeter ou recycler mon/ma "${itemName}" (catégorie de tri: ${binType}) à proximité de ma position actuelle ? Donne-moi les adresses précises ou les noms des points de collecte, déchèteries ou bornes.`,
      config: { 
        tools: [{ googleMaps: {} }], 
        toolConfig: { 
          retrievalConfig: { 
            latLng: { 
              latitude: lat, 
              longitude: lng 
            } 
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
      .filter((p: any) => p.uri);
  } catch (e) {
    handleApiError(e);
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
