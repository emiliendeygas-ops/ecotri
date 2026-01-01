import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Layout';
import { ResultCard } from './ResultCard';
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
        err => console.warn("Localisation indisponible.")
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
        // Enrichissement asynchrone
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        alert("Nous n'avons pas pu identifier cet objet. Essayez un nom plus simple.");
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
    <Layout>
      {!result ? (
        <div className="flex flex-col min-h-[80vh] animate-in">
          {/* Header Hero */}
          <div className="px-8 pt-16 pb-10 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200 mb-6 rotate-3">
              <span className="text-4xl">♻️</span>
            </div>
            <h1 className="text-4xl font-[800] text-slate-900 tracking-tight leading-[1.1]">
              Trier n'a jamais été<br/>
              <span className="text-emerald-600">aussi simple.</span>
            </h1>
            <p className="text-slate-500 font-medium px-4">
              Recherche textuelle, photo ou scan de code-barres. EcoTri s'occupe du reste.
            </p>
          </div>

          {/* Search & Actions */}
          <div className="px-6 space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
              <input 
                type="text" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                placeholder="Ex: Pot de yaourt, pile, ampoule..." 
                className="relative w-full bg-white rounded-[2rem] py-6 px-8 text-lg font-bold shadow-xl border-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300" 
              />
              <button 
                onClick={() => handleProcess(query)}
                className="absolute right-3 top-3 bottom-3 bg-slate-900 text-white px-8 rounded-[1.5rem] font-bold text-sm active:scale-95 transition-all"
              >
                Go
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setBarcodeMode(false); fileInput.current?.click(); }}
                className="bg-emerald-50 hover:bg-emerald-100 p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-emerald-100 transition-all group active:scale-95"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">📸</span>
                <span className="font-bold text-emerald-800">Prendre Photo</span>
              </button>
              <button 
                onClick={() => { setBarcodeMode(true); fileInput.current?.click(); }}
                className="bg-slate-900 hover:bg-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center gap-3 transition-all group active:scale-95"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">🏷️</span>
                <span className="font-bold text-white">Scanner Code</span>
              </button>
            </div>
            <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={onFileChange} />
          </div>

          {/* Tips Section */}
          <div className="mt-12 px-8 pb-10">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Recherches populaires</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {['Bouteille eau', 'Carton', 'Capsule Nespresso', 'Piles'].map(tag => (
                <button key={tag} onClick={() => handleProcess(tag)} className="px-5 py-2.5 bg-white rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-100 hover:border-emerald-300 transition-colors">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ResultCard result={result} userLocation={location} onReset={() => { setResult(null); setQuery(''); }} />
      )}

      {/* Modern Loader */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 text-center">
          <div className="relative w-48 h-48 mb-8">
            <div className="absolute inset-0 border-[6px] border-slate-100 rounded-[3rem]"></div>
            <div className="absolute inset-0 border-[6px] border-emerald-500 rounded-[3rem] animate-pulse"></div>
            <div className="scanning-line"></div>
            <div className="absolute inset-0 flex items-center justify-center text-5xl">🔍</div>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Analyse en cours...</h2>
          <p className="text-slate-400 font-medium max-w-[240px]">Identification de l'objet et récupération des consignes locales.</p>
        </div>
      )}
    </Layout>
  );
}