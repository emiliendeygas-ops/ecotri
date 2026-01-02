
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Layout';
import { ResultCard } from './ResultCard';
import { ApiKeyGuard } from './ApiKeyGuard';
import { analyzeWaste, generateWasteImage, findNearbyPoints } from './geminiService';
import { SortingResult } from './types';

const SUGGESTIONS = [
  { label: 'Capsule Café', icon: '☕️' },
  { label: 'Pot de Yaourt', icon: '🍧' },
  { label: 'Piles', icon: '🔋' },
  { label: 'Carton Amazon', icon: '📦' },
  { label: 'Bouteille Lait', icon: '🧴' },
  { label: 'Vêtements', icon: '👕' }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SortingResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        err => console.warn("Localisation non disponible")
      );
    }
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  const handleProcess = async (input: string) => {
    const text = input.trim();
    if (!text || text.length < 2) return;

    setError(null);
    setIsAnalyzing(true);
    try {
      const res = await analyzeWaste(text);
      if (res) {
        setResult(res);
        // On lance les enrichissements en arrière-plan
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        throw new Error("L'IA n'a pas pu identifier l'objet. Soyez plus précis.");
      }
    } catch (err: any) {
      console.error("Process error:", err);
      
      if (err.message === "API_KEY_INVALID") {
        setError("Votre clé API semble invalide ou absente.");
        // @ts-ignore
        if (window.aistudio) {
           // On propose de re-sélectionner si on est dans le bridge
           // @ts-ignore
           window.aistudio.openSelectKey();
        }
      } else {
        setError("Désolé, une erreur est survenue lors de l'analyse.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ApiKeyGuard>
      <Layout>
        {!result ? (
          <div className="flex flex-col min-h-[75vh] animate-in">
            <div className="px-8 pt-16 pb-8 text-center">
              <div className="inline-block p-5 bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-100 mb-8 animate-float border border-emerald-50">
                <span className="text-6xl">♻️</span>
              </div>
              <h1 className="text-5xl font-[900] text-slate-900 tracking-tighter leading-none mb-6">
                Un doute sur<br/>
                <span className="text-emerald-600">votre déchet ?</span>
              </h1>
            </div>

            <div className="px-6 max-w-xl mx-auto w-full space-y-8">
              <div className="relative group">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                  placeholder="Ex: Capsule café..." 
                  className="w-full bg-white rounded-[3rem] py-10 pl-12 pr-44 text-2xl font-bold shadow-2xl shadow-slate-200/60 border-2 border-transparent focus:border-emerald-500/20 outline-none transition-all placeholder:text-slate-200" 
                />
                <button 
                  onClick={() => handleProcess(query)}
                  disabled={isAnalyzing || query.length < 2}
                  className="absolute right-5 top-5 bottom-5 bg-emerald-600 text-white px-10 rounded-[2rem] font-black text-sm uppercase active:scale-95 transition-all shadow-xl disabled:bg-slate-100 disabled:text-slate-300"
                >
                  Trier
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold text-sm animate-in border border-red-100">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => { setQuery(s.label); handleProcess(s.label); }}
                    className="flex items-center gap-2 bg-white border border-slate-100 px-6 py-4 rounded-2xl text-xs font-black text-slate-500 hover:border-emerald-400 transition-all shadow-sm"
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ResultCard 
            result={result} 
            userLocation={location} 
            onReset={() => { 
              setResult(null); 
              setError(null); 
              setQuery(''); 
              setTimeout(() => inputRef.current?.focus(), 100); 
            }} 
          />
        )}

        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="relative w-24 h-24 mb-10">
               <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Analyse IA...</h2>
            <p className="text-slate-400 font-medium">Recherche des consignes de tri 2025</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
