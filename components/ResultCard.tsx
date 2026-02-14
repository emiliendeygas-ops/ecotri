import React, { useState, useRef, useEffect } from 'react';
import { SortingResult, CollectionPoint } from '../types';
import { BIN_MAPPING } from '../constants';
import { MapView } from './MapView';
import { AdBanner } from './AdBanner';

interface ResultCardProps {
  result: SortingResult;
  userLocation?: { lat: number, lng: number } | null;
  isLocating: boolean;
  onReset: () => void;
  onAskQuestion: (q: string) => void;
  onRequestLocation: () => void;
  chatMessages: {role: 'user' | 'model', text: string}[];
  isChatting: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  result, userLocation, isLocating, onReset, onAskQuestion, onRequestLocation, chatMessages, isChatting
}) => {
  const binInfo = BIN_MAPPING[result.bin] || BIN_MAPPING['GRIS'];
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [result.itemName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatting]);

  const mapsQuery = encodeURIComponent(`point de collecte ${result.itemName} ${result.bin}`);
  const googleMapsUrl = userLocation 
    ? `https://www.google.com/maps/search/${mapsQuery}/@${userLocation.lat},${userLocation.lng},14z`
    : `https://www.google.com/maps/search/${mapsQuery}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className={`${binInfo.color} p-12 text-center relative overflow-hidden transition-colors`}>
        <div className="mb-6 flex justify-center relative z-10">
          {result.imageUrl ? (
            <div className="p-4 bg-white/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50">
              <img src={result.imageUrl} alt={result.itemName} className="w-24 h-24 object-contain drop-shadow-lg" />
            </div>
          ) : (
            <div className="w-24 h-24 bg-white/30 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-4xl shadow-xl border border-white/40">
              {binInfo.icon}
            </div>
          )}
        </div>
        
        <h2 className={`text-4xl font-[900] capitalize mb-4 ${binInfo.text} drop-shadow-sm`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-2 bg-white px-8 py-2.5 rounded-full shadow-lg">
          <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{binInfo.label}</span>
        </div>
      </div>

      <div className="bg-white -mt-8 rounded-t-[3rem] p-8 space-y-10 relative z-10 shadow-xl">
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Consigne 2026
          </h3>
          <p className="text-slate-900 font-bold text-xl leading-snug">{result.explanation}</p>
        </section>

        {result.impact && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 p-5 rounded-3xl text-center border border-emerald-100">
              <span className="block text-xl mb-1">☁️</span>
              <span className="text-[10px] font-black text-emerald-700">-{result.impact.co2Saved}g CO2</span>
            </div>
            <div className="bg-blue-50 p-5 rounded-3xl text-center border border-blue-100">
              <span className="block text-xl mb-1">💧</span>
              <span className="text-[10px] font-black text-blue-700">{result.impact.waterSaved}L Eau</span>
            </div>
            <div className="bg-amber-50 p-5 rounded-3xl text-center border border-amber-100">
              <span className="block text-xl mb-1">⚡</span>
              <span className="text-[9px] font-black text-amber-700">{result.impact.energySaved}</span>
            </div>
          </div>
        )}

        {/* SECTION RECHERCHE DE POINTS AMELIOREE */}
        <section className="space-y-6 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📍 Recherche de points</h3>
            {userLocation && (
               <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-emerald-600 uppercase border-b border-emerald-200">
                  Maps ↗
               </a>
            )}
          </div>

          {!userLocation ? (
            <button 
              onClick={onRequestLocation} 
              disabled={isLocating}
              className="w-full bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-lg shadow-emerald-200 flex flex-col items-center gap-3 active:scale-95 transition-all"
            >
              <span className="text-3xl">🔍</span>
              <div className="text-center">
                <span className="block font-black text-xs uppercase tracking-widest">{isLocating ? "Localisation..." : "Chercher autour de moi"}</span>
                <span className="text-[10px] font-bold opacity-80">Trouver déchetteries et bornes de tri</span>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <MapView points={result.nearbyPoints || []} userLocation={userLocation} />
              
              <div className="grid gap-3">
                {result.nearbyPoints && result.nearbyPoints.length > 0 ? (
                  result.nearbyPoints.map((p, i) => (
                    <a key={i} href={p.uri} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-300 group">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-emerald-700">{p.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Site Web / Itinéraire</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">→</div>
                    </a>
                  ))
                ) : (
                  <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucun point spécifique trouvé par l'IA</p>
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-emerald-600 font-black text-xs uppercase underline">Essayer Google Maps</a>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="bg-slate-900 p-7 rounded-[2.5rem] border border-slate-800 space-y-5">
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">💬 EcoCoach Pro</h3>
          <div className="max-h-48 overflow-y-auto space-y-4 no-scrollbar pr-1">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-bold ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-emerald-50 border border-white/5'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if(chatInput.trim()){ onAskQuestion(chatInput); setChatInput(''); } }} className="relative">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              placeholder="Question sur le tri ?" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-20 text-xs font-bold text-white outline-none focus:border-emerald-500" 
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-emerald-500 text-slate-900 px-6 rounded-xl text-[9px] font-black uppercase">OK</button>
          </form>
        </section>

        <AdBanner />

        <button onClick={onReset} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg shadow-xl active:scale-95 transition-transform">
          Nouveau Scan
        </button>
      </div>
    </div>
  );
};
