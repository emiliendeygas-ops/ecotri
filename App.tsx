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
        err => console.warn("Géolocalisation non disponible:", err)
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
        // Tâches de fond
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        alert("Désolé, nous n'avons pas pu identifier cet objet. Essayez d'être plus précis.");
      }
    } catch (error) {
      console.error("Traitement error:", error);
      alert("Erreur de connexion avec l'IA. Vérifiez votre clé API.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  return (
    <Layout>
      {!result ? (
        <div className="p-8 space-y-10 animate-slide-up">
          <div className="text-center space-y-3 mt-4">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">EcoTri 🌍</h2>
            <p className="text-slate-500 font-bold">Le tri intelligent à portée de main.</p>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <input 
                type="text" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                placeholder="Ex: Pot de yaourt, pile, carton..." 
                className="w-full bg-white border-2 border-slate-100 focus:border-emerald-500 rounded-3xl py-5 px-6 text-lg font-bold shadow-sm outline-none transition-all" 
              />
              <button 
                type="button"
                onClick={() => handleProcess(query)} 
                className="absolute right-3 top-3 bottom-3 bg-emerald-600 text-white px-5 rounded-2xl font-black active:scale-95 transition-transform"
              >
                Go
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setBarcodeMode(false); fileInput.current?.click(); }} className="bg-emerald-50 p-6 rounded-3xl flex flex-col items-center gap-2 border-2 border-emerald-100 font-black text-emerald-700 hover:bg-emerald-100 transition-colors">
                <span className="text-2xl">📸</span> Photo
              </button>
              <button onClick={() => { setBarcodeMode(true); fileInput.current?.click(); }} className="bg-indigo-50 p-6 rounded-3xl flex flex-col items-center gap-2 border-2 border-indigo-100 font-black text-indigo-700 hover:bg-indigo-100 transition-colors">
                <span className="text-2xl">🏷️</span> Code-barres
              </button>
            </div>
            <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={(e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const reader = new FileReader();
                 reader.onload = () => {
                   const base64 = (reader.result as string).split(',')[1];
                   handleProcess({ data: base64, mimeType: file.type }, barcodeMode);
                 };
                 reader.readAsDataURL(file);
               }
            }} />
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-black text-lg mb-1 text-white">Impact Zéro Déchet</h3>
                <p className="text-xs opacity-90 font-bold leading-relaxed text-white">Chaque tri correct aide la planète. EcoTri vous guide pour chaque objet.</p>
             </div>
             <div className="absolute -right-6 -bottom-6 text-6xl opacity-10 rotate-12">♻️</div>
          </div>
        </div>
      ) : (
        <ResultCard result={result} userLocation={location} onReset={() => { setResult(null); setQuery(''); }} />
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-6" />
          <h3 className="text-2xl font-black text-slate-800">Analyse EcoTri...</h3>
          <p className="text-slate-400 font-bold mt-2">Nous identifions l'objet et les consignes de tri locales.</p>
        </div>
      )}
    </Layout>
  );
}