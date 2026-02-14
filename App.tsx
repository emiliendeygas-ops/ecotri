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
    
    // Tentative de localisation silencieuse
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        null, { timeout: 10000 }
      );
    }
    getDailyEcoTip().then(setDailyTip);
  }, []);

  // Forcer le scroll en haut quand un résultat arrive
  useEffect(() => {
    if (result) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }
  }, [result]);

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
        alert("Objet non reconnu. Essayez de décrire l'objet par texte.");
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      console.error(err);
      alert("Erreur de connexion avec l'IA.");
    }
  };

  const startCamera = async () => {
    try {
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setIsCameraActive(true);
      
      // Laisser le temps au DOM de monter le composant video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Auto-play failed:", e));
          };
        }
      }, 300);
    } catch (e) {
      alert("Accès à la caméra refusé. Vérifiez vos paramètres système.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  const gradeInfo = useMemo(() => {
    const GRADES = [
      { min: 0, label: "Graine d'Écolo", icon: "🌱" },
      { min: 50, label: "Apprenti Trieur", icon: "🌿" },
      { min: 150, label: "Ami de la Terre", icon: "🌍" },
      { min: 350, label: "Héros Local", icon: "🦸" }
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
              setChatMessages([...msgs, { role: 'model' as const, text: "Désolé, réessayez plus tard." }]);
            }
            setIsChatting(false);
          }}
          onRequestLocation={() => {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
              p => { 
                const newLoc = { lat: p.coords.latitude, lng: p.coords.longitude };
                setLocation(newLoc); 
                setIsLocating(false);
                if (result) findNearbyPoints(result.bin, result.itemName, newLoc.lat, newLoc.lng).then(pts => {
                  if (pts?.length) setResult(prev => prev ? { ...prev, nearbyPoints: pts } : null);
                });
              },
              () => { setIsLocating(false); alert("Position refusée."); },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }}
          chatMessages={chatMessages}
          isChatting={isChatting}
        />
      ) : (
        <div className="flex flex-col px-7 pt-12 pb-24 space-y-12">
          <header className="text-center space-y-4">
            <div className="inline-flex p-6 bg-emerald-50 rounded-[2.5rem] shadow-xl border border-emerald-100 animate-float">
              <span className="text-6xl" role="img" aria-label="Logo">♻️</span>
            </div>
            <h1 className="text-4xl font-[900] text-slate-900 tracking-tight">SnapSort</h1>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Intelligence de Tri • 2026</p>
          </header>

          <section className="relative">
            <input 
              type="text" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleProcess(query)} 
              placeholder="Quel déchet aujourd'hui ?" 
              className="w-full bg-white rounded-[2rem] py-6 pl-8 pr-40 text-lg font-[800] shadow-xl border border-slate-100 focus:border-emerald-500 outline-none transition-all" 
            />
            <div className="absolute right-2 top-2 bottom-2 flex gap-1.5">
              <button 
                onClick={startCamera} 
                className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100 active:scale-90"
              >
                📸
              </button>
              <button 
                onClick={() => handleProcess(query)} 
                className="bg-slate-900 text-white px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
              >
                Scanner
              </button>
            </div>
          </section>

          {dailyTip && (
            <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <h2 className="text-[10px] font-black mb-3 uppercase tracking-widest text-emerald-400">Conseil Futur 2026</h2>
              <h3 className="text-lg font-black mb-1">{dailyTip.title}</h3>
              <p className="text-slate-300 text-sm font-bold opacity-80">{dailyTip.content}</p>
            </section>
          )}
          
          <AdBanner />
          
          <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-900 px-2">Les bases du tri 2026</h2>
            <div className="grid gap-4">
              {RECYCLING_GUIDE.slice(0, 3).map((g, i) => (
                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-900 mb-2">{g.title}</h3>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">{g.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCameraActive && (
        <div className="fixed inset-0 bg-black z-[200] flex flex-col">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="flex-1 object-cover"
          />
          <div className="p-10 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
            <button onClick={stopCamera} className="text-white font-black text-[10px] uppercase tracking-widest px-6 py-4 rounded-2xl border border-white/20">Annuler</button>
            <button 
              onClick={() => {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && videoRef.current) {
                  canvasRef.current!.width = videoRef.current.videoWidth;
                  canvasRef.current!.height = videoRef.current.videoHeight;
                  ctx.drawImage(videoRef.current, 0, 0);
                  const base = canvasRef.current!.toDataURL('image/jpeg', 0.85).split(',')[1];
                  stopCamera();
                  handleProcess({ data: base, mimeType: 'image/jpeg' });
                }
              }} 
              className="w-24 h-24 bg-white rounded-full border-[8px] border-white/30 flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
            >
               <div className="w-16 h-16 rounded-full border-2 border-slate-300"></div>
            </button>
            <div className="w-20"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 bg-white z-[250] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center animate-bounce mb-8 border border-emerald-100 shadow-xl">♻️</div>
          <h2 className="text-3xl font-[950] text-slate-900 mb-2">Analyse IA 2026</h2>
          <p className="text-slate-400 font-bold mb-8">Identification et recherche de points...</p>
          <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 rounded-full animate-[loading_1.5s_infinite]"></div>
          </div>
        </div>
      )}

      {modalContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-6" onClick={() => setModalContent(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 max-h-[80vh] overflow-y-auto no-scrollbar shadow-2xl" onClick={e => e.stopPropagation()}>
            <div dangerouslySetInnerHTML={{ __html: modalContent }} />
            <button onClick={() => setModalContent(null)} className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest">Fermer</button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default MainApp;
