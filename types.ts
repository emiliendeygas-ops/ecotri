
export enum BinType {
  JAUNE = 'JAUNE',
  VERT = 'VERT',
  GRIS = 'GRIS',
  COMPOST = 'COMPOST',
  DECHETTERIE = 'DECHETTERIE',
  POINT_APPORT = 'POINT_APPORT'
}

export interface SortingResult {
  itemName: string;
  bin: BinType;
  explanation: string;
  isRecyclable: boolean;
  impact?: {
    co2Saved: number;
    waterSaved: number;
    energySaved: string;
  };
  imageUrl?: string;
  nearbyPoints?: CollectionPoint[];
}

export interface CollectionPoint {
  name: string;
  uri: string;
  lat?: number;
  lng?: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  itemName: string;
  bin: BinType;
}
