import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-2xl shadow-slate-200">
    <header className="px-8 py-6 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-sm">♻️</div>
        <span className="font-[800] text-xl tracking-tight text-slate-900">EcoTri</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-lg hover:bg-slate-100 transition-colors">✨</button>
      </div>
    </header>
    <main className="flex-1">{children}</main>
    <footer className="p-10 bg-slate-50 text-center">
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Planète Durable • 2025</p>
      <div className="flex justify-center gap-8 opacity-40">
        <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
        <div className="w-8 h-1 bg-slate-300 rounded-full"></div>
      </div>
    </footer>
  </div>
);