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
        err => console.warn("Localisation non disponible")
      );
    }
  }, []);

  const handleProcess = async (input: any, isBarcode: boolean = false) => {
    const dataToProcess = typeof input === 'string' ? input.trim() : input;
    if (!dataToProcess || (typeof dataToProcess === 'string' && dataToProcess.length < 2)) return;

    setIsAnalyzing(true);
    try {
      // 1. Analyse textuelle/visuelle principale
      const res = await analyzeWaste(dataToProcess, isBarcode);
      
      if (res) {
        setResult(res);
        
        // 2. Tâches secondaires (ne bloquent pas si elles échouent)
        generateWasteImage(res.itemName)
          .then(img => { if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null); })
          .catch(() => null);

        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng)
            .then(pts => { if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null); })
            .catch(() => null);
        }
      }
    } catch (error: any) {
      console.error("Process error:", error);
      if (error.message === "API_KEY_INVALID_OR_BILLING_REQUIRED") {
        alert("⚠️ Problème de clé API : Assurez-vous d'avoir sélectionné une clé liée à un projet avec facturation activée dans Google Cloud.");
        // @ts-ignore
        window.aistudio?.openSelectKey();
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
            {/* Hero Section */}
            <div className="px-8 pt-12 pb-8 text-center">
              <div className="inline-block p-4 bg-white rounded-3xl shadow-xl shadow-emerald-100 mb-8 animate-float">
                <span className="text-5xl">♻️</span>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-[1.1] mb-4">
                Le tri sélectif<br/>
                <span className="text-emerald-600">réinventé.</span>
              </h1>
              <p className="text-slate-500 font-medium px-4 text-sm leading-relaxed">
                Photographiez ou recherchez un déchet pour connaître sa consigne de tri exacte.
              </p>
            </div>

            <div className="px-6 mb-8">
               <AdBanner adSlot="5112143646" />
            </div>

            {/* Input Section */}
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
                  Analyser
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setBarcodeMode(false); fileInput.current?.click(); }} className="bg-white p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-slate-100 transition-all active:scale-95 shadow-sm hover:border-emerald-200">
                  <div className="text-3xl">📸</div>
                  <span className="font-bold text-slate-700">Photo</span>
                </button>
                <button onClick={() => { setBarcodeMode(true); fileInput.current?.click(); }} className="bg-white p-8 rounded-[2.5rem] flex flex-col items-center gap-3 border-2 border-slate-100 transition-all active:scale-95 shadow-sm hover:border-emerald-200">
                  <div className="text-3xl">🏷️</div>
                  <span className="font-bold text-slate-700">Scanner</span>
                </button>
              </div>
              <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={onFileChange} />
            </div>

            {/* Content for AdSense Approval */}
            <div className="mt-16 px-8 space-y-12 pb-20 border-t border-slate-50 pt-12">
              <section>
                <h2 className="text-xl font-black text-slate-900 mb-4">Guide Officiel du Tri en France</h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  EcoTri utilise l'intelligence artificielle pour simplifier le recyclage. Depuis 2023, les consignes de tri se sont simplifiées en France : <strong>tous les emballages se trient</strong> dans le bac jaune. Cependant, certains objets complexes comme les piles, les médicaments ou les encombrants nécessitent des circuits spécifiques.
                </p>
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                  <h4 className="font-black text-emerald-800 text-xs uppercase tracking-widest mb-3">Le saviez-vous ?</h4>
                  <p className="text-emerald-700 text-xs font-bold italic">Un français produit en moyenne 573kg de déchets par an. Bien trier permet d'économiser jusqu'à 70% d'énergie lors de la fabrication de nouveaux produits.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-black text-slate-900 mb-4">Questions Fréquentes (FAQ)</h2>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-black text-sm text-slate-800 mb-1">Dois-je laver mes emballages avant de trier ?</h4>
                    <p className="text-xs text-slate-500">Non, il suffit de bien les vider. Les laver gaspille de l'eau inutilement.</p>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-800 mb-1">Où jeter les masques et mouchoirs ?</h4>
                    <p className="text-xs text-slate-500">Ils doivent impérativement être jetés dans le bac gris (ordures ménagères) pour des raisons sanitaires.</p>
                  </div>
                </div>
              </section>
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
            <h2 className="text-2xl font-black text-slate-900 mb-2">Identification...</h2>
            <p className="text-slate-400 font-bold max-w-[200px] text-sm">Nous interrogeons l'IA pour déterminer la consigne de tri.</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}