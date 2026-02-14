import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  points?: number;
  level?: string;
  gradeIcon?: string;
  progress?: number;
  showPointAnim?: boolean;
  onNavPrivacy?: () => void;
  onNavTerms?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  points = 0, 
  level = "Novice", 
  gradeIcon = "🌱",
  progress = 0,
  showPointAnim,
  onNavPrivacy,
  onNavTerms
}) => {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl shadow-emerald-900/5 border-x border-slate-50 relative selection:bg-emerald-100 font-['Plus_Jakarta_Sans']">
      <header className="px-6 py-5 flex flex-col gap-4 sticky top-0 bg-white/90 backdrop-blur-3xl z-[100] border-b border-slate-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => window.location.href = '/'}
              className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-emerald-200 rotate-2 hover:rotate-0 transition-all cursor-pointer active:scale-90"
            >
               <span className="text-white text-xl">♻️</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-xl tracking-tighter text-slate-900 leading-none">SnapSort</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] filter drop-shadow-sm">{gradeIcon}</span>
                <span className="text-[9px] font-[800] text-emerald-600 uppercase tracking-widest leading-none">{level}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <div className={`bg-slate-50 px-4 py-2.5 rounded-[1.2rem] flex items-center gap-2.5 border border-slate-100 shadow-sm transition-all duration-500 ${showPointAnim ? 'ring-4 ring-emerald-500/20 bg-emerald-50 border-emerald-100 scale-105' : ''}`}>
                <span className="text-emerald-500 text-sm animate-pulse">🍃</span>
                <span className="font-black text-sm text-slate-800 tracking-tight">{points}</span>
              </div>
              {showPointAnim && (
                <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black px-4 py-2.5 rounded-2xl animate-bounce shadow-2xl ring-4 ring-white whitespace-nowrap z-20">
                  ACTION ÉCO ! +10
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-[2px]">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
            style={{ width: `${Math.max(4, progress)}%` }} 
          />
        </div>
      </header>

      {/* Rendu fluide sans scroll-y interne pour favoriser le scroll natif de la fenêtre */}
      <main className="flex-1 bg-[#fcfdfe]">
        {children}
      </main>

      <footer className="p-12 bg-white border-t border-slate-50 mt-auto">
        <div className="text-center space-y-8">
          <div className="flex flex-col items-center gap-3">
             <div className="w-10 h-1 bg-slate-100 rounded-full"></div>
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">EcoSnap Intelligence • 2025-2026</p>
          </div>
          
          <nav className="flex flex-row justify-center items-center gap-x-6 text-slate-400">
            <button onClick={onNavPrivacy} className="text-[10px] font-black hover:text-emerald-600 transition-colors uppercase tracking-[0.2em]">Privacy</button>
            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
            <button onClick={onNavTerms} className="text-[10px] font-black hover:text-emerald-600 transition-colors uppercase tracking-[0.2em]">Terms</button>
          </nav>
          
          <p className="text-[11px] text-slate-400/80 px-4 leading-relaxed font-semibold italic">
            "Pour un avenir durable, chaque geste de tri en 2026 construit le monde de demain."
          </p>
          
          <div className="pt-4 flex justify-center items-center gap-2 opacity-40">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">System 2026 Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};