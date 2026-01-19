import React, { useState, useRef, useEffect } from 'react';
import { SortingResult } from '../types';
import { BIN_MAPPING } from '../constants';
import { MapView } from './MapView';
import { AdBanner } from './AdBanner';

interface ResultCardProps {
  result: SortingResult;
  userLocation?: any;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [result.itemName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatting]);

  return (
    <div className="animate-in pb-12">
      <div className={`${binInfo.color} p-12 text-center transition-colors duration-500 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden">
           <div className="text-[20rem] font-black absolute -bottom-20 -right-20 rotate-12">{binInfo.icon}</div>
        </div>
        
        <div className="mb-6 flex justify-center relative z-10">
          {result.imageUrl ? (
            <div className="p-4 bg-white/40 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/50 animate-in fade-in zoom-in duration-500">
              <img src={result.imageUrl} alt={result.itemName} className="w-28 h-28 object-contain drop-shadow-lg" />
            </div>
          ) : (
            <div className="w-28 h-28 bg-white/30 backdrop-blur-xl rounded-[3rem] flex items-center justify-center text-4xl shadow-xl border border-white/40 animate-pulse">
              {binInfo.icon}
            </div>
          )}
        </div>
        
        <h2 className={`text-4xl font-[900] capitalize mb-4 ${binInfo.text} drop-shadow-sm`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-2 bg-white px-8 py-3 rounded-full shadow-2xl border border-slate-100">
          <span className="font-black text-slate-900 text-[11px] uppercase tracking-[0.2em]">{binInfo.label}</span>
        </div>
      </div>

      <div className="bg-white -mt-10 rounded-t-[3.5rem] p-8 space-y-10 relative z-10 shadow-2xl border-t border-slate-50">
        <section className="space-y-3">
          <h3 className="text-[11px] font-[900] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Conseil de tri
          </h3>
          <p className="text-slate-900 font-bold text-xl leading-snug tracking-tight">{result.explanation}</p>
        </section>

        {result.impact && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100 text-center group hover:bg-emerald-100 transition-colors">
              <span className="block text-2xl mb-2 group-hover:scale-110 transition-transform">☁️</span>
              <span className="text-[11px] font-black text-emerald-700 leading-tight">-{result.impact.co2Saved}g CO2</span>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100 text-center group hover:bg-blue-100 transition-colors">
              <span className="block text-2xl mb-2 group-hover:scale-110 transition-transform">💧</span>
              <span className="text-[11px] font-black text-blue-700 leading-tight">{result.impact.waterSaved}L Eau</span>
            </div>
            <div className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100 text-center group hover:bg-amber-100 transition-colors">
              <span className="block text-2xl mb-2 group-hover:scale-110 transition-transform">⚡</span>
              <span className="text-[9px] font-black text-amber-700 leading-tight">{result.impact.energySaved}</span>
            </div>
          </div>
        )}

        <section className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
               <span className="animate-bounce">💬</span> EcoCoach IA
             </h3>
             {isChatting && <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-4 no-scrollbar pr-1">
            {chatMessages.length === 0 && !isChatting && (
              <p className="text-[11px] text-slate-400 italic font-medium">Des doutes ? Demandez-moi comment réutiliser cet objet !</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-[13px] font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
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
              placeholder="Une précision ?" 
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-5 pr-20 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" 
            />
            <button 
              type="submit" 
              disabled={isChatting || !chatInput.trim()}
              className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              OK
            </button>
          </form>
        </section>

        <AdBanner />

        <section className="space-y-5">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="text-lg">📍</span> Points de collecte
          </h3>
          {!userLocation ? (
            <button 
              onClick={onRequestLocation} 
              disabled={isLocating} 
              className="w-full bg-slate-50 hover:bg-emerald-50 p-8 rounded-[3rem] text-sm font-black text-slate-600 border-2 border-dashed border-slate-200 hover:border-emerald-300 transition-all group"
            >
              {isLocating ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  Localisation...
                </span>
              ) : (
                <span className="group-hover:text-emerald-700">Afficher les bornes autour de moi</span>
              )}
            </button>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-500">
              <MapView points={result.nearbyPoints || []} userLocation={userLocation} />
              {(!result.nearbyPoints || result.nearbyPoints.length === 0) && (
                <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-bold animate-pulse">Recherche des bornes les plus proches...</p>
                </div>
              )}
            </div>
          )}
        </section>

        <button 
          onClick={onReset} 
          className="w-full bg-slate-900 text-white py-6 rounded-[3rem] font-black text-lg shadow-2xl hover:bg-emerald-700 transition-all active:scale-[0.98] transform"
        >
          Nouveau Scan
        </button>
      </div>
    </div>
  );
};