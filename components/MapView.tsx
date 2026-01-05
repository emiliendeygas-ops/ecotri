
import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';

export const MapView: React.FC<{ points: any[], userLocation: any }> = ({ points, userLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    
    mapInstance.current = L.map(mapRef.current, { 
      zoomControl: false, 
      attributionControl: false 
    }).setView([userLocation.lat, userLocation.lng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
    
    L.circleMarker([userLocation.lat, userLocation.lng], { 
      radius: 8, 
      color: '#10b981', 
      fillColor: '#10b981', 
      fillOpacity: 1,
      weight: 3,
      className: 'pulse-marker'
    }).addTo(mapInstance.current);
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds: any[] = [[userLocation.lat, userLocation.lng]];

    points.forEach(p => {
      if (p.lat && p.lng) {
        const marker = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ 
            className: '', 
            html: '<div class="bg-slate-900 w-8 h-8 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white text-[12px] transform -translate-x-1/2 -translate-y-1/2 animate-in">📍</div>' 
          })
        }).addTo(mapInstance.current);
        
        markersRef.current.push(marker);
        bounds.push([p.lat, p.lng]);
      }
    });

    if (bounds.length > 1) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], animate: true });
    } else {
      mapInstance.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    }
  }, [points, userLocation]);

  return <div ref={mapRef} className="h-56 w-full rounded-[2rem] border border-slate-100 shadow-inner overflow-hidden" />;
};
