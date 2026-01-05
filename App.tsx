
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Layout';
import { ResultCard } from './ResultCard';
import { ApiKeyGuard } from './ApiKeyGuard';
import { analyzeWaste, generateWasteImage, findNearbyPoints } from './geminiService';
import { SortingResult } from './types';

const SUGGESTIONS = [
  { label: 'Capsule Café', icon: '☕️' },
  { label: 'Piles', icon: '🔋' },
  { label: 'Carton', icon: '📦' },
  { label: 'Vêtements', icon: '👕' }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SortingResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => console.warn("Localisation non disponible")
      );
    }
  }, []);

  const handleProcess = async (input: string | { data: string, mimeType: string }) => {
    setError(null);
    setIsAnalyzing(true);
    setIsCameraActive(false);

    try {
      const res = await analyzeWaste(input);
      if (res && res.itemName) {
        setResult(res);
        // Enrichissements
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          findNearbyPoints(res.bin, location.lat, location.lng).then(pts => {
            if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }
      } else {
        throw new Error("Objet non reconnu. Réessayez avec un nom plus simple.");
      }
    } catch (err: any) {
      setError(err.message === "API_KEY_INVALID" ? "Clé API absente." : err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Accès caméra refusé.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];
        
        // Arrêter le flux
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        
        handleProcess({ data: base64Data, mimeType: 'image/jpeg' });
      }
    }
  };

  return (
    <ApiKeyGuard>
      <Layout>
        {!result ? (
          <div className="flex flex-col min-h-[70vh] px-6 animate-in">
            <div className="text-center pt-12 pb-10">
              <div className="inline-flex p-6 bg-white rounded-[2.5rem] shadow-2xl mb-8 border border-emerald-50">
                <span className="text-5xl">♻️</span>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-[1.1]">
                Que voulez-vous<br/>
                <span className="text-emerald-600">trier aujourd'hui ?</span>
              </h1>
            </div>

            <div className="max-w-md mx-auto w-full space-y-10">
              {/* Barre de recherche Omni */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <span className="text-2xl grayscale group-focus-within:grayscale-0 transition-all">🔍</span>
                </div>
                <input 
                  ref={inputRef}
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleProcess(query)}
                  placeholder="Écrivez ou scannez..." 
                  className="w-full bg-white rounded-[2.5rem] py-8 pl-16 pr-32 text-xl font-bold shadow-2xl shadow-slate-200/50 border-2 border-transparent focus:border-emerald-500/20 outline-none transition-all placeholder:text-slate-200" 
                />
                
                <div className="absolute right-3 top-3 bottom-3 flex gap-2">
                  <button 
                    onClick={startCamera}
                    className="aspect-square bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                    title="Scanner via Caméra"
                  >
                    📸
                  </button>
                  <button 
                    onClick={() => handleProcess(query)}
                    disabled={query.length < 2 || isAnalyzing}
                    className="bg-emerald-600 text-white px-6 rounded-3xl font-black text-xs uppercase shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    OK
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center font-bold text-sm animate-in">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => { setQuery(s.label); handleProcess(s.label); }}
                    className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:border-emerald-400 transition-all shadow-sm active:scale-95"
                  >
                    <span>{s.icon}</span>
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
            onReset={() => { setResult(null); setQuery(''); }} 
          />
        )}

        {/* Modal Caméra */}
        {isCameraActive && (
          <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                <div className="scanning-line"></div>
              </div>
            </div>
            <div className="p-10 flex justify-between items-center bg-black/50 backdrop-blur-md">
              <button onClick={() => setIsCameraActive(false)} className="text-white font-bold px-6 py-2">Annuler</button>
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full border-4 border-white/20 shadow-2xl active:scale-90 transition-all"
              ></button>
              <div className="w-16"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-[150] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8"></div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Expertise IA en cours...</h2>
            <p className="text-slate-400 font-medium">Analyse des composants et recyclabilité</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
