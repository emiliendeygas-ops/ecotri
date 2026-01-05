
import { BinType } from './types';

export const BIN_MAPPING = {
  [BinType.JAUNE]: { label: 'Bac Jaune', color: 'bg-[#FBBF24]', text: 'text-amber-950', desc: 'Emballages, plastiques & papiers' },
  [BinType.VERT]: { label: 'Bac Verre', color: 'bg-[#059669]', text: 'text-white', desc: 'Bouteilles, bocaux & flacons' },
  [BinType.GRIS]: { label: 'Bac Gris', color: 'bg-[#475569]', text: 'text-white', desc: 'Ordures ménagères non recyclables' },
  [BinType.COMPOST]: { label: 'Compost', color: 'bg-[#78350F]', text: 'text-white', desc: 'Déchets alimentaires & végétaux' },
  [BinType.DECHETTERIE]: { label: 'Déchetterie', color: 'bg-[#2563EB]', text: 'text-white', desc: 'Encombrants, gravats & toxiques' },
  [BinType.POINT_APPORT]: { label: 'Borne de Collecte', color: 'bg-[#7C3AED]', text: 'text-white', desc: 'Piles, ampoules, textile (Supermarchés)' },
};
