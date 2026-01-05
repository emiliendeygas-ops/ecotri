import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl shadow-slate-100 border-x border-slate-50">
    <header className="px-8 py-6 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 rotate-3">
           <span className="text-white text-lg">♻️</span>
        </div>
        <div>
          <h1 className="font-[900] text-xl tracking-tight text-slate-900 leading-none">EcoTri</h1>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">France</span>
        </div>
      </div>
      <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors">
        <span className="text-lg">✨</span>
      </button>
    </header>
    <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
    <footer className="p-10 bg-slate-50/50 text-center border-t border-slate-50">
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Eco-Responsable • 2025</p>
      <div className="flex justify-center gap-10 opacity-30">
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
      </div>
    </footer>
  </div>
);