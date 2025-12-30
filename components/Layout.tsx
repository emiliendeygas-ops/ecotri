
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden">
    <header className="p-6 bg-emerald-600 text-white flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-white p-2 rounded-xl text-emerald-600 font-black">♻️</div>
        <h1 className="text-2xl font-black tracking-tight">EcoTri</h1>
      </div>
      <button className="bg-white/20 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-white/30 transition-all">
        Soutenir ☕️
      </button>
    </header>
    <main className="flex-1 overflow-y-auto">{children}</main>
    <footer className="p-8 text-center border-t border-slate-100 bg-slate-50">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">EcoTri © 2025 • Guide de tri durable</p>
      <div className="flex justify-center gap-4 text-emerald-600 text-[10px] font-bold">
        <button className="hover:underline">Conditions</button>
        <button className="hover:underline">Partenaires</button>
      </div>
    </footer>
  </div>
);
