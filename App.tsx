import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Layout';
import { ResultCard } from './ResultCard';
import { AdBanner } from './AdBanner';
import { ApiKeyGuard } from './ApiKeyGuard';
import { analyzeWaste, generateWasteImage, findNearbyPoints } from './geminiService';
import { SortingResult } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SortingResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [barcodeMode, setBarcodeMode] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        err => console.warn("Localisation inactive.")
      );
    }
  }, []);

  const handleProcess = async (input: any, isBarcode: boolean = false) => {
    const dataToProcess = typeof input === 'string' ? input.trim() : input;
    if (!dataToProcess) return;

    setIsAnalyzing(true);
    try {
      const res = await analyzeWaste(dataToProcess, isBarcode);
      if (res) {
        setResult(res);
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        alert("Objet non identifié. Essayez une recherche plus précise.");
      }
    } catch (error) {
      console.error(error);
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        handleProcess({ data: base64, mimeType: file.type }, barcodeMode);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <ApiKeyGuard>
      <Layout>
        {!result ? (
          <div className="flex flex-col min-h-[75vh] animate-in">
            {/* Hero Section */}
            <div className="px-8 pt-12 pb-8 text-center">
              <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-emerald-100 mb-8 animate-float">
                <span className="text-5xl">♻️</span>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-[1.1] mb-4">
                Trier vos déchets<br/>
                <span className="text-emerald-600">devient facile.</span>
              </h1>
              <p className="text-slate-500 font-medium px-4 text-sm leading-relaxed">
                Utilisez la recherche ou votre appareil photo pour trier sans erreur.
              </p>
            </div>

            {/* Publicité accueil (Banner) */}
            <div className="px-6 mb-6">
               <AdBanner adSlot="AD_SLOT_HOME" />
            </div>

            {/* Action Center */}
            <div className="px-6 space-y-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                  placeholder="Ex: Capsule de café, carton..." 
                  className="relative w-full bg-white rounded-[2rem] py-6 px-8 text-lg font-bold shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300" 
                />
                <button 
                  onClick={() => handleProcess(query)}
                  className="absolute right-3 top-3 bottom-3 bg-emerald-600 text-white px-8 rounded-[1.5rem] font-black text-sm active:scale-95 transition-all shadow-lg shadow-emerald-100"
                >
                  Go
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setBarcodeMode(false); fileInput.current?.click(); }}
                  className="bg-white hover:bg-emerald-50 p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-slate-100 hover:border-emerald-200 transition-all group active:scale-95 shadow-sm"
                >
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📸</div>
                  <span className="font-bold text-slate-700">Photo</span>
                </button>
                <button 
                  onClick={() => { setBarcodeMode(true); fileInput.current?.click(); }}
                  className="bg-white hover:bg-slate-50 p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-slate-100 hover:border-slate-300 transition-all group active:scale-95 shadow-sm"
                >
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform text-white">🏷️</div>
                  <span className="font-bold text-slate-700">Scan Code</span>
                </button>
              </div>
              <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={onFileChange} />
            </div>

            <div className="mt-12 px-10 pb-12">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Suggestions</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {['Bouteille lait', 'Pile', 'Ampoule', 'Yaourt'].map(tag => (
                  <button key={tag} onClick={() => handleProcess(tag)} className="px-5 py-2.5 bg-white rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100 hover:text-emerald-600 hover:border-emerald-200 transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ResultCard result={result} userLocation={location} onReset={() => { setResult(null); setQuery(''); }} />
        )}

        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="relative w-40 h-40 mb-10">
              <div className="absolute inset-0 border-[6px] border-slate-100 rounded-[3rem]"></div>
              <div className="absolute inset-0 border-[6px] border-emerald-500 rounded-[3rem] animate-pulse"></div>
              <div className="scanning-line"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl">🔍</div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Analyse intelligente...</h2>
            <p className="text-slate-400 font-bold max-w-[240px]">Identification via Gemini 3 Pro...</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}