import React, { useEffect } from 'react';

interface AdBannerProps {
  adClient?: string;
  adSlot?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

/**
 * Composant AdSense réutilisable.
 * @param adClient Votre ID éditeur (ca-pub-XXX)
 * @param adSlot ID de l'unité publicitaire créé sur AdSense
 */
export const AdBanner: React.FC<AdBannerProps> = ({ 
  adClient = "ca-pub-XXXXXXXXXXXXXXXX", // Remplacez par votre ID
  adSlot = "XXXXXXXXXX" // Remplacez par votre ID d'unité publicitaire
}) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("Erreur chargement AdSense:", e);
    }
  }, []);

  return (
    <div className="ad-container my-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 flex flex-col items-center">
      <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mb-2">Annonce Sponsorisée</span>
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client={adClient}
           data-ad-slot={adSlot}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};