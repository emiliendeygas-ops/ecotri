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
    if (!dataToProcess || (typeof dataToProcess === 'string' && dataToProcess.length < 2)) return;

    setIsAnalyzing(true);
    try {
      const res = await analyzeWaste(dataToProcess, isBarcode);
      if (res) {
        setResult(res);
        // On tente de générer l'image et les points, mais on ne bloque pas si ça échoue
        generateWasteImage(res.itemName).catch(() => null).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).catch(() => []).then(pts => {
            if (pts && pts.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        alert("Objet non identifié. Essayez d'être plus précis (ex: 'pot de yaourt' au lieu de 'plastique').");
      }
    } catch (error: any) {
      console.error("Process error:", error);
      if (error.message?.includes("entity was not found")) {
        // @ts-ignore
        window.aistudio?.openSelectKey();
      } else {
        alert("Une erreur est survenue. Vérifiez votre connexion ou votre clé API.");
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
                Trier vos déchets<br/>
                <span className="text-emerald-600">sans effort.</span>
              </h1>
              <p className="text-slate-500 font-medium px-4 text-sm leading-relaxed">
                Scannez, photographiez ou recherchez pour recycler correctement en France.
              </p>
            </div>

            <div className="px-6 mb-6">
               <AdBanner adSlot="5112143646" />
            </div>

            {/* Barre de recherche */}
            <div className="px-6 space-y-6">
              <div className="relative group">
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => { if(e.key === 'Enter') handleProcess(query); }}
                  placeholder="Ex: Capsule de café, carton..." 
                  className="w-full bg-white rounded-[2rem] py-6 px-8 text-lg font-bold shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                />
                <button 
                  onClick={() => handleProcess(query)}
                  className="absolute right-3 top-3 bottom-3 bg-emerald-600 text-white px-8 rounded-[1.5rem] font-black text-sm active:scale-95 transition-all"
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
                  <span className="font-bold text-slate-700">Code-barres</span>
                </button>
              </div>
              <input type="file" ref={fileInput} className="hidden" accept="image/*" onChange={onFileChange} />
            </div>

            {/* Contenu statique pour AdSense (Contenu de valeur) */}
            <div className="mt-16 px-8 space-y-12 pb-20">
              <section>
                <h2 className="text-xl font-black text-slate-900 mb-4">Pourquoi bien trier ?</h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  En France, le tri sélectif permet de transformer vos déchets en nouvelles ressources. Un emballage mal trié peut souiller toute une benne de recyclage. EcoTri utilise l'intelligence artificielle pour vous donner la consigne exacte selon les normes françaises de 2025.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <span className="block text-emerald-600 font-black text-xl mb-1">90%</span>
                    <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">du verre recyclé</span>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl">
                    <span className="block text-blue-600 font-black text-xl mb-1">75%</span>
                    <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider">de l'acier recyclé</span>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900 rounded-[3rem] p-8 text-white">
                <h2 className="text-lg font-black mb-4">Comment ça marche ?</h2>
                <ul className="space-y-4">
                  <li className="flex gap-4">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                    <p className="text-xs text-slate-300">Notre IA analyse la composition de votre objet.</p>
                  </li>
                  <li className="flex gap-4">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                    <p className="text-xs text-slate-300">Elle consulte les règles de tri (Citeo, ADEME).</p>
                  </li>
                  <li className="flex gap-4">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                    <p className="text-xs text-slate-300">Elle localise le point de collecte le plus proche.</p>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-black text-slate-900 mb-4">Questions fréquentes</h2>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-black text-sm text-slate-800 mb-1">Dois-je laver les emballages ?</h4>
                    <p className="text-xs text-slate-500">Non, il suffit de bien les vider. Trop d'eau gaspille une ressource précieuse.</p>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-800 mb-1">Le bouchon reste-t-il sur la bouteille ?</h4>
                    <p className="text-xs text-slate-500">Oui, laissez les bouchons sur les bouteilles en plastique pour qu'ils soient recyclés ensemble.</p>
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
            <h2 className="text-2xl font-black text-slate-900 mb-2">Analyse en cours...</h2>
            <p className="text-slate-400 font-bold max-w-[200px] text-sm">Nous interrogeons Gemini pour identifier votre déchet.</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}