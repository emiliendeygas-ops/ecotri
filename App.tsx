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
        err => console.warn("Géolocalisation non disponible")
      );
    }
  }, []);

  const handleProcess = async (input: any, isBarcode: boolean = false) => {
    const dataToProcess = typeof input === 'string' ? input.trim() : input;
    if (!dataToProcess || (typeof dataToProcess === 'string' && dataToProcess.length < 2)) return;

    setIsAnalyzing(true);
    try {
      const res = await analyzeWaste(dataToProcess, isBarcode);
      
      if (res) {
        setResult(res);
        
        generateWasteImage(res.itemName)
          .then(img => { if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null); })
          .catch(() => {});

        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng)
            .then(pts => { if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null); })
            .catch(() => {});
        }
      }
    } catch (error: any) {
      console.error("Erreur d'analyse:", error);
      const errorMsg = error.message || "";
      
      // Cas spécifique demandé par les consignes : "Requested entity was not found"
      if (errorMsg.includes("Requested entity was not found") || errorMsg.includes("404") || errorMsg.includes("403")) {
        alert("Problème d'accès : La clé API ou le projet associé ne semble pas valide pour ce modèle. Veuillez resélectionner votre clé API.");
        // @ts-ignore
        if (window.aistudio) window.aistudio.openSelectKey();
      } else {
        alert("Une erreur est survenue lors de la recherche. Réessayez dans quelques instants.");
      }
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
            <div className="px-8 pt-12 pb-8 text-center">
              <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-emerald-100 mb-8 animate-float">
                <span className="text-5xl">♻️</span>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-[1.1] mb-4">
                Trier vos déchets<br/>
                <span className="text-emerald-600">facilement.</span>
              </h1>
              <p className="text-slate-500 font-medium px-4 text-sm leading-relaxed">
                Recherchez un objet ou prenez-le en photo pour savoir comment le recycler en France.
              </p>
            </div>

            <div className="px-6 mb-8">
               <AdBanner adSlot="5112143646" />
            </div>

            <div className="px-6 space-y-6">
              <div className="relative group">
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                  placeholder="Ex: Pot de yaourt, pile..." 
                  className="w-full bg-white rounded-[2rem] py-6 px-8 text-lg font-bold shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                />
                <button 
                  onClick={() => handleProcess(query)}
                  disabled={isAnalyzing}
                  className="absolute right-3 top-3 bottom-3 bg-emerald-600 text-white px-8 rounded-[1.5rem] font-black text-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  Go
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setBarcodeMode(false); fileInput.current?.click(); }} className="bg-white p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-slate-100 transition-all active:scale-95 shadow-sm hover:border-emerald-200">
                  <div className="text-3xl">📸</div>
                  <span className="font-bold text-slate-700">Photo</span>
                </button>
                <button onClick={() => { setBarcodeMode(true); fileInput.current?.click(); }} className="bg-white p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-slate-100 transition-all active:scale-95 shadow-sm hover:border-emerald-200">
                  <div className="text-3xl">🏷️</div>
                  <span className="font-bold text-slate-700">Scan</span>
                </button>
              </div>
              <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={onFileChange} />
            </div>
            
            <div className="mt-12 px-8 pb-20">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <h3 className="font-black text-slate-900 text-sm mb-2">💡 Le saviez-vous ?</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  En France, la règle est simple : tous les emballages (plastique, métal, carton) vont dans le bac jaune !
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ResultCard result={result} userLocation={location} onReset={() => { setResult(null); setQuery(''); }} />
        )}

        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="relative w-40 h-40 mb-10">
              <div className="absolute inset-0 border-[6px] border-emerald-100 rounded-[3rem]"></div>
              <div className="absolute inset-0 border-[6px] border-emerald-500 rounded-[3rem] animate-pulse"></div>
              <div className="scanning-line"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">🔍</div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Analyse IA</h2>
            <p className="text-slate-400 font-bold max-w-[200px] text-sm">Nous recherchons la consigne de tri exacte pour vous.</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}