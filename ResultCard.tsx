import React, { useState } from 'react';
import { SortingResult } from './types';
import { BIN_MAPPING } from './constants';
import { MapView } from './MapView';

export const ResultCard: React.FC<{ result: SortingResult, userLocation?: any, onReset: () => void }> = ({ result, userLocation, onReset }) => {
  const binInfo = BIN_MAPPING[result.bin] || BIN_MAPPING['GRIS'];
  const [activePoint, setActivePoint] = useState(0);

  return (
    <div className="animate-in pb-12">
      {/* Hero Result Section */}
      <div className={`${binInfo.color} p-12 text-center relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none text-9xl">♻️</div>
        
        <div className="mb-8 flex justify-center">
          {result.imageUrl ? (
            <div className="p-5 bg-white/30 backdrop-blur-lg rounded-[3rem] shadow-2xl ring-1 ring-white/50">
              <img src={result.imageUrl} alt={result.itemName} className="w-32 h-32 object-contain" />
            </div>
          ) : (
            <div className="w-32 h-32 bg-white/20 rounded-[3rem] animate-pulse" />
          )}
        </div>

        <h2 className={`text-4xl font-[900] capitalize mb-4 ${binInfo.text} tracking-tight`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-3 bg-white px-8 py-3 rounded-full shadow-xl">
          <div className={`w-3 h-3 rounded-full ${binInfo.color} animate-pulse`}></div>
          <span className="font-black text-slate-800 text-sm uppercase tracking-widest">{binInfo.label}</span>
        </div>
      </div>

      {/* Content Details */}
      <div className="bg-white -mt-8 rounded-t-[3.5rem] p-10 space-y-10 relative z-10 shadow-2xl">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pourquoi ce bac ?</h3>
          </div>
          <p className="text-slate-800 font-bold text-xl leading-snug">{result.explanation}</p>
        </section>

        {result.tips.length > 0 && (
          <section className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conseils de tri</h3>
            <ul className="space-y-4">
              {result.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-4 text-slate-600 font-bold text-sm">
                  <span className="text-emerald-500">✔</span> {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {result.zeroWasteAlternative && (
          <section className="bg-emerald-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🌱</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-100">L'alternative Green</h3>
            </div>
            <p className="font-bold text-xl mb-6 leading-tight">{result.zeroWasteAlternative}</p>
            <button className="w-full bg-white text-emerald-700 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">
              Passer au zéro déchet
            </button>
          </section>
        )}

        {result.nearbyPoints && result.nearbyPoints.length > 0 && userLocation && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Points de collecte</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-black text-emerald-600 uppercase">Proche de vous</span>
              </div>
            </div>
            
            <MapView points={[result.nearbyPoints[activePoint]]} userLocation={userLocation} />
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {result.nearbyPoints.map((p, i) => (
                <button 
                  key={i} 
                  onClick={() => setActivePoint(i)} 
                  className={`flex-shrink-0 px-6 py-4 rounded-2xl text-[10px] font-black border-2 transition-all shadow-sm ${i === activePoint ? 'bg-slate-900 border-slate-900 text-white translate-y-[-4px]' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name}
                </button>
              ))}
            </div>
            
            <a 
              href={result.nearbyPoints[activePoint].uri} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-3 bg-emerald-50 text-emerald-700 py-5 rounded-2xl font-black text-sm active:scale-95 transition-all"
            >
              <span>📍</span> Itinéraire Google Maps
            </a>
          </section>
        )}

        <button 
          onClick={onReset} 
          className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all"
        >
          Analyser un autre objet
        </button>
      </div>
    </div>
  );
};