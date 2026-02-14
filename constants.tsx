import React from 'react';
import { BinType } from './types';

export const BIN_MAPPING: Record<string, { label: string; color: string; text: string; icon: string; desc: string }> = {
  [BinType.JAUNE]: { 
    label: 'Bac Jaune 2026', 
    color: 'bg-[#FFD700]', 
    text: 'text-yellow-950', 
    icon: '📦',
    desc: 'TOUS les emballages sans exception (plastiques, métaux, cartons, papiers, petits métaux).'
  },
  [BinType.VERT]: { 
    label: 'Bac Verre', 
    color: 'bg-[#059669]', 
    text: 'text-white', 
    icon: '🍾',
    desc: 'Bouteilles, pots et bocaux en verre. Les bouchons vont désormais aussi dans le bac jaune.'
  },
  [BinType.GRIS]: { 
    label: 'Bac Gris', 
    color: 'bg-[#475569]', 
    text: 'text-white', 
    icon: '🗑️',
    desc: 'Uniquement les déchets non recyclables (hygiène, poussière). Doit être réduit au minimum.'
  },
  [BinType.COMPOST]: { 
    label: 'Bio-déchets 2026', 
    color: 'bg-[#78350F]', 
    text: 'text-white', 
    icon: '🍎',
    desc: 'Obligatoire : Restes alimentaires, épluchures. Collecte séparée ou compostage de proximité.'
  },
  [BinType.DECHETTERIE]: { 
    label: 'Déchèterie', 
    color: 'bg-[#2563EB]', 
    text: 'text-white', 
    icon: '🚛',
    desc: 'Objets volumineux, gravats, produits chimiques et DEEE (électronique).'
  },
  [BinType.POINT_APPORT]: { 
    label: 'Point Textiles/Flux spécifiques', 
    color: 'bg-[#7C3AED]', 
    text: 'text-white', 
    icon: '👔',
    desc: 'Nouveauté 2026 : 100% des textiles, chaussures et linges de maison doivent être déposés en borne.'
  },
};

export const RECYCLING_GUIDE = [
  { title: "Standard 2026 : 100% Tri", content: "Dès 2026, l'Europe impose le tri systématique de tous les matériaux. En France, cela signifie qu'aucun emballage ne doit finir dans le bac gris." },
  { title: "Bio-déchets obligatoires", content: "Depuis 2024 et renforcé en 2026, jeter des restes alimentaires dans le bac gris est interdit. Utilisez les solutions de compostage obligatoires de votre commune." },
  { title: "Textiles & Chaussures", content: "Le tri des textiles devient universel. Même usés ou troués, ils doivent être placés en point d'apport pour être transformés en isolant ou nouveaux fils." },
  { title: "Emballages Réemployables", content: "Privilégiez les produits avec le logo 'Consigne'. En 2026, de nombreux points de vente reprennent vos emballages vides pour lavage." }
];