
import React, { useState, useRef, useEffect } from 'react';
import { SortingResult, CollectionPoint } from '../types';
import { BIN_MAPPING } from '../constants';
import { MapView } from './MapView';
import { AdBanner } from './AdBanner';
import { findNearbyPoints } from '../services/geminiService';

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
  const [activePointIdx, setActivePointIdx] = useState(0);
  const [localPoints, setLocalPoints] = useState<CollectionPoint[]>(result.nearbyPoints || []);
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  // Synchronisation initiale
  useEffect(() => {
    if (result.nearbyPoints) {
      setLocalPoints(result.nearbyPoints);
    }
  }, [result.nearbyPoints]);

  // Si la position arrive enfin et qu'on n'a pas encore de points, on lance la recherche
  useEffect(() => {
    if (userLocation && localPoints.length === 0 && !isSearchingLocal) {
      handleSearchInArea(userLocation.lat, userLocation.lng);
    }
  }, [userLocation]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [result.itemName]);

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

  const handleSearchInArea = async (lat: number, lng: number) => {
    setIsSearchingLocal(true);
    try {
      const newPoints = await findNearbyPoints(result.bin, result.itemName, lat, lng);
      if (newPoints && newPoints.length > 0) {
        setLocalPoints(prev => {
          const combined = [...newPoints, ...prev];
          const unique = combined.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
          return unique.slice(0, 8);
        });
        setActivePointIdx(0);
      }
    } catch (err) {
      console.error("Erreur recherche zone:", err);
    } finally {
      setIsSearchingLocal(false);
    }
  };

  return (
    <div className="animate-in pb-12">
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
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Points de collecte à proximité 📍</h3>
          
          {!userLocation ? (
            <button 
              onClick={onRequestLocation} 
              disabled={isLocating}
              className="w-full bg-slate-50 p-8 rounded-[2.5rem] text-sm font-bold text-slate-500 border border-dashed border-slate-200 hover:bg-slate-100 transition-colors flex flex-col items-center gap-3 active:bg-slate-200"
            >
              {isLocating ? (
                <>
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="animate-pulse">Autorisation GPS en cours...</span>
                </>
              ) : (
                <>
                  <span className="text-3xl">📍</span>
                  <span>Cliquer pour voir les bornes autour de vous</span>
                </>
              )}
            </button>
          ) : (
            <div className="space-y-6">
              <MapView 
                points={localPoints} 
                userLocation={userLocation} 
                activeIndex={activePointIdx}
                onSearchArea={handleSearchInArea}
                isSearching={isSearchingLocal}
              />
              
              {localPoints && localPoints.length > 0 ? (
                <>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {localPoints.map((p, i) => (
                      <button 
                        key={i} 
                        onClick={() => setActivePointIdx(i)} 
                        className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${i === activePointIdx ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                      >
                        {p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name}
                      </button>
                    ))}
                  </div>
                  {localPoints[activePointIdx]?.uri && (
                    <a 
                      href={localPoints[activePointIdx].uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-center text-xs font-black text-emerald-600 uppercase tracking-widest py-4 bg-emerald-50 rounded-2xl active:bg-emerald-100 transition-colors"
                    >
                      Ouvrir dans Google Maps ↗
                    </a>
                  )}
                </>
              ) : (
                <div className="bg-slate-50 p-8 rounded-[2.5rem] text-center border border-slate-100">
                   <p className="text-slate-400 text-xs font-bold italic">Recherche de points spécifiques en cours...</p>
                </div>
              )}
            </div>
          )}
        </section>

        <button onClick={onReset} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg active:scale-95 transition-all shadow-xl shadow-slate-200">Chercher autre chose</button>
      </div>
    </div>
  );
};
