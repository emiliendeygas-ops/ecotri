
import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    const verifyKey = async () => {
      // 1. Vérification de la clé d'environnement (Firebase Secrets / GCP)
      // Protection contre process undefined
      const envKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
      
      if (envKey && envKey !== 'undefined' && envKey.length > 10) {
        setStatus('ready');
        return;
      }

      // 2. Vérification du bridge AI Studio
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        try {
          const hasSelected = await aistudio.hasSelectedApiKey();
          if (hasSelected) {
            setStatus('ready');
            return;
          }
        } catch (e) {
          console.warn("Vérification bridge ignorée:", e);
        }
      }

      setStatus('missing');
    };

    verifyKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // On assume le succès pour éviter les race conditions
        setStatus('ready');
      } catch (e) {
        console.error("Erreur sélecteur:", e);
        alert("Erreur lors de l'ouverture du sélecteur.");
      }
    } else {
      alert("Le sélecteur de clé n'est pas disponible. Si vous êtes en production, la clé doit être configurée dans les secrets Firebase.");
    }
  };

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'missing') {
    return (
      <div className="fixed inset-0 bg-slate-50 z-[200] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-[3rem] shadow-xl flex items-center justify-center text-5xl mb-8 animate-float border border-emerald-50">
          🔑
        </div>
        <h2 className="text-3xl font-[900] text-slate-900 mb-4 tracking-tight">EcoTri nécessite une clé</h2>
        <p className="text-slate-500 font-medium mb-10 max-w-sm leading-relaxed">
          Pour analyser vos déchets avec l'intelligence artificielle, connectez votre projet Google Cloud.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={handleSelectKey}
            className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700"
          >
            Sélectionner ma Clé API
          </button>
          
          <div className="p-6 bg-white rounded-3xl border border-slate-100 text-left">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note sur la facturation</h4>
            <p className="text-xs text-slate-600 leading-normal">
              Utilisez un projet avec facturation activée pour profiter des cartes et de la génération d'images.
            </p>
          </div>
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            En savoir plus sur la facturation ↗
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
