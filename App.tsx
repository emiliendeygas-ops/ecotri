
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const GRADES = [
  { min: 0, label: "Graine de Trieur", icon: "🌱" },
  { min: 50, label: "Apprenti Écolo", icon: "🌿" },
  { min: 150, label: "Ami des Bacs", icon: "🏘️" },
  { min: 300, label: "Trieur de Choc", icon: "⚡" },
  { min: 500, label: "Héros du Quotidien", icon: "🛡️" },
  { min: 800, label: "Expert Zéro Déchet", icon: "🎓" },
  { min: 1200, label: "Maître Recycleur", icon: "🏆" },
  { min: 2000, label: "Gardien Planète", icon: "🌍" },
  { min: 5000, label: "Légende EcoTri", icon: "✨" }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [result, setResult] = useState<SortingResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ecoPoints, setEcoPoints] = useState<number>(0);
  const [showPointAnim, setShowPointAnim] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('ecotri_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedPoints = localStorage.getItem('ecotri_points');
    if (savedPoints) setEcoPoints(parseInt(savedPoints));

    requestLocation();
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => console.warn("Localisation non autorisée")
      );
    }
  };

  // Calcul du grade et de la progression
  const gradeInfo = useMemo(() => {
    const currentIdx = GRADES.slice().reverse().findIndex(g => ecoPoints >= g.min);
    const actualIdx = currentIdx === -1 ? 0 : GRADES.length - 1 - currentIdx;
    const currentGrade = GRADES[actualIdx];
    const nextGrade = GRADES[actualIdx + 1] || null;
    
    let progress = 100;
    if (nextGrade) {
      const range = nextGrade.min - currentGrade.min;
      const gained = ecoPoints - currentGrade.min;
      progress = Math.min(100, Math.round((gained / range) * 100));
    }

    return { ...currentGrade, nextMin: nextGrade?.min, progress };
  }, [ecoPoints]);

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
    const textInput = typeof input === 'string' ? input.trim() : null;
    if (typeof input === 'string' && !textInput) return;
    
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
          fetchPoints(res, location);
        }
      } else {
        throw new Error("Objet non reconnu.");
      }
    } catch (err: any) {
      if (err.message === "API_KEY_REFERRER_BLOCKED") {
        setError(
          <div className="space-y-3">
            <p>Cette clé API est limitée à un domaine spécifique et ne peut pas être utilisée ici (aistudio.google.com).</p>
            <button 
              onClick={handleSelectKey}
              className="bg-white text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-red-50 transition-colors"
            >
              Changer de clé API
            </button>
          </div>
        );
      } else if (err.message === "API_KEY_INVALID") {
        setError("Clé API invalide ou expirée.");
      } else {
        setError("Désolé, je ne reconnais pas cet objet. Essayez d'être plus précis.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        window.location.reload();
      } catch (e) {
        console.error("Erreur sélecteur:", e);
      }
    }
  };

  const fetchPoints = async (res: SortingResult, loc: {lat: number, lng: number}) => {
    setIsLocating(true);
    try {
      const pts = await findNearbyPoints(res.bin, res.itemName, loc.lat, loc.lng);
      if (pts?.length) {
        setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
      }
    } catch (e) {
      console.warn("Points introuvables");
    } finally {
      setIsLocating(false);
    }
  };

  const handleManualLocationFetch = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => {
          const loc = { lat: p.coords.latitude, lng: p.coords.longitude };
          setLocation(loc);
          if (result) fetchPoints(result, loc);
        },
        () => setError("Impossible d'accéder à votre position. Vérifiez vos réglages.")
      );
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Recherche vocale non supportée sur ce navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleProcess(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError("Erreur de reconnaissance vocale.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };
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
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        
        setIsCameraActive(false);
        handleProcess({ data: base64Data, mimeType: 'image/jpeg' });
      }
    }
  };

  return (
    <ApiKeyGuard>
      <Layout 
        points={ecoPoints} 
        level={gradeInfo.label} 
        gradeIcon={gradeInfo.icon}
        progress={gradeInfo.progress}
        showPointAnim={showPointAnim}
      >
        {!result ? (
          <div className="flex flex-col px-6 pt-10 pb-20 space-y-10 animate-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-6 bg-emerald-50 rounded-[2.5rem] mb-2 shadow-inner relative group">
                <span className="text-5xl group-hover:scale-110 transition-transform cursor-default">♻️</span>
                <div className="absolute inset-0 bg-emerald-200/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">
                Le tri <span className="text-emerald-600">intelligent</span>
              </h1>
              <p className="text-slate-400 font-bold text-sm">Normes officielles France 2025</p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.2rem] blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleProcess(query)}
                    placeholder="Que voulez-vous trier ?" 
                    className="w-full bg-white rounded-[2rem] py-7 pl-8 pr-40 text-lg font-bold shadow-2xl shadow-slate-200/30 border-2 border-transparent focus:border-emerald-500 transition-all outline-none" 
                  />
                  <div className="absolute right-3 top-3 bottom-3 flex gap-2">
                    <button 
                      onClick={startVoiceSearch}
                      className={`aspect-square w-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                    >
                      {isListening ? '🎙️' : '🎤'}
                    </button>
                    <button 
                      onClick={startCamera}
                      className="aspect-square w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm"
                    >
                      📸
                    </button>
                    <button 
                      onClick={() => handleProcess(query)}
                      disabled={!query.trim()}
                      className="bg-emerald-600 text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-30 disabled:shadow-none active:scale-95 transition-all"
                    >
                      GO
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-6 rounded-[2.5rem] text-center font-bold text-xs border border-red-100 animate-in shadow-sm">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">⚠️</span>
                    {error}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setQuery(s.label); handleProcess(s.label); }}
                    className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all shadow-sm active:scale-95"
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
            isLocating={isLocating}
            onReset={() => { setResult(null); setQuery(''); }} 
            onAskQuestion={(q) => { setQuery(q); handleProcess(q); }}
            onRequestLocation={handleManualLocationFetch}
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
