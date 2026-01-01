import React, { useState } from 'react';
import { SortingResult } from './types';
import { BIN_MAPPING } from './constants';
import { MapView } from './MapView';

export const ResultCard: React.FC<{ result: SortingResult, userLocation?: any, onReset: () => void }> = ({ result, userLocation, onReset }) => {
  const binInfo = BIN_MAPPING[result.bin] || BIN_MAPPING['GRIS'];
  const [activePoint, setActivePoint] = useState(0);

  return (
    <div className="animate-slide-up">
      {/* Hero Result */}
      <div className={`${binInfo.color} p-10 text-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <span className="text-9xl font-black">♻️</span>
        </div>
        
        {result.imageUrl ? (
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-[2rem] shadow-2xl">
              <img src={result.imageUrl} alt={result.itemName} className="w-32 h-32 object-contain" />
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 bg-white/20 rounded-[2rem] mx-auto mb-6 animate-pulse" />
        )}

        <h2 className={`text-4xl font-black capitalize mb-3 ${binInfo.text}`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-2 bg-white px-6 py-2 rounded-full shadow-lg">
          <span className="w-3 h-3 rounded-full animate-pulse bg-current" style={{ color: binInfo.color.replace('bg-', '') }}></span>
          <span className="font-black text-slate-800 text-sm uppercase tracking-wider">{binInfo.label}</span>
        </div>
      </div>

      <div className="p-8 space-y-8 bg-white -mt-6 rounded-t-[3rem] relative z-10">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Consigne de tri</h3>
          </div>
          <p className="text-slate-800 font-bold text-lg leading-snug">{result.explanation}</p>
        </section>

        {result.tips && result.tips.length > 0 && (
          <section className="bg-slate-50 p-6 rounded-3xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conseils d'expert</h3>
            <ul className="space-y-3">
              {result.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-3 text-sm font-bold text-slate-600">
                  <span className="text-emerald-600">✓</span> {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.zeroWasteAlternative && (
          <section className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🌱</span>
              <h3 className="text-sm font-black uppercase tracking-widest">Alternative Durable</h3>
            </div>
            <p className="font-bold text-lg mb-6 opacity-90">{result.zeroWasteAlternative}</p>
            <button className="w-full bg-white text-emerald-700 py-4 rounded-2xl font-black text-sm shadow-inner hover:bg-emerald-50 transition-colors">
              🛍️ Découvrir l'alternative
            </button>
          </section>
        )}

        {result.nearbyPoints && result.nearbyPoints.length > 0 && userLocation && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Points de collecte</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">À proximité</span>
            </div>
            
            <MapView points={[result.nearbyPoints[activePoint]]} userLocation={userLocation} />
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {result.nearbyPoints.map((p, i) => (
                <button 
                  key={i} 
                  onClick={() => setActivePoint(i)} 
                  className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black border-2 transition-all shadow-sm ${i === activePoint ? 'bg-emerald-600 border-emerald-600 text-white translate-y-[-2px]' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {p.name.length > 18 ? p.name.slice(0, 15) + '...' : p.name}
                </button>
              ))}
            </div>
            
            <a 
              href={result.nearbyPoints[activePoint].uri} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl"
            >
              <span>📍</span> Ouvrir dans Maps
            </a>
          </section>
        )}

        <button 
          onClick={onReset} 
          className="w-full border-2 border-slate-100 text-slate-400 py-5 rounded-3xl font-black text-lg hover:bg-slate-50 transition-colors"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  );
};