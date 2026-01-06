
import React, { useState, useRef, useEffect } from 'react';
import { SortingResult } from '../types';
import { BIN_MAPPING } from '../constants';
import { MapView } from './MapView';
import { AdBanner } from './AdBanner';

interface ResultCardProps {
  result: SortingResult;
  userLocation?: any;
  isLocating?: boolean;
  onReset: () => void;
  onAskQuestion: (q: string) => void;
  onRequestLocation: () => void;
  chatMessages: {role: 'user' | 'model', text: string}[];
  isChatting: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  result, 
  userLocation, 
  isLocating, 
  onReset, 
  onAskQuestion,
  onRequestLocation,
  chatMessages,
  isChatting
}) => {
  const binInfo = BIN_MAPPING[result.bin] || BIN_MAPPING['GRIS'];
  const [activePoint, setActivePoint] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Forcer le retour en haut de page à l'apparition du résultat
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [result.itemName]);

  // Gérer le scroll du chat uniquement après le premier rendu
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isChatting]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;
    onAskQuestion(chatInput);
    setChatInput('');
  };

  return (
    <div className="animate-in pb-12">
      {/* SECTION DU BAC - Doit être visible immédiatement */}
      <div className={`${binInfo.color} p-12 text-center relative overflow-hidden transition-colors duration-500 min-h-[300px] flex flex-col items-center justify-center`}>
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none text-9xl">♻️</div>
        <div className="mb-6 flex justify-center">
          {result.imageUrl ? (
            <div className="p-5 bg-white/40 backdrop-blur-xl rounded-[3rem] shadow-2xl ring-1 ring-white/50 animate-float">
              <img src={result.imageUrl} alt={result.itemName} className="w-28 h-28 object-contain" />
            </div>
          ) : (
            <div className="w-28 h-28 bg-white/20 rounded-[3rem] flex items-center justify-center text-4xl shadow-inner">📦</div>
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
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full"></span> Consigne de tri
            </h3>
          </div>
          <p className="text-slate-800 font-bold text-xl leading-snug">{result.explanation}</p>
        </section>

        {/* ECO COACH CHAT - Scroll géré pour ne pas voler le focus au début */}
        <section className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-sm">🌱</div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Discussion avec l'EcoCoach</h3>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3 no-scrollbar py-2">
            {chatMessages.length === 0 && (
              <p className="text-slate-400 text-[11px] italic text-center py-4">
                Posez-moi une question sur le recyclage de cet objet !
              </p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-3xl rounded-tl-none flex gap-1 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="relative mt-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Questionner l'EcoCoach..."
              disabled={isChatting}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-5 pr-12 text-sm font-bold focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim() || isChatting}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-600 text-white rounded-xl flex items-center justify-center active:scale-90 disabled:opacity-30"
            >
              🚀
            </button>
          </form>
          
          {result.suggestedQuestions && chatMessages.length === 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {result.suggestedQuestions.map((q, i) => (
                <button 
                  key={i}
                  onClick={() => onAskQuestion(q)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </section>

        {result.impact && (
          <section className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Votre impact écologique</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl mb-1">☁️</span>
                <span className="text-sm font-bold text-emerald-600">-{result.impact.co2Saved}g CO2</span>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl mb-1">💧</span>
                <span className="text-sm font-bold text-emerald-600">{result.impact.waterSaved}L Eau</span>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl mb-1">⚡</span>
                <span className="text-[9px] font-bold text-emerald-600 leading-tight">{result.impact.energySaved}</span>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Point de collecte 📍</h3>
          {!userLocation ? (
            <button onClick={onRequestLocation} className="w-full bg-slate-50 p-8 rounded-[2.5rem] text-sm font-bold text-slate-500 border border-dashed border-slate-200">
              📍 Activer la localisation pour voir les bornes
            </button>
          ) : isLocating ? (
            <div className="p-12 text-center animate-pulse text-xs font-black text-slate-300">RECHERCHE...</div>
          ) : result.nearbyPoints && result.nearbyPoints.length > 0 ? (
            <div className="space-y-6">
              <MapView points={[result.nearbyPoints[activePoint]]} userLocation={userLocation} />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {result.nearbyPoints.map((p, i) => (
                  <button key={i} onClick={() => setActivePoint(i)} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${i === activePoint ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                    {p.name.length > 18 ? p.name.slice(0, 15) + '...' : p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 text-xs font-bold">Aucun point spécifique trouvé à proximité.</p>
          )}
        </section>

        <button onClick={onReset} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg active:scale-95 transition-all">Chercher autre chose</button>
      </div>
    </div>
  );
};
