
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

export interface SortingResult {
  itemName: string;
  bin: BinType;
  explanation: string;
  tips: string[];
  isRecyclable: boolean;
  imageUrl?: string;
  zeroWasteAlternative?: string;
  nearbyPoints?: CollectionPoint[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  itemName: string;
  bin: BinType;
}
