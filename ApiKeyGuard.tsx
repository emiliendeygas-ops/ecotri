import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        // Si l'objet n'existe pas encore (environnement de test simple), on laisse passer
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  if (hasKey === null) return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!hasKey) {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-[2rem] flex items-center justify-center text-5xl mb-8 animate-float">
          🔑
        </div>
        <h2 className="text-3xl font-[900] text-slate-900 mb-4 tracking-tight">Configuration Requise</h2>
        <p className="text-slate-500 font-medium mb-10 max-w-xs leading-relaxed">
          Veuillez sélectionner votre clé API payante pour accéder aux fonctionnalités d'IA avancées.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={handleOpenKey}
            className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all"
          >
            Sélectionner ma Clé API
          </button>
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-xs font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            Documentation Facturation ↗
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};