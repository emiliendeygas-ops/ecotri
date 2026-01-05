
export enum BinType {
  JAUNE = 'JAUNE',
  VERT = 'VERT',
  GRIS = 'GRIS',
  COMPOST = 'COMPOST',
  DECHETTERIE = 'DECHETTERIE',
  POINT_APPORT = 'POINT_APPORT',
}

export interface CollectionPoint {
  name: string;
  uri: string;
  lat?: number;
  lng?: number;
}

export interface EcoImpact {
  co2Saved: number; // en grammes
  waterSaved: number; // en litres
  energySaved: string; // ex: "2h d'ampoule LED"
}

export interface SortingResult {
  itemName: string;
  bin: BinType;
  explanation: string;
  tips: string[];
  isRecyclable: boolean;
  imageUrl?: string;
  zeroWasteAlternative?: string;
  nearbyPoints?: CollectionPoint[];
  impact?: EcoImpact;
  suggestedQuestions?: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  itemName: string;
  bin: BinType;
}
