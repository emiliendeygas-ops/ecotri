
import React, { useState } from 'react';
import { SortingResult } from '../types';
import { BIN_MAPPING } from '../constants';
import { MapView } from './MapView';
import { AdBanner } from './AdBanner';

interface ResultCardProps {
  result: SortingResult;
  userLocation?: any;
  isLocating?: boolean;
  onReset: () => void;
  onAskQuestion: (q: string) => void;
  onRequestLocation: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  result, 
  userLocation, 
  isLocating, 
  onReset, 
  onAskQuestion,
  onRequestLocation 
}) => {
  const binInfo = BIN_MAPPING[result.bin] || BIN_MAPPING['GRIS'];
  const [activePoint, setActivePoint] = useState(0);

  const handleShare = async () => {
    const text = `EcoTri : Le déchet "${result.itemName}" se jette dans le ${binInfo.label} ! ♻️\n\n${result.explanation}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EcoTri - Guide de tri',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Partage annulé');
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Consigne copiée !');
      } catch (err) {
        alert('Erreur.');
      }
    }
  };

  return (
    <div className="animate-in pb-12">
      <div className={`${binInfo.color} p-12 text-center relative overflow-hidden transition-colors duration-500`}>
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none text-9xl">♻️</div>
        
        <div className="mb-8 flex justify-center">
          {result.imageUrl ? (
            <div className="p-5 bg-white/40 backdrop-blur-xl rounded-[3rem] shadow-2xl ring-1 ring-white/50 animate-float">
              <img src={result.imageUrl} alt={result.itemName} className="w-32 h-32 object-contain" />
            </div>
          ) : (
            <div className="w-32 h-32 bg-white/20 rounded-[3rem] animate-pulse flex items-center justify-center text-4xl">
              📦
            </div>
          )}
        </div>

        <h2 className={`text-4xl font-[900] capitalize mb-4 ${binInfo.text} tracking-tight`}>{result.itemName}</h2>
        <div className="inline-flex items-center gap-3 bg-white px-8 py-3 rounded-full shadow-xl">
          <div className={`w-3 h-3 rounded-full ${binInfo.color} animate-pulse`}></div>
          <span className="font-black text-slate-800 text-xs uppercase tracking-[0.2em]">{binInfo.label}</span>
        </div>
      </div>

      <div className="bg-white -mt-10 rounded-t-[4rem] p-8 space-y-10 relative z-10 shadow-2xl">
        <AdBanner adSlot="5112143646" /> 

        <section>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full"></span> Consigne de tri
            </h3>
            <button 
              onClick={handleShare}
              className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm active:scale-90"
            >
              <span className="text-lg">📤</span>
            </button>
          </div>
          <p className="text-slate-800 font-bold text-xl leading-snug">{result.explanation}</p>
        </section>

        {result.impact && (
          <section className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100 flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Votre impact écologique</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl mb-1">☁️</span>
                <span className="block text-[10px] font-black text-slate-400 uppercase">CO2</span>
                <span className="text-sm font-bold text-emerald-600">-{result.impact.co2Saved}g</span>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl mb-1">💧</span>
                <span className="block text-[10px] font-black text-slate-400 uppercase">Eau</span>
                <span className="text-sm font-bold text-emerald-600">{result.impact.waterSaved}L</span>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl mb-1">⚡</span>
                <span className="block text-[10px] font-black text-slate-400 uppercase">Énergie</span>
                <span className="text-[9px] font-bold text-emerald-600 leading-tight">{result.impact.energySaved}</span>
              </div>
            </div>
          </section>
        )}

        {result.tips.length > 0 && (
          <section className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Conseils pratiques</h3>
            <ul className="space-y-3">
              {result.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-3 text-slate-600 font-bold text-sm">
                  <span className="text-emerald-500">✔</span> {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section Localisation Dynamique */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
            Où jeter ? <span>📍</span>
          </h3>
          
          {!userLocation ? (
            <div className="bg-slate-50 p-8 rounded-[2.5rem] text-center border border-dashed border-slate-200">
              <span className="text-3xl block mb-3">🌍</span>
              <p className="text-slate-500 text-sm font-bold mb-6">Autorisez la localisation pour trouver les points de collecte proches de vous.</p>
              <button 
                onClick={onRequestLocation}
                className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Activer la localisation
              </button>
            </div>
          ) : isLocating ? (
            <div className="bg-slate-50 p-12 rounded-[2.5rem] text-center flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Recherche des bornes...</p>
            </div>
          ) : result.nearbyPoints && result.nearbyPoints.length > 0 ? (
            <div className="space-y-6">
              <MapView points={[result.nearbyPoints[activePoint]]} userLocation={userLocation} />
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {result.nearbyPoints.map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActivePoint(i)} 
                    className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black border-2 transition-all ${i === activePoint ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {p.name.length > 18 ? p.name.slice(0, 15) + '...' : p.name}
                  </button>
                ))}
              </div>
              <a href={result.nearbyPoints[activePoint].uri} target="_blank" rel="noopener noreferrer" className="block text-center bg-emerald-50 text-emerald-700 py-4 rounded-2xl font-black text-sm border border-emerald-100 hover:bg-emerald-100 transition-colors">
                Itinéraire Google Maps ↗
              </a>
            </div>
          ) : (
            <div className="bg-slate-50 p-8 rounded-[2.5rem] text-center border border-slate-100">
              <p className="text-slate-500 text-sm font-bold">Aucun point spécifique trouvé à proximité immédiate pour ce déchet.</p>
            </div>
          )}
        </section>

        {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
          <section>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Questions fréquentes</h3>
            <div className="space-y-2">
              {result.suggestedQuestions.map((q, i) => (
                <button 
                  key={i}
                  onClick={() => onAskQuestion(q)}
                  className="w-full text-left p-4 bg-white border border-slate-100 rounded-2xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors flex justify-between items-center group"
                >
                  <span>{q}</span>
                  <span className="text-emerald-300 group-hover:text-emerald-500 transition-colors">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <button 
          onClick={onReset} 
          className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg shadow-2xl active:scale-95 transition-all mt-4"
        >
          Chercher autre chose
        </button>
      </div>
    </div>
  );
};
