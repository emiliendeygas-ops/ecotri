
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { SortingResult, BinType, CollectionPoint } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error("API_KEY_MISSING");
  }
  // Correct initialization with named parameter
  return new GoogleGenAI({ apiKey: apiKey });
};

const handleApiError = (error: any) => {
  console.error("Gemini API Error Detail:", error);
  const errorText = error?.message || "";
  if (errorText.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorText.includes("blocked") && errorText.includes("referer")) {
    throw new Error("API_KEY_REFERRER_BLOCKED");
  }
  if (error?.status === "PERMISSION_DENIED" || errorText.includes("403") || errorText.includes("key") || errorText.includes("invalid")) {
    throw new Error("API_KEY_INVALID");
  }
  throw error;
};

export const getDailyEcoTip = async (): Promise<{ title: string, content: string }> => {
  try {
    const ai = getClient();
    // Use ai.models.generateContent to query GenAI with both the model name and prompt.
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Donne-moi un conseil court et percutant sur le tri ou l'écologie en France. Format JSON: { \"title\": \"...\", \"content\": \"...\" }",
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
    // The GenerateContentResponse object features a text property (not a method)
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { title: "Le tri, c'est la vie", content: "Chaque geste compte pour protéger notre planète." };
  }
};

export const analyzeWaste = async (input: string | { data: string, mimeType: string }): Promise<SortingResult | null> => {
  try {
    const ai = getClient();
    const isImage = typeof input !== 'string';
    const parts = isImage 
      ? [{ inlineData: input }, { text: "Analyse ce déchet pour le tri en France (normes 2025). Calcule aussi son impact écologique." }]
      : [{ text: `Consigne de tri officielle France 2025 pour : "${input}".` }];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: `Tu es EcoTri, expert français du tri sélectif. Réponds en JSON uniquement.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itemName: { type: Type.STRING },
            bin: { type: Type.STRING, enum: Object.values(BinType) },
            explanation: { type: Type.STRING },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            isRecyclable: { type: Type.BOOLEAN },
            impact: {
              type: Type.OBJECT,
              properties: {
                co2Saved: { type: Type.NUMBER },
                waterSaved: { type: Type.NUMBER },
                energySaved: { type: Type.STRING }
              },
              required: ["co2Saved", "waterSaved", "energySaved"]
            },
            suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["itemName", "bin", "explanation", "tips", "isRecyclable", "impact", "suggestedQuestions"]
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error: any) {
    handleApiError(error);
    return null;
  }
};

export const startEcoChat = (result: SortingResult): Chat => {
  const ai = getClient();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es l'EcoCoach d'EcoTri. L'utilisateur vient d'analyser ${result.itemName}. Réponds de manière experte et courte.`,
    },
  });
};

const extractCoordsFromUri = (uri: string): { lat: number, lng: number } | null => {
  try {
    const decodedUri = decodeURIComponent(uri);
    
    const patterns = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /[?&](?:query|q)=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /\/(-?\d+\.\d+),(-?\d+\.\d+)/
    ];

    for (const pattern of patterns) {
      const match = decodedUri.match(pattern);
      if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
  } catch (e) {}
  return null;
};

export const findNearbyPoints = async (binType: BinType, itemName: string, lat: number, lng: number): Promise<CollectionPoint[]> => {
  const ai = getClient();
  let points: CollectionPoint[] = [];

  try {
    const mapsResponse: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `Liste 3 points de collecte publics et précis pour : "${itemName}" (type: ${binType}) proches de lat:${lat}, lng:${lng}.`,
      config: { 
        tools: [{ googleMaps: {} }], 
        toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } } 
      }
    });

    const chunks = mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((c: any) => {
      if (c.maps) {
        const coords = extractCoordsFromUri(c.maps.uri);
        points.push({
          name: c.maps.title || "Point de collecte",
          uri: c.maps.uri,
          lat: coords?.lat,
          lng: coords?.lng
        });
      }
    });
  } catch (e) {
    console.warn("Google Maps Tool failed, switching to native knowledge...");
  }

  if (points.filter(p => p.lat).length === 0) {
    try {
      const fallbackResponse: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `En tant qu'expert en gestion des déchets en France, donne-moi les coordonnées GPS (latitude, longitude) des 3 points de collecte les plus probables pour "${itemName}" (type de bac: ${binType}) à proximité immédiate des coordonnées ${lat}, ${lng}. Réponds uniquement en JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
                uri: { type: Type.STRING }
              },
              required: ["name", "lat", "lng"]
            }
          }
        }
      });
      
      const jsonPoints = JSON.parse(fallbackResponse.text || "[]");
      if (jsonPoints.length > 0) {
        points = jsonPoints.map((p: any) => ({
          ...p,
          uri: p.uri || `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
        }));
      }
    } catch (e) {
      console.error("Native knowledge fallback failed:", e);
    }
  }

  return points.filter(p => p.uri);
};

export const generateWasteImage = async (itemName: string): Promise<string | null> => {
  try {
    const ai = getClient();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist 3D isometric icon of ${itemName} for recycling app, white background.` }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) { return null; }
};
