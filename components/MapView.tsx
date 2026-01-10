
import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';

interface MapViewProps {
  points: any[];
  userLocation: { lat: number, lng: number };
  activeIndex?: number;
  onSearchArea?: (lat: number, lng: number) => void;
  isSearching?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ 
  points, 
  userLocation, 
  activeIndex = 0, 
  onSearchArea,
  isSearching 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    
    // Initialisation avec des options optimisées pour le mobile
    mapInstance.current = L.map(mapRef.current, { 
      zoomControl: false, 
      attributionControl: false,
      tap: false, // Désactivé pour éviter les conflits de clics sur mobile
      dragging: true,
      touchZoom: true
    }).setView([userLocation.lat, userLocation.lng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapInstance.current);
    
    // Marqueur fixe de l'utilisateur
    L.circleMarker([userLocation.lat, userLocation.lng], { 
      radius: 9, 
      color: '#ffffff', 
      fillColor: '#10b981', 
      fillOpacity: 1,
      weight: 4,
    }).addTo(mapInstance.current).bindPopup("<div class='font-black text-[10px] uppercase'>Vous êtes ici</div>");

    // CRITIQUE : Forcer le calcul de la taille pour mobile
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 250);

    // Détection du mouvement de la carte
    mapInstance.current.on('moveend', () => {
      const center = mapInstance.current.getCenter();
      setCurrentCenter({ lat: center.lat, lng: center.lng });
      setShowSearchButton(true);
    });
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('moveend');
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [userLocation.lat, userLocation.lng]);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Nettoyage des anciens marqueurs
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const validPoints = points.filter(p => p.lat !== undefined && p.lng !== undefined);
    
    validPoints.forEach((p, idx) => {
      const isActive = idx === activeIndex;
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ 
          className: 'custom-pin-icon', 
          html: `
            <div class="flex items-center justify-center w-12 h-12 transition-all duration-300 ${isActive ? 'scale-125 z-[1000]' : 'scale-90 opacity-70'}">
              <div class="${isActive ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-800'} w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-lg ring-4 ring-black/5">
                ${isActive ? '📍' : '♻️'}
              </div>
              <div class="absolute bottom-[-2px] w-2.5 h-2.5 ${isActive ? 'bg-emerald-600' : 'bg-slate-800'} rotate-45"></div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 44]
        })
      }).addTo(mapInstance.current);
      
      marker.bindPopup(`<div class="font-bold text-xs p-1">${p.name}</div>`);
      markersRef.current.push(marker);
      
      if (isActive) {
        marker.openPopup();
        mapInstance.current.panTo([p.lat, p.lng], { animate: true });
        setShowSearchButton(false);
      }
    });

    if (validPoints.length > 0 && markersRef.current.length === validPoints.length && activeIndex === 0) {
      const bounds: L.LatLngExpression[] = [[userLocation.lat, userLocation.lng], ...validPoints.map(p => [p.lat!, p.lng!] as L.LatLngExpression)];
      mapInstance.current.fitBounds(bounds, { 
        padding: [60, 60], 
        animate: true, 
        maxZoom: 16 
      });
      setShowSearchButton(false);
    }
    
    // Recalculer la taille après avoir ajouté des points (mobile fix)
    mapInstance.current.invalidateSize();
  }, [points, activeIndex]);

  const handleSearchClick = () => {
    if (currentCenter && onSearchArea) {
      onSearchArea(currentCenter.lat, currentCenter.lng);
      setShowSearchButton(false);
    }
  };

  return (
    <div className="relative group w-full">
      <div 
        ref={mapRef} 
        className="h-72 sm:h-80 w-full rounded-[2.5rem] border border-slate-100 shadow-inner overflow-hidden relative z-0 touch-none" 
        style={{ minHeight: '280px' }}
      />
      
      {showSearchButton && !isSearching && (
        <div className="absolute top-6 left-0 right-0 z-[20] animate-in flex justify-center pointer-events-none">
          <button 
            onClick={handleSearchClick}
            className="pointer-events-auto bg-emerald-600 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap ring-4 ring-white/30"
          >
            <span className="text-sm">🔍</span> Rechercher ici
          </button>
        </div>
      )}

      {isSearching && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[30] flex items-center justify-center rounded-[2.5rem]">
          <div className="bg-white px-6 py-4 rounded-3xl shadow-xl flex items-center gap-3 border border-emerald-100 animate-pulse">
            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mise à jour...</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-[10]">
        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-100 shadow-sm text-[9px] font-black text-slate-600 uppercase tracking-widest">
          {points.length > 0 ? `Points : ${points.filter(p => p.lat).length}` : "Bornes"}
        </div>
      </div>
    </div>
  );
};
