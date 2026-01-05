
import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

/**
 * ApiKeyGuard gère l'accès à l'application en vérifiant la présence d'une clé API.
 * Si aucune clé n'est trouvée dans process.env, il propose l'utilisation du sélecteur natif.
 */
export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    const verifyKey = async () => {
      // 1. Vérification de la clé d'environnement
      const envKey = process.env.API_KEY;
      if (envKey && envKey !== 'undefined' && envKey.length > 10) {
        setStatus('ready');
        return;
      }

      // 2. Vérification du bridge AI Studio (si disponible)
      // @ts-ignore
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        try {
          // @ts-ignore
          const hasSelected = await window.aistudio.hasSelectedApiKey();
          if (hasSelected) {
            setStatus('ready');
            return;
          }
        } catch (e) {
          console.warn("Erreur vérification bridge:", e);
        }
      }

      setStatus('missing');
    };

    verifyKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // On force le passage à l'état prêt car le bridge injectera la clé dynamiquement
        setStatus('ready');
      } catch (e) {
        console.error("Erreur ouverture sélecteur:", e);
        alert("Impossible d'ouvrir le sélecteur de clé.");
      }
    } else {
      alert("Le sélecteur de clé n'est pas disponible sur ce domaine. Veuillez configurer la clé API dans votre environnement Firebase.");
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
        <h2 className="text-3xl font-[900] text-slate-900 mb-4 tracking-tight">Configuration Requise</h2>
        <p className="text-slate-500 font-medium mb-10 max-w-sm leading-relaxed">
          Pour faire fonctionner l'analyse de tri, vous devez connecter votre propre clé API Gemini ou configurer l'environnement Firebase.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={handleSelectKey}
            className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700"
          >
            Connecter ma clé API
          </button>
          
          <div className="p-6 bg-white rounded-3xl border border-slate-100 text-left">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aide développeur</h4>
            <p className="text-xs text-slate-600 leading-normal">
              Si vous êtes le propriétaire, assurez-vous d'avoir injecté <code className="bg-slate-100 px-1">API_KEY</code> lors du build de votre application.
            </p>
          </div>
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            Documentation Google AI ↗
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
