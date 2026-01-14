
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

const WASTE_LEXICON = [
  { term: "Biodéchets", def: "Déchets organiques (restes de repas, épluchures) qui doivent être compostés ou collectés séparément depuis 2024." },
  { term: "Extension du Tri", def: "Mesure nationale permettant de déposer tous les emballages dans le bac jaune pour simplifier le recyclage." },
  { term: "Verre sodocalcique", def: "Le verre utilisé pour les contenants alimentaires, recyclable à 100% et à l'infini en France." },
  { term: "Dépôt Sauvage", def: "Action illégale passible d'amende consistant à abandonner ses déchets sur la voie publique." },
  { term: "Triman", def: "Logo obligatoire indiquant que le produit ou l'emballage doit faire l'objet d'une consigne de tri." }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'home' | 'privacy' | 'terms' | 'guide'>('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    
    // Tentative de localisation silencieuse au démarrage
    requestLocation(true);
    getDailyEcoTip().then(setDailyTip);
  }, []);

  const requestLocation = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    const options = { 
      enableHighAccuracy: true, 
      timeout: 20000, // 20 secondes pour le mobile
      maximumAge: 60000 
    };

    navigator.geolocation.getCurrentPosition(
      p => {
        const newLoc = { lat: p.coords.latitude, lng: p.coords.longitude };
        setLocation(newLoc);
        setIsLocating(false);
        trackEvent('location_success');
      },
      err => {
        setIsLocating(false);
        trackEvent('location_error', { code: err.code });
        if (!silent) {
          if (err.code === 1) {
            alert("Accès refusé. Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur/téléphone pour voir les bornes proches.");
          } else if (err.code === 3) {
            alert("Délai d'attente dépassé. Assurez-vous d'avoir une bonne réception GPS.");
          } else {
            alert("Erreur de localisation. Veuillez réessayer ultérieurement.");
          }
        }
      },
      options
    );
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
    
    setError(null);
    setIsAnalyzing(true);
    setIsCameraActive(false);
    setView('home');

    try {
      const res = await analyzeWaste(input);
      if (res && res.itemName) {
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
      setError("Désolé, l'analyse a échoué. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderContent = () => {
    if (view === 'privacy') return (
      <article className="p-8 prose prose-slate max-w-none animate-in">
        <button onClick={() => setView('home')} className="mb-6 text-emerald-600 font-bold">← Retour</button>
        <div dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY }} />
      </article>
    );
    if (view === 'terms') return (
      <article className="p-8 prose prose-slate max-w-none animate-in">
        <button onClick={() => setView('home')} className="mb-6 text-emerald-600 font-bold">← Retour</button>
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
          const msgs = [...chatMessages, { role: 'user' as const, text }];
          setChatMessages(msgs);
          setIsChatting(true);
          const response = await chatSession.sendMessage({ message: text });
          setChatMessages([...msgs, { role: 'model' as const, text: response.text || '' }]);
          setIsChatting(false);
        }}
        onRequestLocation={() => requestLocation(false)}
        chatMessages={chatMessages}
        isChatting={isChatting}
      />
    );

    return (
      <div className="flex flex-col px-6 pt-10 pb-20 space-y-12 animate-in">
        <header className="text-center space-y-4">
          <div className="inline-flex p-6 bg-emerald-50 rounded-[2.5rem] shadow-inner">
            <span className="text-5xl">♻️</span>
          </div>
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">EcoTri : <span className="text-emerald-600">Le Guide du Recyclage</span></h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Conseils officiels 2025 pour trier mieux</p>
        </header>

        <section className="space-y-6">
          <div className="relative">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProcess(query)} placeholder="Que voulez-vous trier ?" className="w-full bg-white rounded-[2rem] py-7 pl-8 pr-40 text-lg font-bold shadow-2xl shadow-slate-200/30 border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
            <div className="absolute right-3 top-3 bottom-3 flex gap-2">
              <button aria-label="Microphone" onClick={() => {
                const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SR) return;
                const rec = new SR();
                rec.lang = 'fr-FR';
                rec.onstart = () => setIsListening(true);
                rec.onresult = (e: any) => handleProcess(e.results[0][0].transcript);
                rec.onend = () => setIsListening(false);
                rec.start();
              }} className={`aspect-square w-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>🎤</button>
              <button aria-label="Photo" onClick={async () => {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setIsCameraActive(true);
                if (videoRef.current) videoRef.current.srcObject = stream;
              }} className="aspect-square w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">📸</button>
              <button onClick={() => handleProcess(query)} disabled={!query.trim()} className="bg-emerald-600 text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest">OK</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((s, i) => <button key={i} onClick={() => { setQuery(s.label); handleProcess(s.label); }} className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-emerald-50 shadow-sm">{s.icon} {s.label}</button>)}
          </div>
        </section>

        {/* Section de contenu pour AdSense - Forte valeur informative */}
        <section className="space-y-10 pt-4">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
              <span>💡</span> Actualité Éco-Tri
            </h2>
            <p className="text-slate-300 font-bold mb-6 leading-relaxed">
              Le tri à la source des biodéchets est une étape clé de la loi AGEC. Savez-vous que trier vos épluchures permet de créer du biogaz ou du compost fertile pour nos agriculteurs ?
            </p>
            {dailyTip && (
              <div className="bg-emerald-600/30 p-5 rounded-2xl border border-emerald-500/30">
                <h3 className="text-xs font-black text-emerald-400 uppercase mb-2">Conseil du jour : {dailyTip.title}</h3>
                <p className="text-sm font-bold leading-relaxed">{dailyTip.content}</p>
              </div>
            )}
          </div>

          <AdBanner />

          <article className="space-y-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight border-b border-emerald-100 pb-4">Guide Expert du Recyclage en France</h2>
            <div className="grid gap-10">
              {RECYCLING_GUIDE.map((g, i) => (
                <div key={i} className="space-y-3">
                  <h3 className="text-lg font-black text-emerald-700 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                    {g.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-bold">
                    {g.content}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <section className="bg-emerald-50/50 p-8 rounded-[3rem] border border-emerald-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Lexique Essentiel du Tri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {WASTE_LEXICON.map((l, i) => (
                <div key={i} className="p-5 bg-white rounded-2xl border border-emerald-50 shadow-sm">
                  <span className="block font-black text-emerald-600 text-xs uppercase mb-1 tracking-wider">{l.term}</span>
                  <p className="text-slate-700 text-[13px] font-bold leading-relaxed">{l.def}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 p-10 rounded-[4rem] text-white">
            <h2 className="text-2xl font-black mb-8">Questions Fréquentes (FAQ)</h2>
            <div className="space-y-8">
              <div className="space-y-2">
                <h4 className="font-black text-emerald-300 text-lg leading-tight">Pourquoi ne pas laver les emballages ?</h4>
                <p className="text-sm font-bold opacity-80 leading-relaxed">Laver les emballages gaspille de l'eau précieuse. Il suffit de bien les vider pour qu'ils soient recyclés efficacement dans les centres de tri.</p>
              </div>
              <div className="border-t border-white/10 pt-8 space-y-2">
                <h4 className="font-black text-emerald-300 text-lg leading-tight">Où vont les capsules de café ?</h4>
                <p className="text-sm font-bold opacity-80 leading-relaxed">Les capsules en aluminium sont collectées via le bac jaune (si votre commune est en extension) ou dans des points de collecte Nespresso/Mondial Relay.</p>
              </div>
            </div>
          </section>

          <div className="text-center pb-10">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-8">
              Contenu certifié selon les normes ADEME et CITEO 2025.
            </p>
          </div>
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
        onNavPrivacy={() => { setView('privacy'); }}
        onNavTerms={() => { setView('terms'); }}
      >
        {renderContent()}
        {isCameraActive && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="p-12 flex justify-between items-center bg-gradient-to-t from-black to-transparent">
              <button onClick={() => setIsCameraActive(false)} className="text-white font-black text-xs uppercase">Annuler</button>
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
              }} className="w-24 h-24 bg-white rounded-full border-[10px] border-white/30"></button>
              <div className="w-16"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[250] flex flex-col items-center justify-center p-10 text-center animate-in">
            <div className="w-32 h-32 bg-emerald-100 rounded-[3rem] flex items-center justify-center mb-8 animate-bounce">
               <span className="text-6xl">✨</span>
               <div className="scanning-line"></div>
            </div>
            <h2 className="text-3xl font-[900] text-slate-900 mb-2">Analyse Experte...</h2>
            <p className="text-emerald-600 font-bold text-sm tracking-widest uppercase">Consultation des bases ADEME</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
