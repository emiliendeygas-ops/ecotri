
import React, { useState, useRef, useEffect } from 'react';
import { SortingResult, CollectionPoint } from '../types';
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
        <div className="mb-6 flex justify-center">
          {result.imageUrl ? (
            <div className="p-4 bg-white/30 backdrop-blur-xl rounded-[2.5rem] shadow-xl animate-in">
              <img src={result.imageUrl} alt={result.itemName} className="w-24 h-24 object-contain" />
            </div>
          ) : (
            <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center text-3xl animate-pulse">📦</div>
          )}
        </div>
        <h2 className={`text-3xl font-black capitalize mb-4 ${binInfo.text}`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-2 bg-white px-6 py-2 rounded-full shadow-lg">
          <span className="font-black text-slate-800 text-[10px] uppercase tracking-widest">{binInfo.label}</span>
        </div>
      </div>

      <div className="bg-white -mt-8 rounded-t-[3rem] p-8 space-y-8 relative z-10 shadow-xl">
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conseil de Tri</h3>
          <p className="text-slate-800 font-bold text-lg leading-snug">{result.explanation}</p>
        </section>

        <section className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><span>💬</span> EcoCoach IA</h3>
          <div className="max-h-48 overflow-y-auto space-y-3 no-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-bold ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-100 text-slate-700'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatting && <div className="text-[10px] font-bold text-emerald-500 animate-pulse">L'EcoCoach réfléchit...</div>}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onAskQuestion(chatInput); setChatInput(''); }} className="relative">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Une question ?" className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-emerald-500" />
            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-3 rounded-lg text-[10px] font-black">ENVOYER</button>
          </form>
        </section>

        {result.impact && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 p-4 rounded-2xl text-center">
              <span className="block text-xl mb-1">☁️</span>
              <span className="text-[10px] font-black text-emerald-600">-{result.impact.co2Saved}g CO2</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl text-center">
              <span className="block text-xl mb-1">💧</span>
              <span className="text-[10px] font-black text-emerald-600">{result.impact.waterSaved}L Eau</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl text-center">
              <span className="block text-xl mb-1">⚡</span>
              <span className="text-[8px] font-black text-emerald-600 leading-tight">{result.impact.energySaved}</span>
            </div>
          </div>
        )}

        <AdBanner />

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points de Collecte 📍</h3>
          {!userLocation ? (
            <button onClick={onRequestLocation} disabled={isLocating} className="w-full bg-slate-50 p-6 rounded-[2.5rem] text-xs font-bold text-slate-500 border-2 border-dashed border-slate-200">
              {isLocating ? "Localisation en cours..." : "Afficher les bornes autour de moi"}
            </button>
          ) : (
            <div className="space-y-4">
              <MapView points={result.nearbyPoints || []} userLocation={userLocation} />
              {(!result.nearbyPoints || result.nearbyPoints.length === 0) && <p className="text-[10px] text-slate-400 italic text-center">Recherche des bornes les plus proches...</p>}
            </div>
          )}
        </section>

        <button onClick={onReset} className="w-full bg-slate-900 text-white py-5 rounded-[2.5rem] font-black text-md shadow-xl">Nouvelle recherche</button>
      </div>
    </div>
  );
};
