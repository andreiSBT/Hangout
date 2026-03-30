"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, getCategoryInfo, formatDate } from "@/lib/shared";

// Fix leaflet default icon
const icon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type Props = {
  activities: Activity[];
  onSelect: (id: string) => void;
};

export default function MapView({ activities, onSelect }: Props) {
  const center = activities.length > 0
    ? [Number(activities[0].lat), Number(activities[0].lng)] as [number, number]
    : [44.4268, 26.1025] as [number, number]; // Bucharest default

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="w-full h-full min-h-[calc(100vh-64px)]"
      style={{ background: "var(--bg)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {activities.map((a) => {
        if (!a.lat || !a.lng) return null;
        const cat = getCategoryInfo(a.category);
        return (
          <Marker key={a.id} position={[Number(a.lat), Number(a.lng)]} icon={icon}>
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{cat.icon} {a.title}</div>
                <div className="text-gray-500">{a.location}</div>
                <div className="text-gray-500">{formatDate(a.date)}</div>
                <button
                  onClick={() => onSelect(a.id)}
                  className="mt-2 px-3 py-1 bg-orange-500 text-white rounded-lg text-xs font-semibold"
                >
                  Detalii →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
