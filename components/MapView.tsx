
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
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<{lat: number, lng: number} | null>(null);

  // CRITIQUE MOBILE : ResizeObserver pour forcer l'affichage correct sur mobile
  useEffect(() => {
    if (!mapRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    });

    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    
    mapInstance.current = L.map(mapRef.current, { 
      zoomControl: false, 
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: false 
    }).setView([userLocation.lat, userLocation.lng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapInstance.current);
    
    L.circleMarker([userLocation.lat, userLocation.lng], { 
      radius: 9, 
      color: '#ffffff', 
      fillColor: '#10b981', 
      fillOpacity: 1,
      weight: 4,
    }).addTo(mapInstance.current).bindPopup("<div class='font-black text-[10px] uppercase'>Ma position</div>");

    mapInstance.current.on('moveend', () => {
      if (mapInstance.current) {
        const center = mapInstance.current.getCenter();
        setCurrentCenter({ lat: center.lat, lng: center.lng });
        setShowSearchButton(true);
      }
    });
    
    setTimeout(() => mapInstance.current?.invalidateSize(), 500);

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
              <div class="${isActive ? 'bg-emerald-600' : 'bg-slate-800'} w-10 h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-lg">
                ${isActive ? '📍' : '♻️'}
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 44]
        })
      }).addTo(mapInstance.current!);
      
      marker.bindPopup(`<div class="font-bold text-xs p-1">${p.name}</div>`);
      markersRef.current.push(marker);
      
      if (isActive) {
        marker.openPopup();
        mapInstance.current!.panTo([p.lat, p.lng], { animate: true });
        setShowSearchButton(false);
      }
    });

    if (validPoints.length > 0 && activeIndex === 0) {
      const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng], ...validPoints.map(p => [p.lat!, p.lng!] as [number, number])]);
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, activeIndex]);

  return (
    <div className="relative w-full">
      <div 
        ref={mapRef} 
        className="h-72 w-full rounded-[2.5rem] border border-slate-100 shadow-inner overflow-hidden relative z-0 touch-auto" 
        style={{ minHeight: '280px', background: '#f1f5f9' }}
      />
      
      {showSearchButton && !isSearching && (
        <div className="absolute top-4 left-0 right-0 z-[20] flex justify-center pointer-events-none">
          <button 
            onClick={() => {
              if (currentCenter && onSearchArea) {
                onSearchArea(currentCenter.lat, currentCenter.lng);
                setShowSearchButton(false);
              }
            }}
            className="pointer-events-auto bg-emerald-600 text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 flex items-center gap-2 ring-4 ring-white/30"
          >
            🔍 Rechercher ici
          </button>
        </div>
      )}

      {isSearching && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-[30] flex items-center justify-center rounded-[2.5rem]">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 border border-emerald-50">
            <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Mise à jour...</span>
          </div>
        </div>
      )}
    </div>
  );
};
