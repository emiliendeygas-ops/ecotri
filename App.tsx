
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
  { min: 800, label: "Expert Zéro Déchet", icon: "🎓" }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'home' | 'privacy' | 'terms'>('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
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
    trackEvent('page_view_home');
    const savedHistory = localStorage.getItem('ecotri_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedPoints = localStorage.getItem('ecotri_points');
    if (savedPoints) setEcoPoints(parseInt(savedPoints));
    
    // Localisation silencieuse optimisée
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        null,
        { timeout: 10000 }
      );
    }
    getDailyEcoTip().then(setDailyTip);
  }, []);

  const requestLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setIsLocating(false); },
      () => { setIsLocating(false); alert("GPS indisponible. Vérifiez vos réglages."); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleProcess = async (input: string | { data: string, mimeType: string }) => {
    if (typeof input === 'string' && !input.trim()) return;
    
    setIsAnalyzing(true);
    setIsCameraActive(false);
    setView('home');

    try {
      // 1. Analyse ultra-rapide
      const res = await analyzeWaste(input);
      if (res) {
        setResult(res);
        setIsAnalyzing(false); // On libère l'UI dès qu'on a le résultat de tri

        // 2. Tâches asynchrones secondaires (ne bloquent pas l'UI)
        setChatSession(startEcoChat(res));
        
        // Image en arrière-plan
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });

        // Points de collecte si localisation dispo
        if (location) {
          findNearbyPoints(res.bin, res.itemName, location.lat, location.lng).then(pts => {
            if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }

        // Points utilisateur
        const newPoints = ecoPoints + 10;
        setEcoPoints(newPoints);
        localStorage.setItem('ecotri_points', newPoints.toString());
        setShowPointAnim(true);
        setTimeout(() => setShowPointAnim(false), 2000);
      }
    } catch (err) {
      setIsAnalyzing(false);
      alert("Erreur d'analyse.");
    }
  };

  const gradeInfo = useMemo(() => {
    const currentIdx = GRADES.slice().reverse().findIndex(g => ecoPoints >= g.min);
    const actualIdx = currentIdx === -1 ? 0 : GRADES.length - 1 - currentIdx;
    return { ...GRADES[actualIdx], progress: 50 }; // Simplified progress
  }, [ecoPoints]);

  const renderContent = () => {
    if (view === 'privacy' || view === 'terms') {
      return (
        <article className="p-8 prose prose-slate max-w-none">
          <button onClick={() => setView('home')} className="mb-6 text-emerald-600 font-bold">← Retour</button>
          <div dangerouslySetInnerHTML={{ __html: view === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE }} />
        </article>
      );
    }

    if (result) return (
      <ResultCard 
        result={result} 
        userLocation={location} 
        isLocating={isLocating}
        onReset={() => { setResult(null); setQuery(''); setChatMessages([]); }} 
        onAskQuestion={async (text) => {
          if (!chatSession || isChatting) return;
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
      <div className="flex flex-col px-6 pt-10 pb-20 space-y-12 animate-in">
        <header className="text-center space-y-4">
          <div className="inline-flex p-6 bg-emerald-50 rounded-[2.5rem]">
            <span className="text-5xl">♻️</span>
          </div>
          <h1 className="text-4xl font-[900] text-slate-900 leading-none tracking-tight">EcoTri : <span className="text-emerald-600">Expertise 2025</span></h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Le tri intelligent à portée de main</p>
        </header>

        <section className="relative">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProcess(query)} placeholder="Que trier aujourd'hui ?" className="w-full bg-white rounded-[2rem] py-7 pl-8 pr-40 text-lg font-bold shadow-2xl shadow-slate-200/30 border-2 border-transparent focus:border-emerald-500 outline-none" />
          <div className="absolute right-3 top-3 bottom-3 flex gap-2">
            <button aria-label="Micro" onClick={() => {/* Speech Logic */}} className="aspect-square w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">🎤</button>
            <button aria-label="Photo" onClick={async () => {
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
              setIsCameraActive(true);
              if (videoRef.current) videoRef.current.srcObject = stream;
            }} className="aspect-square w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">📸</button>
            <button onClick={() => handleProcess(query)} className="bg-emerald-600 text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest">OK</button>
          </div>
        </section>

        {/* Section de contenu Riche pour l'approbation AdSense */}
        <div className="grid gap-12 pt-4">
          <section className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl">
            <h2 className="text-xl font-black mb-4">Le Saviez-vous ?</h2>
            <p className="text-slate-300 font-bold text-sm leading-relaxed mb-4">
              Depuis 2024, le tri des déchets alimentaires est devenu une obligation nationale. EcoTri vous aide à identifier les bornes de compostage urbain les plus proches.
            </p>
            {dailyTip && <div className="p-4 bg-emerald-600/20 rounded-2xl border border-emerald-500/30 text-xs font-bold">{dailyTip.content}</div>}
          </section>

          <AdBanner />

          <article className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900">Guide Complet du Recyclage</h2>
            <div className="grid gap-4">
              {RECYCLING_GUIDE.map((g, i) => (
                <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-emerald-700 mb-2">{g.title}</h3>
                  <p className="text-slate-500 text-sm font-bold leading-relaxed">{g.content}</p>
                </div>
              ))}
            </div>
          </article>

          <section className="bg-emerald-50 p-8 rounded-[3rem]">
            <h2 className="text-xl font-black mb-6">Matériaux et Valorisation</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100">
                <span className="text-emerald-600 font-black text-xs uppercase block mb-1">Aluminium</span>
                <p className="text-slate-600 text-xs font-bold">Recyclable à 100% sans perte de qualité. Une canette recyclée peut redevenir une canette en 60 jours.</p>
              </div>
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100">
                <span className="text-emerald-600 font-black text-xs uppercase block mb-1">Plastiques PET</span>
                <p className="text-slate-600 text-xs font-bold">Transformés en paillettes puis en fibres textiles pour rembourrer couettes et manteaux.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <ApiKeyGuard>
      <Layout points={ecoPoints} level={gradeInfo.label} gradeIcon={gradeInfo.icon} progress={gradeInfo.progress} showPointAnim={showPointAnim}>
        {renderContent()}
        {isCameraActive && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="p-12 flex justify-between bg-black/50">
              <button onClick={() => setIsCameraActive(false)} className="text-white font-black">ANNULER</button>
              <button onClick={() => {
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
              }} className="w-20 h-20 bg-white rounded-full border-8 border-slate-300"></button>
              <div className="w-16"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 z-[250] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="w-24 h-24 bg-emerald-100 rounded-[2.5rem] flex items-center justify-center mb-6 animate-bounce">
               <span className="text-5xl">✨</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Identification IA...</h2>
            <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest">Calcul de l'impact écologique</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
