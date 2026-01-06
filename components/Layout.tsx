
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
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl shadow-slate-200/50 border-x border-slate-50 relative selection:bg-emerald-100">
      <header className="px-6 py-5 flex flex-col gap-3 sticky top-0 bg-white/90 backdrop-blur-xl z-[100] border-b border-slate-50/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => window.location.reload()}
              className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 -rotate-3 transition-transform hover:rotate-0 cursor-pointer"
            >
               <span className="text-white text-lg">♻️</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-[900] text-lg tracking-tight text-slate-900 leading-none">EcoTri</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs">{gradeIcon}</span>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">{level}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={`bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-100 transition-all duration-300 ${showPointAnim ? 'scale-110 border-emerald-300 bg-emerald-50' : ''}`}>
                <span className="text-emerald-500 text-sm animate-pulse">🍃</span>
                <span className="font-[900] text-sm text-slate-700">{points}</span>
              </div>
              {showPointAnim && (
                <div className="absolute -top-10 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full animate-bounce shadow-xl ring-4 ring-emerald-50 whitespace-nowrap">
                  BRAVO ! +10
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar bg-gradient-to-b from-white to-slate-50/30">
        {children}
      </main>

      <footer className="p-8 bg-white border-t border-slate-50">
        <div className="text-center space-y-4">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">EcoTri Pro • CITEO 2025</p>
          
          <nav className="flex justify-center gap-4">
            <button onClick={onNavPrivacy} className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors">Confidentialité</button>
            <span className="text-slate-200">|</span>
            <button onClick={onNavTerms} className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors">Conditions</button>
            <span className="text-slate-200">|</span>
            <a href="mailto:contact@ecotri.fr" className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors">Contact</a>
          </nav>
          
          <p className="text-[10px] text-slate-300 px-4 leading-relaxed">
            EcoTri utilise l'intelligence artificielle pour simplifier le tri. Nous nous basons sur les directives nationales de l'ADEME et de CITEO France.
          </p>
          
          <div className="flex justify-center gap-6 opacity-20 pt-4">
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
          </div>
        </div>
      </footer>
    </div>
  );
};
