
import { BinType } from './types';

export const BIN_MAPPING = {
  [BinType.JAUNE]: { label: 'Bac Jaune', color: 'bg-yellow-400', desc: 'Emballages & Papiers' },
  [BinType.VERT]: { label: 'Bac Verre', color: 'bg-emerald-600', desc: 'Bouteilles & Bocaux' },
  [BinType.GRIS]: { label: 'Bac Gris', color: 'bg-slate-600', desc: 'Ordures Ménagères' },
  [BinType.COMPOST]: { label: 'Compost', color: 'bg-amber-800', desc: 'Déchets Organiques' },
  [BinType.DECHETTERIE]: { label: 'Déchetterie', color: 'bg-blue-600', desc: 'Encombrants & Toxiques' },
  [BinType.POINT_APPORT]: { label: 'Point Apport', color: 'bg-purple-600', desc: 'Piles, Textiles, etc.' },
};
