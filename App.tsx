
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
  { term: "ECT", def: "Extension des Consignes de Tri : simplification nationale permettant de mettre tous les emballages dans le bac jaune." },
  { term: "Verre sodocalcique", def: "Verre utilisé pour les bouteilles et bocaux, recyclable à 100% et à l'infini." },
  { term: "DEEE", def: "Déchets d'Équipements Électriques et Électroniques, contenant des composants dangereux ou précieux (piles, cartes)." },
  { term: "CITEO", def: "Organisme français en charge de la gestion et du financement du recyclage des emballages ménagers." },
  { term: "ADEME", def: "Agence de la transition écologique participant à la mise en œuvre des politiques publiques pour l'environnement." }
];

const FAQ_CONTENT = [
  { q: "Faut-il laver ses emballages avant de les trier ?", a: "Non, il suffit de bien les vider. Laver les emballages gaspille de l'eau qui devra ensuite être traitée." },
  { q: "Où jeter les médicaments périmés ?", a: "Ils ne vont jamais dans les poubelles classiques. Rapportez-les en pharmacie via le réseau Cyclamed pour une destruction sécurisée." },
  { q: "Que faire des piles et ampoules ?", a: "Ces objets contiennent des métaux lourds. Déposez-les dans les bacs de collecte à l'entrée des supermarchés ou en déchèterie." }
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
    trackEvent('page_view_home');
    const savedHistory = localStorage.getItem('ecotri_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedPoints = localStorage.getItem('ecotri_points');
    if (savedPoints) setEcoPoints(parseInt(savedPoints));
    // Tenter une localisation initiale silencieuse
    requestLocation(true);
    getDailyEcoTip().then(setDailyTip);
  }, []);

  const requestLocation = (silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      p => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setIsLocating(false);
        trackEvent('location_success');
      },
      err => {
        setIsLocating(false);
        trackEvent('location_error', { code: err.code });
        if (!silent) {
          if (err.code === 1) alert("Merci d'autoriser l'accès au GPS dans les réglages de votre téléphone pour voir les points de collecte.");
          else if (err.code === 3) alert("Le signal GPS est trop faible. Réessayez à l'extérieur.");
          else alert("Impossible de vous localiser pour le moment.");
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 60000 
      }
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
    
    trackEvent('waste_analysis_start', { method: typeof input === 'string' ? 'text' : 'camera' });
    setError(null);
    setIsAnalyzing(true);
    setIsCameraActive(false);
    setView('home');

    try {
      const res = await analyzeWaste(input);
      if (res && res.itemName) {
        setResult(res);
        trackEvent('waste_analysis_success', { item: res.itemName, bin: res.bin });
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
      setError("Erreur d'analyse.");
      trackEvent('waste_analysis_error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderContent = () => {
    if (view === 'privacy') return (
      <article className="p-8 prose prose-slate max-w-none animate-in">
        <button onClick={() => setView('home')} className="mb-6 text-emerald-600 font-bold flex items-center gap-2">← Retour</button>
        <div dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY }} />
      </article>
    );
    if (view === 'terms') return (
      <article className="p-8 prose prose-slate max-w-none animate-in">
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
          const msgs = [...chatMessages, { role: 'user' as const, text }];
          setChatMessages(msgs);
          setIsChatting(true);
          const response = await chatSession.sendMessage({ message: text });
          setChatMessages([...msgs, { role: 'model' as const, text: response.text || '' }]);
          setIsChatting(false);
          trackEvent('chat_message_sent');
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
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight leading-none">EcoTri : <span className="text-emerald-600">Le Guide Officiel</span></h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Simplifiez votre recyclage en 2025</p>
        </header>

        <section className="space-y-6">
          <div className="relative">
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleProcess(query)} placeholder="Quel objet trier ?" className="w-full bg-white rounded-[2rem] py-7 pl-8 pr-40 text-lg font-bold shadow-2xl shadow-slate-200/30 border-2 border-transparent focus:border-emerald-500 outline-none transition-all" />
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
                trackEvent('voice_search_click');
              }} className={`aspect-square w-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>🎤</button>
              <button aria-label="Photo" onClick={async () => {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setIsCameraActive(true);
                if (videoRef.current) videoRef.current.srcObject = stream;
                trackEvent('camera_open_click');
              }} className="aspect-square w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">📸</button>
              <button onClick={() => handleProcess(query)} disabled={!query.trim()} className="bg-emerald-600 text-white px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest">GO</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((s, i) => <button key={i} onClick={() => { setQuery(s.label); handleProcess(s.label); }} className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-emerald-50 shadow-sm">{s.icon} {s.label}</button>)}
          </div>
        </section>

        <section id="guide" className="space-y-10 pt-10 border-t border-slate-100">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl">💡</div>
            <h2 className="text-2xl font-black mb-4">L'info du jour</h2>
            <p className="text-slate-300 font-bold mb-6 leading-relaxed">Depuis 2024, le tri des biodéchets est obligatoire pour tous en France. Chaque foyer doit disposer d'une solution de compostage ou de collecte dédiée.</p>
            {dailyTip && (
              <div className="bg-emerald-600/20 p-5 rounded-2xl border border-emerald-500/30">
                <h3 className="text-xs font-black text-emerald-400 uppercase mb-2">Conseil EcoTri : {dailyTip.title}</h3>
                <p className="text-sm font-bold">{dailyTip.content}</p>
              </div>
            )}
          </div>

          <AdBanner />

          <article className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Le Guide du Recyclage en France</h2>
            <div className="grid gap-6">
              {RECYCLING_GUIDE.map((g, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-black text-emerald-700 mb-3">{g.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-bold">{g.content}</p>
                </div>
              ))}
            </div>
          </article>

          <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Lexique Complet du Tri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WASTE_LEXICON.map((l, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block font-black text-emerald-600 text-xs uppercase mb-1">{l.term}</span>
                  <p className="text-slate-600 text-[13px] font-bold leading-relaxed">{l.def}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="bg-emerald-600 p-10 rounded-[4rem] text-white">
            <h2 className="text-2xl font-black mb-8">FAQ & Conseils</h2>
            <div className="space-y-8">
              {FAQ_CONTENT.map((item, idx) => (
                <div key={idx} className={`space-y-2 ${idx !== 0 ? 'border-t border-white/10 pt-8' : ''}`}>
                  <h4 className="font-black text-emerald-100 text-lg leading-tight">{item.q}</h4>
                  <p className="text-sm font-bold opacity-90 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center pb-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8">
              Ce contenu est régulièrement mis à jour selon les directives de l'ADEME et CITEO France.
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
        onNavPrivacy={() => { setView('privacy'); trackEvent('nav_privacy_click'); }}
        onNavTerms={() => { setView('terms'); trackEvent('nav_terms_click'); }}
      >
        {renderContent()}
        {isCameraActive && (
          <div className="fixed inset-0 bg-black z-[200] flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="p-12 flex justify-between items-center bg-gradient-to-t from-black to-transparent">
              <button onClick={() => setIsCameraActive(false)} className="text-white/50 font-black text-[10px] uppercase">Annuler</button>
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
            <div className="w-32 h-32 bg-emerald-100 rounded-[3rem] flex items-center justify-center mb-8 animate-bounce shadow-xl relative overflow-hidden">
               <span className="text-6xl z-10">✨</span>
               <div className="scanning-line"></div>
            </div>
            <h2 className="text-3xl font-[900] text-slate-900 mb-2">Analyse IA...</h2>
            <p className="text-emerald-600 font-bold text-sm tracking-widest uppercase">Optimisation de l'impact</p>
          </div>
        )}
      </Layout>
    </ApiKeyGuard>
  );
}
