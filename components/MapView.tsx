import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface MapViewProps {
  points: any[];
  userLocation: { lat: number, lng: number };
  activeIndex?: number;
  onSearchArea?: (lat: number, lng: number) => void;
  isSearching?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({ 
  points, userLocation, activeIndex = 0, onSearchArea, isSearching 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
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
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
    
    L.circleMarker([userLocation.lat, userLocation.lng], { 
      radius: 8, color: '#ffffff', fillColor: '#10b981', fillOpacity: 1, weight: 3,
    }).addTo(mapInstance.current).bindPopup("<div class='font-bold text-[10px] uppercase'>Vous êtes ici</div>");

    mapInstance.current.on('moveend', () => {
      if (mapInstance.current) {
        const center = mapInstance.current.getCenter();
        setCurrentCenter({ lat: center.lat, lng: center.lng });
        setShowSearchButton(true);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [userLocation]);

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
          html: `<div class="flex items-center justify-center w-10 h-10 transition-all duration-300 ${isActive ? 'scale-125 z-[1000]' : 'scale-90 opacity-80'}"><div class="${isActive ? 'bg-emerald-600' : 'bg-slate-800'} w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-sm">📍</div></div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(mapInstance.current!);
      
      marker.bindPopup(`<div class="font-bold text-xs">${p.name}</div>`);
      markersRef.current.push(marker);
      
      if (isActive) {
        marker.openPopup();
        mapInstance.current!.panTo([p.lat, p.lng], { animate: true });
        setShowSearchButton(false);
      }
    });

    if (validPoints.length > 0 && activeIndex === 0) {
      const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng], ...validPoints.map(p => [p.lat!, p.lng!] as [number, number])]);
      mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [points, activeIndex, userLocation]);

  return (
    <div className="relative w-full h-72 group">
      <div ref={mapRef} className="h-full w-full rounded-[2.5rem] border border-slate-100 shadow-inner overflow-hidden z-0" style={{ background: '#f8fafc' }} />
      {showSearchButton && !isSearching && (
        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
          <button 
            onClick={() => { if (currentCenter && onSearchArea) onSearchArea(currentCenter.lat, currentCenter.lng); setShowSearchButton(false); }} 
            className="bg-emerald-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-colors"
          >
            Rechercher ici
          </button>
        </div>
      )}
      {isSearching && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-[2.5rem]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-black text-emerald-700 uppercase">Recherche...</span>
          </div>
        </div>
      )}
    </div>
  );
};