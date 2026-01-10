
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ResultCard } from './components/ResultCard';
import { ApiKeyGuard } from './ApiKeyGuard';
import { analyzeWaste, generateWasteImage, findNearbyPoints, startEcoChat, getDailyEcoTip } from './services/geminiService';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, RECYCLING_GUIDE } from './services/legalContent';
import { trackEvent } from './services/firebaseConfig';
import { SortingResult, HistoryItem } from './types';
import { Chat } from '@google/genai';
import { AdBanner } from './components/AdBanner';

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
  const [view, setView] = useState<'home' | 'privacy' | 'terms'>('home');
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
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [dailyTip, setDailyTip] = useState<{title: string, content: string} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent('app_start', { timestamp: new Date().toISOString() });

    const savedHistory = localStorage.getItem('ecotri_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedPoints = localStorage.getItem('ecotri_points');
    if (savedPoints) setEcoPoints(parseInt(savedPoints));
    requestLocation();
    getDailyEcoTip().then(setDailyTip);
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => console.warn("Localisation non autorisée")
      );
    }
  };

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

  const handleProcess = async (input: string | { data: string, mimeType: string }) => {
    const textInput = typeof input === 'string' ? input.trim() : null;
    if (typeof input === 'string' && !textInput) return;
    
    trackEvent('waste_search_init', { 
      type: typeof input === 'string' ? 'text' : 'image',
      value: typeof input === 'string' ? textInput : 'camera_capture'
    });

    setError(null);
    setIsAnalyzing(true);
    setIsCameraActive(false);
    setView('home');

    try {
      const res = await analyzeWaste(input);
      if (res && res.itemName) {
        trackEvent('waste_search_success', { item: res.itemName, bin: res.bin });
        setResult(res);
        const newItem: HistoryItem = { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), itemName: res.itemName, bin: res.bin };
        const newHistory = [newItem, ...history.filter(h => h.itemName !== res.itemName)].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem('ecotri_history', JSON.stringify(newHistory));
        
        const newPoints = ecoPoints + 10;
        setEcoPoints(newPoints);
        localStorage.setItem('ecotri_points', newPoints.toString());
        setShowPointAnim(true);
        setTimeout(() => setShowPointAnim(false), 2000);

        setChatSession(startEcoChat(res));
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });
        if (location) {
          const pts = await findNearbyPoints(res.bin, res.itemName, location.lat, location.lng);
          if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
        }
      }
    } catch (err: any) {
      trackEvent('waste_search_error', { error: err.message });
      setError("Erreur d'analyse. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderContent = () => {
    if (view === 'privacy') return (
      <article className="p-8 prose prose-slate max-w-none">
        <button onClick={() => setView('home')} className="mb-6 text-emerald-600 font-bold flex items-center gap-2">← Retour</button>
        <div dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY }} />
      </article>
    );
    if (view === 'terms') return (
      <article className="p-8 prose prose-slate max-w-none">
        <button onClick={() => setView('home')} className="mb-6 text-emerald-600 font-bold flex items-center gap-2">← Retour</button>
        <div dangerouslySetInnerHTML={{ __html: TERMS_OF_SERVICE }} />
      </article>
    );

    if (result) return (
      <ResultCard 
        result={result} 
        userLocation={location} 
        isLocating={isLocating}
        onReset={() => { setResult(null); setQuery(''); setChatMessages([]); setChatSession(null); }} 
        onAskQuestion={async (text) => {
          if (!chatSession || isChatting) return;
          trackEvent('ask_coach', { question: text });
          const msgs = [...chatMessages, { role: 'user' as const, text }];
          setChatMessages(msgs);
          setIsChatting(true);
          const response = await chatSession.sendMessage({ message: text });
          setChatMessages([...msgs, { role: 'model' as const, text: response.text || '' }]);
          setIsChatting(false);
        }}
        onRequestLocation={requestLocation}
        chatMessages={chatMessages}
        isChatting={isChatting}
      />
    );

    return (
      <div className="flex flex-col px-6 pt-10 pb-20 space-y-10 animate-in">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-6 bg-emerald-50 rounded-[2.5rem] mb-2 shadow-inner group">
            <span className="text-5xl group-hover:scale-110 transition-transform">♻️</span>
          </div>
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">Guide de <span className="text-emerald-600">tri intelligent</span></h1>
          <p className="text-slate-400 font-bold text-sm">Le compagnon officiel de vos déchets • Normes 2025</p>
        </header>

        <section className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.2rem] blur opacity-10 group-focus-within:opacity-25 transition"></div>
            <div className="relative">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProcess(query)} placeholder="Que voulez-vous trier ?" className="w-full bg-white rounded-[2rem] py-7 pl-8 pr-40 text-lg font-bold shadow-2xl shadow-slate-200/30 border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
              <div className="absolute right-3 top-3 bottom-3 flex gap-2">
                <button aria-label="Microphone" onClick={() => {
                  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SR) return;
                  const rec = new SR();
                  rec.lang = 'fr-FR';
                  rec.onstart = () => {
                    setIsListening(true);
                    trackEvent('voice_search_start');
                  };
                  rec.onresult = (e: any) => handleProcess(e.results[0][0].transcript);
                  rec.onend = () => setIsListening(false);
                  rec.start();
                }} className={`aspect-square w-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>{isListening ? '🎙️' : '🎤'}</button>
                <button aria-label="Appareil photo" onClick={async () => {
                  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                  setIsCameraActive(true);
                  trackEvent('camera_open');
                  if (videoRef.current) videoRef.current.srcObject = stream;
                }} className="aspect-square w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">📸</button>
                <button onClick={() => handleProcess(query)} disabled={!query.trim()} className="bg-emerald-600 text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">GO</button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((s, i) => <button key={i} onClick={() => { 
              trackEvent('suggestion_click', { label: s.label });
              setQuery(s.label); 
              handleProcess(s.label); 
            }} className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-emerald-50 shadow-sm"><span>{s.icon}</span> {s.label}</button>)}
          </div>
        </section>

        <section id="guide" className="space-y-8 pt-6">
          <div className="bg-emerald-50 p-8 rounded-[3rem] border border-emerald-100 shadow-sm">
            <h2 className="text-xl font-black text-emerald-900 mb-4 flex items-center gap-2">
              <span>💡</span> Pourquoi bien trier en 2025 ?
            </h2>
            <p className="text-emerald-800 text-sm font-medium leading-relaxed mb-4">
              En France, le tri sélectif est devenu l'un des piliers de la transition écologique. Grâce à l'extension des consignes de tri (ECT), trier est devenu plus simple : tout ce qui est emballage se recycle.
            </p>
            {dailyTip && (
              <div className="bg-white/60 p-5 rounded-2xl border border-emerald-200">
                <h3 className="text-xs font-black text-emerald-600 uppercase mb-2">Conseil du jour : {dailyTip.title}</h3>
                <p className="text-[13px] text-emerald-900 font-bold">{dailyTip.content}</p>
              </div>
            )}
          </div>

          <AdBanner />

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 px-2 tracking-tight">Le Guide Complet du Recyclage</h2>
            <div className="grid grid-cols-1 gap-4">
              {RECYCLING_GUIDE.map((guide, i) => (
                <article key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-3">{guide.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">{guide.content}</p>
                </article>
              ))}
            </div>
          </div>

          <section id="faq" className="bg-slate-900 p-10 rounded-[4rem] text-white">
            <h2 className="text-2xl font-black mb-6">FAQ : Vos questions sur le tri</h2>
            <div className="space-y-6">
              <article>
                <h4 className="font-bold text-emerald-400 mb-2">Faut-il laver les emballages ?</h4>
                <p className="text-sm text-slate-300">Non ! Il suffit de les vider. Laver les emballages gaspille de l'eau précieuse.</p>
              </article>
              <article>
                <h4 className="font-bold text-emerald-400 mb-2">Puis-je laisser les bouchons ?</h4>
                <p className="text-sm text-slate-300">Oui, laissez les bouchons sur les bouteilles en plastique pour qu'ils ne se perdent pas durant le processus de recyclage.</p>
              </article>
            </div>
          </section>
        </section>
      </div>
    );
  };

  return (
    <ApiKeyGuard>
      <Layout 
        points={ecoPoints} 
        level={gradeInfo.label} 
        gradeIcon={gradeInfo.icon} 
        progress={gradeInfo.progress} 
        showPointAnim={showPointAnim}
        onNavPrivacy={() => setView('privacy')}
        onNavTerms={() => setView('terms')}
      >
        {renderContent()}
        {isCameraActive && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="p-12 flex justify-between items-center bg-gradient-to-t from-black to-transparent">
              <button onClick={() => setIsCameraActive(false)} className="text-white/50 font-black text-[10px] uppercase tracking-widest">Annuler</button>
              <button aria-label="Prendre photo" onClick={() => {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && videoRef.current) {
                  canvasRef.current!.width = videoRef.current.videoWidth;
                  canvasRef.current!.height = videoRef.current.videoHeight;
                  ctx.drawImage(videoRef.current, 0, 0);
                  const base = canvasRef.current!.toDataURL('image/jpeg', 0.8).split(',')[1];
                  (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                  setIsCameraActive(false);
                  handleProcess({ data: base, mimeType: 'image/jpeg' });
                }
              }} className="w-24 h-24 bg-white rounded-full border-[12px] border-white/20 shadow-2xl"></button>
              <div className="w-16"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[250] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="w-32 h-32 bg-emerald-100 rounded-[3rem] flex items-center justify-center mb-8 animate-bounce shadow-xl shadow-emerald-200/50 relative overflow-hidden">
               <span className="text-6xl relative z-10">✨</span>
               <div className="scanning-line"></div>
            </div>
            <h2 className="text-3xl font-[900] text-slate-900 mb-2">Identification en cours...</h2>
            <p className="text-emerald-600 font-bold text-sm tracking-widest uppercase">Analyse de votre impact positif</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
