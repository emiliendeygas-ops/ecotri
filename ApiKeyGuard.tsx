import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    // On assume le succès selon les instructions (gestion du race condition)
    setHasKey(true);
  };

  if (hasKey === null) return null; // Chargement silencieux

  if (!hasKey) {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center justify-center p-8 text-center animate-in">
        <div className="w-24 h-24 bg-emerald-100 rounded-[2rem] flex items-center justify-center text-5xl mb-8 animate-float">
          🔑
        </div>
        <h2 className="text-3xl font-[900] text-slate-900 mb-4 tracking-tight">Configuration Requise</h2>
        <p className="text-slate-500 font-medium mb-10 max-w-xs leading-relaxed">
          Pour utiliser les fonctions d'analyse intelligente haute performance, vous devez sélectionner une clé API liée à un projet facturable.
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

        <p className="mt-12 text-[10px] text-slate-300 font-bold max-w-[200px]">
          Vos données restent privées et sécurisées via l'interface Google AI Studio.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};