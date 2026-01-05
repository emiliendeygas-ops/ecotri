
import React, { useState } from 'react';
import { SortingResult } from './types';
import { BIN_MAPPING } from './constants';
import { MapView } from './MapView';
import { AdBanner } from './AdBanner';

export const ResultCard: React.FC<{ result: SortingResult, userLocation?: any, onReset: () => void }> = ({ result, userLocation, onReset }) => {
  const binInfo = BIN_MAPPING[result.bin] || BIN_MAPPING['GRIS'];
  const [activePoint, setActivePoint] = useState(0);

  return (
    <div className="animate-in pb-12">
      <div className={`${binInfo.color} p-12 text-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none text-9xl">♻️</div>
        
        <div className="mb-8 flex justify-center">
          {result.imageUrl ? (
            <div className="p-5 bg-white/40 backdrop-blur-xl rounded-[3rem] shadow-2xl ring-1 ring-white/50 animate-float">
              <img src={result.imageUrl} alt={result.itemName} className="w-32 h-32 object-contain" />
            </div>
          ) : (
            <div className="w-32 h-32 bg-white/20 rounded-[3rem] animate-pulse flex items-center justify-center text-4xl">
              📦
            </div>
          )}
        </div>

        <h2 className={`text-4xl font-[900] capitalize mb-4 ${binInfo.text} tracking-tight`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-3 bg-white px-8 py-3 rounded-full shadow-xl">
          <div className={`w-3 h-3 rounded-full ${binInfo.color} animate-pulse`}></div>
          <span className="font-black text-slate-800 text-xs uppercase tracking-[0.2em]">{binInfo.label}</span>
        </div>
      </div>

      <div className="bg-white -mt-10 rounded-t-[4rem] p-8 space-y-10 relative z-10 shadow-2xl">
        <AdBanner adSlot="5112143646" /> 

        <section>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full"></span> Consigne de tri
          </h3>
          <p className="text-slate-800 font-bold text-xl leading-snug">{result.explanation}</p>
        </section>

        {result.tips.length > 0 && (
          <section className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conseils pratiques</h3>
            <ul className="space-y-3">
              {result.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-3 text-slate-600 font-bold text-sm">
                  <span className="text-emerald-500">✔</span> {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.nearbyPoints && result.nearbyPoints.length > 0 && userLocation && (
          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
              Points de collecte <span>📍</span>
            </h3>
            
            <MapView points={[result.nearbyPoints[activePoint]]} userLocation={userLocation} />
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {result.nearbyPoints.map((p, i) => (
                <button 
                  key={i} 
                  onClick={() => setActivePoint(i)} 
                  className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${i === activePoint ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {p.name.length > 18 ? p.name.slice(0, 15) + '...' : p.name}
                </button>
              ))}
            </div>
            <a href={result.nearbyPoints[activePoint].uri} target="_blank" rel="noopener noreferrer" className="block text-center bg-emerald-50 text-emerald-700 py-4 rounded-2xl font-black text-sm border border-emerald-100">
              Ouvrir dans Google Maps ↗
            </a>
          </section>
        )}

        <button 
          onClick={onReset} 
          className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg shadow-2xl active:scale-95 transition-all"
        >
          Chercher autre chose
        </button>
      </div>
    </div>
  );
};
