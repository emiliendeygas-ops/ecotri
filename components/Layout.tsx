
import React, { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  points?: number;
  level?: string;
  showPointAnim?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, points = 0, level = "Novice", showPointAnim }) => {
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl shadow-slate-200/50 border-x border-slate-50 relative selection:bg-emerald-100">
      <header className="px-6 py-5 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-xl z-[100] border-b border-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200/50 -rotate-3 transition-transform hover:rotate-0 cursor-pointer">
             <span className="text-white text-lg">♻️</span>
          </div>
          <div>
            <h1 className="font-[900] text-lg tracking-tight text-slate-900 leading-none">EcoTri</h1>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{level}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSecurityInfo(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 transition-all"
            title="Sécurité et Confidentialité"
          >
            <span className="text-sm">🛡️</span>
          </button>
          
          <div className="relative">
            <div className={`bg-slate-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-slate-100 transition-all duration-300 ${showPointAnim ? 'scale-110 border-emerald-300 bg-emerald-50' : ''}`}>
              <span className="text-emerald-500 text-sm animate-pulse">🍃</span>
              <span className="font-[900] text-sm text-slate-700">{points}</span>
            </div>
            {showPointAnim && (
              <div className="absolute -top-10 right-0 bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full animate-bounce shadow-xl ring-4 ring-emerald-50">
                BRAVO ! +10
              </div>
            )}
          </div>
        </div>
      </header>

      {showSecurityInfo && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative">
              <h2 className="text-2xl font-[900] text-slate-900 mb-2">Sécurité & Privée</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Votre clé API est sécurisée par <strong>restriction de domaine (Referrer)</strong> sur Google Cloud, garantissant qu'elle ne peut être utilisée que depuis cette URL officielle.
              </p>
              <div className="space-y-3 mt-6">
                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-emerald-500">🔒</span>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Données chiffrées de bout en bout</p>
                </div>
                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-emerald-500">🌐</span>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">Restriction d'accès par domaine actif</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSecurityInfo(false)}
                className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar bg-gradient-to-b from-white to-slate-50/30">
        {children}
      </main>

      <footer className="p-8 bg-white text-center border-t border-slate-50">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">EcoTri Pro • Version 2025.2</p>
        <div className="flex justify-center gap-6 opacity-20">
          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        </div>
      </footer>
    </div>
  );
};
