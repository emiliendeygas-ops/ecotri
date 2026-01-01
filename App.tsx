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
        err => console.warn("Géolocalisation inactive.")
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
        alert("Objet non identifié. Essayez d'être plus précis (ex: 'Bouteille de lait').");
      }
    } catch (error) {
      console.error("App Error:", error);
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
        <div className="flex flex-col min-h-[70vh]">
          {/* Hero Section */}
          <div className="bg-gradient-to-b from-emerald-50 to-white px-8 pt-12 pb-6 text-center">
            <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-emerald-100 mb-6 animate-float">
              <span className="text-4xl">🌍</span>
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight mb-4">
              Le tri intelligent,<br/><span className="text-emerald-600">sans effort.</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm px-4">
              Scannez, photographiez ou tapez le nom d'un objet pour savoir instantanément où le jeter.
            </p>
          </div>

          {/* Interface Action */}
          <div className="flex-1 px-8 pb-12 space-y-6">
            <div className="relative group">
              <input 
                type="text" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                placeholder="Un déchet à trier ?" 
                className="w-full bg-white border-2 border-slate-100 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-3xl py-6 px-7 text-lg font-bold shadow-sm outline-none transition-all placeholder:text-slate-300" 
              />
              <button 
                onClick={() => handleProcess(query)} 
                className="absolute right-3 top-3 bottom-3 bg-emerald-600 text-white px-6 rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-lg shadow-emerald-200"
              >
                Go
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setBarcodeMode(false); fileInput.current?.click(); }}
                className="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-emerald-500 transition-all group active:scale-95 shadow-sm"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📸</div>
                <span className="font-black text-slate-700">Photo</span>
              </button>
              <button 
                onClick={() => { setBarcodeMode(true); fileInput.current?.click(); }}
                className="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] hover:border-emerald-500 transition-all group active:scale-95 shadow-sm"
              >
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏷️</div>
                <span className="font-black text-slate-700">Scanner</span>
              </button>
            </div>
            <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={onFileChange} />

            {/* Suggestions */}
            <div className="pt-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Suggestions fréquentes</h3>
              <div className="flex flex-wrap gap-2">
                {['Capsule café', 'Pile', 'Carton pizza', 'Ampoule'].map(item => (
                  <button key={item} onClick={() => handleProcess(item)} className="px-5 py-2.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ResultCard result={result} userLocation={location} onReset={() => { setResult(null); setQuery(''); }} />
      )}

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
          <div className="relative w-32 h-32 mb-8">
             <div className="absolute inset-0 border-4 border-slate-100 rounded-3xl"></div>
             <div className="absolute inset-0 border-4 border-emerald-600 rounded-3xl animate-pulse"></div>
             <div className="scan-line"></div>
             <div className="absolute inset-0 flex items-center justify-center text-4xl">🔍</div>
          </div>
          <h3 className="text-2xl font-black text-slate-800">Analyse EcoTri...</h3>
          <p className="text-slate-400 font-bold mt-2 max-w-xs">Nous identifions l'objet et ses consignes locales spécifiques.</p>
        </div>
      )}
    </Layout>
  );
}