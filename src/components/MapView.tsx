import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DayPlan, Coordinates } from '../services/geminiService';

// Fix for default marker icons in Leaflet using CDN
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  day: DayPlan;
  center: Coordinates;
  primaryColor: string;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

// Custom marker icons using CSS for colors
const createMarkerIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const startIcon = createMarkerIcon('#10b981'); // Emerald-500
const endIcon = createMarkerIcon('#f43f5e');   // Rose-500
const defaultIcon = createMarkerIcon('#3b82f6'); // Blue-500

export default function MapView({ day, center, primaryColor }: MapViewProps) {
  const points = [
    ...(day.activities || []).map(a => ({ ...a, type: 'activity' })),
    ...(day.restaurants || []).map(r => ({ ...r, type: 'restaurant' })),
    { ...day.accommodation, type: 'accommodation' }
  ];

  const polylinePoints: [number, number][] = points.map(p => [p.coords.lat, p.coords.lng]);
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner border border-gray-100">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={[center.lat, center.lng]} />
        
        {points.map((p, i) => {
          const isStart = p === startPoint;
          const isEnd = p === endPoint;
          const icon = isStart ? startIcon : isEnd ? endIcon : defaultIcon;
          
          return (
            <Marker key={i} position={[p.coords.lat, p.coords.lng]} icon={icon}>
              <Popup>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isStart && <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[8px] font-bold rounded uppercase">Départ</span>}
                    {isEnd && <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-bold rounded uppercase">Arrivée</span>}
                    <h3 className="font-bold text-sm">{p.name}</h3>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{p.description}</p>
                  <div className="mt-2 text-[10px] uppercase tracking-wider font-bold opacity-50">
                    {p.type === 'activity' ? 'Activité' : p.type === 'restaurant' ? 'Restaurant' : 'Hébergement'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <Polyline 
          positions={polylinePoints} 
          pathOptions={{ color: primaryColor, weight: 3, dashArray: '10, 10', opacity: 0.6 }} 
        />
      </MapContainer>
    </div>
  );
}
