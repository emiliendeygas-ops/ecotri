
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
        
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        throw new Error("Objet non reconnu. Réessayez avec plus de lumière.");
      }
    } catch (err: any) {
      setError(err.message === "API_KEY_INVALID" ? "Clé API non valide." : "Une erreur est survenue.");
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
      setError("Caméra inaccessible.");
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
        if (videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        setIsCameraActive(false);
        handleProcess({ data: base64Data, mimeType: 'image/jpeg' });
      }
    }
  };

  const userLevel = ecoPoints < 100 ? "Novice" : ecoPoints < 500 ? "Éclaireur" : "Gardien Écolo";

  return (
    <ApiKeyGuard>
      <Layout 
        points={ecoPoints} 
        level={userLevel}
        showPointAnim={showPointAnim}
      >
        {!result ? (
          <div className="flex flex-col px-6 pt-10 pb-20 space-y-10 animate-in">
            <div className="text-center space-y-4">
              <div className="inline-block p-6 bg-emerald-50 rounded-[3rem] shadow-inner mb-2">
                <span className="text-5xl">🌱</span>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tighter">
                Faites un <span className="text-emerald-600">geste</span>
              </h1>
              <p className="text-slate-400 font-bold text-sm">Identifiez et triez en un instant.</p>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleProcess(query)}
                  placeholder="Canette, papier glacé..." 
                  className="w-full bg-white rounded-3xl py-7 pl-8 pr-32 text-lg font-bold shadow-xl shadow-slate-100 border-2 border-transparent focus:border-emerald-500 transition-all outline-none" 
                />
                <div className="absolute right-2 top-2 bottom-2 flex gap-2">
                  <button onClick={startCamera} className="aspect-square bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                    📸
                  </button>
                  <button onClick={() => handleProcess(query)} disabled={!query.trim()} className="bg-emerald-600 text-white px-5 rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-100 disabled:opacity-20 active:scale-95 transition-all">
                    GO
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-xs border border-red-100">{error}</div>}

              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => { setQuery(s.label); handleProcess(s.label); }} className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 transition-all">
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <div className="pt-6 border-t border-slate-50">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Derniers tris</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {history.map((item) => (
                      <button key={item.id} onClick={() => handleProcess(item.itemName)} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors text-left group">
                        <span className="font-bold text-slate-700 group-hover:text-emerald-600">{item.itemName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-300 uppercase">{item.bin}</span>
                          <span className="text-emerald-500/30">→</span>
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
          <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/30 rounded-[3rem] relative overflow-hidden">
                <div className="scanning-line"></div>
              </div>
            </div>
            <div className="p-10 flex justify-between items-center bg-black/90 backdrop-blur-md">
              <button onClick={() => setIsCameraActive(false)} className="text-white/50 font-black text-[10px] uppercase tracking-widest px-4">Fermer</button>
              <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-all"></button>
              <div className="w-16"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[150] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mb-6 animate-bounce">
               <span className="text-5xl">🧐</span>
            </div>
            <h2 className="text-2xl font-[900] text-slate-900 mb-2">Identification...</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-loose">Notre IA consulte les normes de tri 2025</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
