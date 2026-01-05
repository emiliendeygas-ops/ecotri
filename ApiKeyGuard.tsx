
import React, { useState, useEffect } from 'react';

interface ApiKeyGuardProps {
  children: React.ReactNode;
}

export const ApiKeyGuard: React.FC<ApiKeyGuardProps> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    const verifyKey = async () => {
      // 1. Vérification de la clé injectée au build (Production)
      try {
        const envKey = process.env.API_KEY;
        if (envKey && envKey.length > 10) {
          setStatus('ready');
          return;
        }
      } catch (e) {
        // process.env peut ne pas être défini du tout dans certains cas
      }

      // 2. Vérification du bridge AI Studio (Développement)
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
        setStatus('ready');
      } catch (e) {
        console.error("Erreur sélecteur:", e);
        alert("Erreur lors de l'ouverture du sélecteur.");
      }
    } else {
      alert("Le sélecteur de clé n'est disponible qu'en environnement de développement (AI Studio). Pour la version publiée, configurez le secret API_KEY dans GitHub avant le déploiement.");
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
          La clé API n'a pas été trouvée. Si vous voyez ce message en production, vérifiez vos secrets GitHub.
        </p>
        
        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={handleSelectKey}
            className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all hover:bg-emerald-700"
          >
            Utiliser le sélecteur (Dev uniquement)
          </button>
          
          <div className="p-6 bg-white rounded-3xl border border-slate-100 text-left">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instructions Production</h4>
            <p className="text-xs text-slate-600 leading-normal">
              Ajoutez un secret nommé <strong>API_KEY</strong> dans les paramètres de votre dépôt GitHub pour activer l'IA en production.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
