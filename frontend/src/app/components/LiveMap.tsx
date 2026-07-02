'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icons in react-leaflet
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const busIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Bus icon
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const userIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png', // User icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function LiveMap({
  userLat = 23.8759,
  userLng = 90.3205, // DSA
  busLat = 23.8759,
  busLng = 90.3205,
  busDistance = 0,
  showUser = true,
  passengers = [] // array of {lat, lng, name}
}: any) {
  
  // Calculate bus location based on distance from user (mock logic for demo)
  // 1 degree lat/lng is roughly 111km. So 0.009 is ~1km
  const mockBusLat = showUser ? userLat - (busDistance * 0.009) : busLat;
  const mockBusLng = showUser ? userLng - (busDistance * 0.009) : busLng;

  return (
    <MapContainer center={[userLat, userLng]} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 1 }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
      />
      {showUser && (
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      <Marker position={[mockBusLat, mockBusLng]} icon={busIcon}>
        <Popup>Bus Location</Popup>
      </Marker>
      {passengers.map((p: any, i: number) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={userIcon}>
          <Popup>Passenger: {p.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
