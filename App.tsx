import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { ResultCard } from './components/ResultCard';
import { analyzeWaste, generateWasteImage, findNearbyPoints, startEcoChat, getDailyEcoTip, PRIVACY_POLICY, TERMS_OF_SERVICE } from './services/geminiService';
import { RECYCLING_GUIDE } from './constants';
import { trackEvent } from './services/firebaseConfig';
import { SortingResult } from './types';
import { Chat } from '@google/genai';
import { AdBanner } from './components/AdBanner';

function MainApp() {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [result, setResult] = useState<SortingResult | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [ecoPoints, setEcoPoints] = useState<number>(0);
  const [showPointAnim, setShowPointAnim] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [dailyTip, setDailyTip] = useState<{title: string, content: string} | null>(null);
  const [modalContent, setModalContent] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent('app_init');
    const savedPoints = localStorage.getItem('snapsort_points');
    if (savedPoints) setEcoPoints(parseInt(savedPoints));
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        null, { timeout: 10000 }
      );
    }
    getDailyEcoTip().then(setDailyTip);
  }, []);

  const handleProcess = async (input: string | { data: string, mimeType: string }) => {
    if (typeof input === 'string' && !input.trim()) return;
    setIsAnalyzing(true);
    setIsCameraActive(false);

    try {
      const res = await analyzeWaste(input);
      if (res) {
        setResult(res);
        setIsAnalyzing(false);
        const session = startEcoChat(res);
        setChatSession(session);
        
        generateWasteImage(res.itemName).then(img => {
          if (img) setResult(prev => prev ? { ...prev, imageUrl: img } : null);
        });

        if (location) {
          findNearbyPoints(res.bin, res.itemName, location.lat, location.lng).then(pts => {
            if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
          });
        }

        const newPoints = ecoPoints + 10;
        setEcoPoints(newPoints);
        localStorage.setItem('snapsort_points', newPoints.toString());
        setShowPointAnim(true);
        setTimeout(() => setShowPointAnim(false), 4000);
      } else {
        setIsAnalyzing(false);
        alert("Oups ! Objet non identifié.");
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      console.error(err);
      alert("Erreur d'analyse. Un problème est survenu avec le service d'intelligence artificielle.");
    }
  };

  const gradeInfo = useMemo(() => {
    const GRADES = [
      { min: 0, label: "Graine d'Écolo", icon: "🌱" },
      { min: 50, label: "Apprenti Trieur", icon: "🌿" },
      { min: 150, label: "Ami de la Terre", icon: "🌍" },
      { min: 350, label: "Héros Local", icon: "🦸" },
      { min: 700, label: "Gardien Planétaire", icon: "🛡️" },
      { min: 1200, label: "Maître du Cycle", icon: "♾️" }
    ];
    const currentGrade = [...GRADES].reverse().find(g => ecoPoints >= g.min) || GRADES[0];
    const nextGradeIdx = GRADES.indexOf(currentGrade) + 1;
    const nextGrade = GRADES[nextGradeIdx];
    let progress = nextGrade ? ((ecoPoints - currentGrade.min) / (nextGrade.min - currentGrade.min)) * 100 : 100;
    return { ...currentGrade, progress };
  }, [ecoPoints]);

  return (
    <Layout 
      points={ecoPoints} 
      level={gradeInfo.label} 
      gradeIcon={gradeInfo.icon} 
      progress={gradeInfo.progress} 
      showPointAnim={showPointAnim}
      onNavPrivacy={() => setModalContent(PRIVACY_POLICY)}
      onNavTerms={() => setModalContent(TERMS_OF_SERVICE)}
    >
      {result ? (
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
            try {
              const response = await chatSession.sendMessage({ message: text });
              setChatMessages([...msgs, { role: 'model' as const, text: response.text || "" }]);
            } catch (e) {
              setChatMessages([...msgs, { role: 'model' as const, text: "Mon Eco-cerveau a surchauffé. Réessaie ?" }]);
            }
            setIsChatting(false);
          }}
          onRequestLocation={() => {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
              p => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setIsLocating(false); },
              () => { setIsLocating(false); alert("Position requise pour les bornes."); }
            );
          }}
          chatMessages={chatMessages}
          isChatting={isChatting}
        />
      ) : (
        <div className="flex flex-col px-7 pt-12 pb-24 space-y-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <header className="text-center space-y-6">
            <div className="inline-flex p-8 bg-gradient-to-br from-emerald-50 to-white rounded-[3.5rem] shadow-2xl border border-emerald-100/50 relative animate-float">
              <span className="text-7xl" role="img" aria-label="Logo Recyclage">♻️</span>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-[900] text-slate-900 tracking-tight">EcoSnap</h1>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.6em]">Vision AI 2025</p>
            </div>
          </header>

          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-[2.4rem] blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
            <div className="relative">
              <input 
                type="text" 
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleProcess(query)} 
                placeholder="Quel déchet aujourd'hui ?" 
                aria-label="Rechercher un déchet"
                className="w-full bg-white rounded-[2.2rem] py-7 pl-9 pr-48 text-xl font-[800] shadow-2xl border border-slate-100 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300" 
              />
              <div className="absolute right-2.5 top-2.5 bottom-2.5 flex gap-2">
                <button 
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                      setIsCameraActive(true);
                      if (videoRef.current) videoRef.current.srcObject = stream;
                    } catch (e) { alert("Accès caméra refusé."); }
                  }} 
                  aria-label="Prendre une photo"
                  className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100 active:scale-90"
                >
                  <span className="text-2xl">📸</span>
                </button>
                <button 
                  onClick={() => handleProcess(query)} 
                  className="bg-slate-900 text-white px-7 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
                >
                  Scanner
                </button>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <h2 className="text-[11px] font-black mb-5 flex items-center gap-3 uppercase tracking-widest">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span> Insight du jour
            </h2>
            {dailyTip ? (
              <div className="relative z-10 space-y-3">
                <h3 className="text-emerald-400 font-black text-xs tracking-tight">{dailyTip.title}</h3>
                <p className="text-slate-300 text-sm font-bold leading-relaxed">{dailyTip.content}</p>
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-2.5 bg-slate-800 rounded-full w-1/3"></div>
                <div className="h-4 bg-slate-800 rounded-full w-full"></div>
              </div>
            )}
          </section>
          
          <AdBanner />
          
          <article className="space-y-8">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-2xl font-[900] text-slate-900 tracking-tight">Le guide 2025</h2>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Voir tout</span>
            </div>
            <div className="grid gap-5">
              {RECYCLING_GUIDE.map((g, i) => (
                <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group cursor-default">
                  <div className="flex items-center gap-4 mb-2">
                     <div className="w-2 h-8 bg-emerald-100 rounded-full group-hover:bg-emerald-500 transition-colors"></div>
                     <h3 className="font-black text-slate-900 text-lg group-hover:translate-x-1 transition-transform">{g.title}</h3>
                  </div>
                  <p className="text-slate-500 text-[13px] font-bold leading-relaxed pl-6">{g.content}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in duration-300">
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="p-10 flex justify-between items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent absolute bottom-0 left-0 right-0 backdrop-blur-md border-t border-white/5">
            <button onClick={() => {
              if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
              setIsCameraActive(false);
            }} className="text-white font-black text-[10px] tracking-[0.2em] uppercase bg-white/10 px-8 py-5 rounded-3xl border border-white/10 active:scale-90 transition-all">Retour</button>
            <button onClick={() => {
              const ctx = canvasRef.current?.getContext('2d');
              if (ctx && videoRef.current) {
                canvasRef.current!.width = videoRef.current.videoWidth;
                canvasRef.current!.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0);
                const base = canvasRef.current!.toDataURL('image/jpeg', 0.8).split(',')[1];
                if (videoRef.current.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
                setIsCameraActive(false);
                handleProcess({ data: base, mimeType: 'image/jpeg' });
              }
            }} aria-label="Déclencher la capture" className="w-24 h-24 bg-white rounded-full border-[10px] border-white/20 shadow-3xl active:scale-90 transition-all flex items-center justify-center">
               <div className="w-16 h-16 rounded-full border-4 border-slate-900/5"></div>
            </button>
            <div className="w-24"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 bg-white/98 z-[250] flex flex-col items-center justify-center p-10 text-center animate-in zoom-in duration-500">
          <div className="w-32 h-32 bg-emerald-50 rounded-[4rem] flex items-center justify-center animate-bounce mb-10 border border-emerald-100 shadow-2xl text-6xl shadow-emerald-200/50">♻️</div>
          <h2 className="text-4xl font-[950] text-slate-900 mb-4 tracking-tighter">SnapSort réfléchit...</h2>
          <p className="text-slate-400 font-bold mb-10">Identification du déchet en cours</p>
          <div className="w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden p-[2px]">
             <div className="h-full bg-emerald-500 rounded-full animate-[loading_2s_infinite]"></div>
          </div>
        </div>
      )}

      {modalContent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setModalContent(null)}>
          <div className="bg-white rounded-[3.5rem] p-12 max-w-sm w-full shadow-3xl animate-in slide-in-from-bottom-8 duration-500" onClick={e => e.stopPropagation()}>
            <div dangerouslySetInnerHTML={{ __html: modalContent }} className="text-sm font-bold text-slate-600 leading-relaxed prose prose-emerald" />
            <button onClick={() => setModalContent(null)} className="w-full mt-12 bg-slate-900 text-white py-6 rounded-[2.2rem] font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-emerald-600 transition-all">Compris !</button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default MainApp;