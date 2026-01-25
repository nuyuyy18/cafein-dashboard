import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

interface CafeMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export function CafeMap({ 
  markers, 
  center = [-6.2088, 106.8456], // Jakarta default
  zoom = 12,
  selectedId,
  onMarkerClick,
  className = ''
}: CafeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers
    markers.forEach(marker => {
      if (marker.lat && marker.lng) {
        const leafletMarker = L.marker([marker.lat, marker.lng])
          .addTo(mapRef.current!)
          .bindPopup(`
            <div class="p-2">
              <strong class="text-foreground">${marker.name}</strong>
              ${marker.address ? `<p class="text-sm text-muted-foreground mt-1">${marker.address}</p>` : ''}
            </div>
          `);

        if (onMarkerClick) {
          leafletMarker.on('click', () => onMarkerClick(marker.id));
        }

        markersRef.current[marker.id] = leafletMarker;
      }
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const validMarkers = markers.filter(m => m.lat && m.lng);
      if (validMarkers.length > 0) {
        const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [markers, onMarkerClick]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;

    const marker = markersRef.current[selectedId];
    if (marker) {
      const latLng = marker.getLatLng();
      mapRef.current.setView(latLng, 15, { animate: true });
      marker.openPopup();
    }
  }, [selectedId]);

  return (
    <div 
      ref={containerRef} 
      className={`h-full w-full rounded-lg ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}
