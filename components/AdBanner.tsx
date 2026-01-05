
import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adClient?: string;
  adSlot?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({ 
  adClient = "ca-pub-3407163814927819", 
  adSlot = "5112143646" 
}) => {
  const initialized = useRef(false);

  useEffect(() => {
    // Empêche la double initialisation qui peut causer des erreurs CSS
    if (initialized.current) return;
    
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initialized.current = true;
      }
    } catch (e) {
      console.warn("AdSense push error:", e);
    }
  }, []);

  return (
    <div className="ad-container my-4 bg-slate-50 border border-slate-100 rounded-2xl p-2 flex flex-col items-center min-h-[100px] justify-center overflow-hidden">
      <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest mb-2">Annonce Sponsorisée</span>
      <ins className="adsbygoogle"
           style={{ display: 'block', minWidth: '250px', minHeight: '90px' }}
           data-ad-client={adClient}
           data-ad-slot={adSlot}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};
