
import React, { useState } from 'react';
import { SortingResult } from '../types';
import { BIN_MAPPING } from '../constants';
// Use named import as MapView is exported as a named constant
import { MapView } from './MapView';

export const ResultCard: React.FC<{ result: SortingResult, userLocation?: any, onReset: () => void }> = ({ result, userLocation, onReset }) => {
  const binInfo = BIN_MAPPING[result.bin];
  const [activePoint, setActivePoint] = useState(0);

  return (
    <div className="p-4 space-y-6 animate-slide-up pb-20">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className={`${binInfo.color} p-8 text-white text-center`}>
          <h2 className="text-3xl font-black capitalize mb-2">{result.itemName}</h2>
          <div className="bg-white/20 backdrop-blur inline-block px-4 py-1 rounded-full font-bold">{binInfo.label}</div>
        </div>

        <div className="p-6 space-y-6">
          {/* LEVIER MONETISATION 1 : PUBLICITÉ */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 text-center overflow-hidden">
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest block mb-1">Annonce</span>
            <div className="h-14 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-400 text-[10px] italic font-medium">
               [ Espace publicitaire Google AdMob ]
            </div>
          </div>

          <section>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Consigne</h3>
            <p className="text-slate-700 font-bold leading-relaxed">{result.explanation}</p>
          </section>

          {result.zeroWasteAlternative && (
            <section className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
              <h3 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2">🌱 Alternative Zéro Déchet</h3>
              <p className="text-emerald-900 text-sm font-bold mb-4">{result.zeroWasteAlternative}</p>
              
              {/* LEVIER MONETISATION 2 : AFFILIATION */}
              <button className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                🛍️ Trouver une version réutilisable
              </button>
            </section>
          )}

          {result.nearbyPoints?.length && userLocation && (
            <section className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Points de collecte proches</h3>
              <MapView points={[result.nearbyPoints[activePoint]]} userLocation={userLocation} />
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {result.nearbyPoints.map((p, i) => (
                  <button key={i} onClick={() => setActivePoint(i)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black border-2 transition-all ${i === activePoint ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                    {p.name.slice(0, 15)}...
                  </button>
                ))}
              </div>
              <a href={result.nearbyPoints[activePoint].uri} target="_blank" className="block text-center bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-sm">Voir l'itinéraire 📍</a>
            </section>
          )}

          <button onClick={onReset} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Scanner un autre objet</button>
        </div>
      </div>
    </div>
  );
};
