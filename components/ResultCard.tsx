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
    window.scrollTo(0, 0);
  }, [result.itemName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatting]);

  const googleMapsUrl = `https://www.google.com/maps/search/collecte+tri+${encodeURIComponent(result.itemName)}+${result.bin.toLowerCase()}/@${userLocation?.lat},${userLocation?.lng},14z`;

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Header avec la couleur du bac */}
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
        <div className="inline-flex items-center gap-2 bg-white px-8 py-2.5 rounded-full shadow-lg border border-slate-100">
          <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{binInfo.label}</span>
        </div>
      </div>

      <div className="bg-white -mt-8 rounded-t-[3rem] p-8 space-y-10 relative z-10 shadow-xl">
        {/* Consigne principale */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Consigne 2026
          </h3>
          <p className="text-slate-900 font-bold text-xl leading-snug">{result.explanation}</p>
        </section>

        {/* Impact Écologique */}
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

        {/* Section Où Jeter ? (Recherche de points) */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              📍 Points de Collecte
            </h3>
            {userLocation && (
               <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-emerald-600 uppercase border-b border-emerald-200 pb-0.5">
                  Ouvrir Google Maps
               </a>
            )}
          </div>

          {!userLocation ? (
            <button 
              onClick={onRequestLocation} 
              disabled={isLocating}
              className="w-full bg-emerald-50 text-emerald-700 p-8 rounded-[2.5rem] border-2 border-dashed border-emerald-200 flex flex-col items-center gap-3 transition-all active:scale-95"
            >
              <span className="text-3xl">🔍</span>
              <div className="text-center">
                <span className="block font-black text-sm uppercase tracking-wider">{isLocating ? "Localisation..." : "Trouver un point proche"}</span>
                <span className="text-[10px] font-bold opacity-70">Rechercher les déchetteries et bornes</span>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <MapView points={result.nearbyPoints || []} userLocation={userLocation} />
              
              {result.nearbyPoints && result.nearbyPoints.length > 0 ? (
                <div className="grid gap-3">
                  {result.nearbyPoints.map((point, idx) => (
                    <a 
                      key={idx} 
                      href={point.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-slate-800 line-clamp-1">{point.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Site Web / Itinéraire</span>
                      </div>
                      <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">➡️</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl text-center border border-slate-100">
                  <p className="text-xs font-bold text-slate-500">Aucun point spécifique trouvé par l'IA. Essayez Google Maps.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* EcoCoach IA */}
        <section className="bg-slate-900 p-7 rounded-[2.5rem] border border-slate-800 space-y-5 shadow-2xl">
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">💬 EcoCoach Pro 2026</h3>
          
          <div className="max-h-60 overflow-y-auto space-y-4 no-scrollbar pr-1">
            <div className="flex justify-start">
               <div className="max-w-[90%] p-4 rounded-2xl text-xs font-bold bg-white/10 text-emerald-50 border border-white/10">
                  Besoin d'aide pour réduire ce déchet ? Posez-moi vos questions !
               </div>
            </div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-emerald-50 border border-white/10'}`}>
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
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-5 pl-6 pr-20 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-colors" 
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-emerald-500 text-slate-900 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform">Envoyer</button>
          </form>
        </section>

        <AdBanner />

        <div className="flex flex-col gap-3">
          <button 
            onClick={onReset} 
            className="w-full bg-slate-100 text-slate-900 py-6 rounded-[2.5rem] font-black text-lg hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
          >
            Nouveau Scan
          </button>
          <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">SnapSort Intelligence • v2026.1</p>
        </div>
      </div>
    </div>
  );
};
