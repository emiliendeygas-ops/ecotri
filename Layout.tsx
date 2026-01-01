import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-sm ring-1 ring-slate-200">
    <header className="px-6 py-5 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center border-b border-slate-100">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <span className="text-white text-xl">♻️</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 leading-none">EcoTri</h1>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Intelligent</span>
        </div>
      </div>
      <button className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors">
        <span className="text-lg">⚙️</span>
      </button>
    </header>
    <main className="flex-1">{children}</main>
    <footer className="p-8 text-center bg-slate-50">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Agir pour la planète • 2025</p>
      <div className="flex justify-center gap-6">
        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
        <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
      </div>
    </footer>
  </div>
);