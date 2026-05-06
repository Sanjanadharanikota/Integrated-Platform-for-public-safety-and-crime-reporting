import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

export default function HotspotMap({ hotspots, riskColors }) {
  return (
    <MapContainer center={[17.385, 78.4867]} zoom={12} scrollWheelZoom className="map-canvas">
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hotspots.map((spot) => (
        <CircleMarker
          key={spot.location}
          center={[spot.lat, spot.lng]}
          radius={12 + spot.count * 2}
          pathOptions={{ color: '#fff', weight: 2, fillColor: riskColors[spot.risk], fillOpacity: 0.82 }}
        >
          <Popup>
            <strong>{spot.location}</strong>
            <p>{spot.count} incidents, risk {spot.risk}</p>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
