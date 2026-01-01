
import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';

export const MapView: React.FC<{ points: any[], userLocation: any }> = ({ points, userLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([userLocation.lat, userLocation.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
    L.circleMarker([userLocation.lat, userLocation.lng], { radius: 6, color: '#10b981', fillOpacity: 1 }).addTo(mapInstance.current);
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstance.current) return;
    points.forEach(p => {
      if (p.lat && p.lng) {
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: '', html: '<div class="bg-emerald-600 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px]">📍</div>' })
        }).addTo(mapInstance.current);
      }
    });
  }, [points]);

  return <div ref={mapRef} className="h-48 w-full border border-slate-100 shadow-inner" />;
};
