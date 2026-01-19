
import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  adClient?: string;
  adSlot?: string;
}

declare global { interface Window { adsbygoogle: any[]; } }

export const AdBanner: React.FC<AdBannerProps> = ({ 
  adClient = "ca-pub-3407163814927819", adSlot = "5112143646" 
}) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        setTimeout(() => {
          if (window.adsbygoogle) (window.adsbygoogle = window.adsbygoogle || []).push({});
        }, 150);
        initialized.current = true;
      }
    } catch (e) { console.warn("AdSense error:", e); }
  }, []);

  return (
    <div className="ad-wrapper my-6 overflow-hidden">
      <div className="bg-slate-50/50 rounded-2xl p-2 border border-slate-100/50 flex flex-col items-center">
        <span className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.2em] mb-3">Sponsor</span>
        <div className="w-full flex justify-center overflow-hidden min-h-[100px]">
          <ins className="adsbygoogle" style={{ display: 'block', width: '100%', textAlign: 'center' }} data-ad-client={adClient} data-ad-slot={adSlot} data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>
      </div>
    </div>
  );
};
