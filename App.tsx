
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { ResultCard } from './components/ResultCard';
import { ApiKeyGuard } from './ApiKeyGuard';
import { analyzeWaste, generateWasteImage, findNearbyPoints } from './services/geminiService';
import { SortingResult, HistoryItem } from './types';

const SUGGESTIONS = [
  { label: 'Piles', icon: '🔋' },
  { label: 'Capsule Café', icon: '☕️' },
  { label: 'Carton', icon: '📦' },
  { label: 'Bouteille', icon: '🍾' }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SortingResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ecoPoints, setEcoPoints] = useState<number>(0);
  const [showPointAnim, setShowPointAnim] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ecotri_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedPoints = localStorage.getItem('ecotri_points');
    if (savedPoints) setEcoPoints(parseInt(savedPoints));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => console.warn("Localisation non disponible")
      );
    }
  }, []);

  const addToHistory = (res: SortingResult) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      itemName: res.itemName,
      bin: res.bin
    };
    const newHistory = [newItem, ...history.filter(h => h.itemName !== res.itemName)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('ecotri_history', JSON.stringify(newHistory));

    const newPoints = ecoPoints + 10;
    setEcoPoints(newPoints);
    localStorage.setItem('ecotri_points', newPoints.toString());
    setShowPointAnim(true);
    setTimeout(() => setShowPointAnim(false), 2000);
  };

  const handleProcess = async (input: string | { data: string, mimeType: string }) => {
    if (!input) return;
    setError(null);
    setIsAnalyzing(true);
    setIsCameraActive(false);

    try {
      const res = await analyzeWaste(input);
      if (res && res.itemName) {
        setResult(res);
        addToHistory(res);
        
        // Background tasks
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        throw new Error("Objet non reconnu.");
      }
    } catch (err: any) {
      if (err.message === "API_KEY_INVALID") {
        setError("Clé API non configurée ou invalide.");
      } else {
        setError("Impossible d'analyser ce déchet. Réessayez.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setIsCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Accès caméra refusé.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        
        setIsCameraActive(false);
        handleProcess({ data: base64Data, mimeType: 'image/jpeg' });
      }
    }
  };

  const userLevel = ecoPoints < 100 ? "Apprenti" : ecoPoints < 500 ? "Expert" : "Légende Écolo";

  return (
    <ApiKeyGuard>
      <Layout points={ecoPoints} level={userLevel} showPointAnim={showPointAnim}>
        {!result ? (
          <div className="flex flex-col px-6 pt-10 pb-20 space-y-10 animate-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-6 bg-emerald-50 rounded-[2.5rem] mb-2 shadow-inner">
                <span className="text-5xl animate-bounce">♻️</span>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">
                Le tri <span className="text-emerald-600">intelligent</span>
              </h1>
              <p className="text-slate-400 font-bold text-sm">Normes officielles France 2025</p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleProcess(query)}
                  placeholder="Que voulez-vous trier ?" 
                  className="w-full bg-white rounded-[2rem] py-7 pl-8 pr-32 text-lg font-bold shadow-2xl shadow-slate-200/50 border-2 border-transparent focus:border-emerald-500 transition-all outline-none" 
                />
                <div className="absolute right-3 top-3 bottom-3 flex gap-2">
                  <button 
                    onClick={startCamera}
                    className="aspect-square bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm"
                  >
                    📸
                  </button>
                  <button 
                    onClick={() => handleProcess(query)}
                    disabled={!query.trim()}
                    className="bg-emerald-600 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-30 disabled:shadow-none active:scale-95 transition-all"
                  >
                    GO
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-black text-[10px] uppercase tracking-widest border border-red-100 animate-in">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setQuery(s.label); handleProcess(s.label); }}
                    className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all shadow-sm"
                  >
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <div className="pt-8 space-y-4">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pl-2">Historique récent</h3>
                  <div className="space-y-2">
                    {history.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => handleProcess(item.itemName)}
                        className="w-full flex items-center justify-between p-5 bg-white border border-slate-50 rounded-2xl hover:border-emerald-100 hover:bg-emerald-50/30 transition-all text-left group shadow-sm"
                      >
                        <span className="font-bold text-slate-700 group-hover:text-emerald-700">{item.itemName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.bin}</span>
                          <span className="text-emerald-200 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <ResultCard 
            result={result} 
            userLocation={location} 
            onReset={() => { setResult(null); setQuery(''); }} 
          />
        )}

        {isCameraActive && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-72 h-72 border-2 border-white/20 rounded-[4rem] relative">
                <div className="scanning-line"></div>
                <div className="absolute inset-0 border-2 border-white/40 rounded-[4rem] animate-pulse"></div>
              </div>
            </div>
            <div className="p-12 flex justify-between items-center bg-gradient-to-t from-black to-transparent">
              <button onClick={() => setIsCameraActive(false)} className="text-white/50 font-black text-[10px] uppercase tracking-[0.3em]">Annuler</button>
              <button 
                onClick={capturePhoto} 
                className="w-24 h-24 bg-white rounded-full border-[12px] border-white/20 active:scale-90 transition-all shadow-2xl"
              ></button>
              <div className="w-16"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[250] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="relative">
              <div className="w-32 h-32 bg-emerald-50 rounded-[3rem] flex items-center justify-center mb-8 animate-bounce">
                 <span className="text-6xl">🧐</span>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white animate-ping"></div>
            </div>
            <h2 className="text-3xl font-[900] text-slate-900 mb-2">Analyse en cours...</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-loose">Vérification des directives CITEO 2025</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
