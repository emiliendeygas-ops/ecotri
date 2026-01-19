import React from 'react';
import { BinType } from './types';

export const BIN_MAPPING: Record<string, { label: string; color: string; text: string; icon: string; desc: string }> = {
  [BinType.JAUNE]: { 
    label: 'Bac Jaune', 
    color: 'bg-[#FFD700]', 
    text: 'text-yellow-950', 
    icon: '📦',
    desc: 'Emballages plastiques, métaux, cartons et tous les papiers.'
  },
  [BinType.VERT]: { 
    label: 'Bac Verre', 
    color: 'bg-[#059669]', 
    text: 'text-white', 
    icon: '🍾',
    desc: 'Bouteilles, pots et bocaux en verre (sans bouchons).'
  },
  [BinType.GRIS]: { 
    label: 'Bac Gris', 
    color: 'bg-[#475569]', 
    text: 'text-white', 
    icon: '🗑️',
    desc: 'Ordures ménagères résiduelles (non recyclables).'
  },
  [BinType.COMPOST]: { 
    label: 'Composteur', 
    color: 'bg-[#78350F]', 
    text: 'text-white', 
    icon: '🍎',
    desc: 'Restes alimentaires, épluchures, marc de café.'
  },
  [BinType.DECHETTERIE]: { 
    label: 'Déchèterie', 
    color: 'bg-[#2563EB]', 
    text: 'text-white', 
    icon: '🚛',
    desc: 'Encombrants, gravats, produits toxiques et appareils électriques.'
  },
  [BinType.POINT_APPORT]: { 
    label: 'Point d\'apport', 
    color: 'bg-[#7C3AED]', 
    text: 'text-white', 
    icon: '📍',
    desc: 'Piles, ampoules, textile ou bornes spécifiques de quartier.'
  },
};

export const RECYCLING_GUIDE = [
  { title: "Plastiques 2025", content: "Depuis 2023 en France, l'extension des consignes de tri (ECT) permet de mettre TOUS les emballages plastiques dans le bac jaune (pots de yaourt, barquettes, films plastiques)." },
  { title: "Zéro Lavage", content: "Il est inutile de laver vos emballages ! Il suffit de bien les vider. L'eau utilisée pour le lavage est souvent plus précieuse que le bénéfice du recyclage d'un emballage souillé." },
  { title: "Biodéchets", content: "Le tri des biodéchets est obligatoire pour tous depuis le 1er janvier 2024. Pensez au compostage de quartier ou aux bacs marrons." },
  { title: "Métaux", content: "Même les petits métaux (capsules de café, opercules, papier alu) se recyclent dans le bac jaune grâce aux machines à induction des centres de tri." }
];