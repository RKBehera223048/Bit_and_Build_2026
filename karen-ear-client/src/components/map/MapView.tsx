// ============================================================
// Map View — NYC map with incident markers
// ============================================================

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useIncidentStore, useUIStore } from "../../stores";
import { TRIAGE_COLORS, TRIAGE_LABELS, INCIDENT_TYPE_LABELS } from "../../types";
import type { Incident } from "../../types";
import "leaflet/dist/leaflet.css";

// NYC center coordinates
const NYC_CENTER: [number, number] = [40.7580, -73.9855];
const NYC_ZOOM = 12;

// Update map view when incidents change
function MapUpdater() {
  const map = useMap();
  const incidents = useIncidentStore((s) => s.incidents);

  useEffect(() => {
    if (incidents.length > 0) {
      const located = incidents.filter((i) => i.latitude && i.longitude);
      if (located.length > 0) {
        // Don't auto-fit, keep NYC view
      }
    }
  }, [incidents, map]);

  return null;
}

function IncidentMarkerComponent({ incident }: { incident: Incident }) {
  const selectIncident = useIncidentStore((s) => s.selectIncident);
  const openDrawer = useUIStore((s) => s.openDrawer);
  const selectedId = useIncidentStore((s) => s.selectedIncidentId);
  const isSelected = selectedId === incident.id;

  if (!incident.latitude || !incident.longitude) return null;

  const color = TRIAGE_COLORS[incident.triageCategory];
  const baseRadius = 8 + (incident.priority / 100) * 12;
  const radius = isSelected ? baseRadius + 4 : baseRadius;

  return (
    <>
      {/* Corroboration ring */}
      {incident.corroborationCount > 1 && (
        <CircleMarker
          center={[incident.latitude, incident.longitude]}
          radius={radius + 8 + incident.corroborationCount * 3}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.05,
            weight: 1,
            opacity: 0.3,
            dashArray: "4 4",
          }}
        />
      )}

      {/* Main marker */}
      <CircleMarker
        center={[incident.latitude, incident.longitude]}
        radius={radius}
        pathOptions={{
          color: isSelected ? "#ffffff" : color,
          fillColor: color,
          fillOpacity: isSelected ? 0.8 : 0.6,
          weight: isSelected ? 3 : 2,
        }}
        eventHandlers={{
          click: () => {
            selectIncident(incident.id);
            openDrawer();
          },
        }}
      >
        <Popup>
          <div className="text-xs min-w-[200px]">
            <p className="font-bold text-sm mb-1">{incident.extraction.summary}</p>
            <p className="text-gray-500 mb-1">
              {INCIDENT_TYPE_LABELS[incident.extraction.incidentType]} •{" "}
              {TRIAGE_LABELS[incident.triageCategory]}
            </p>
            <p className="font-mono text-xs">
              Priority: <strong>{incident.priority}/100</strong>
            </p>
            {incident.corroborationCount > 1 && (
              <p className="text-orange-600 mt-1">
                ⚠ {incident.corroborationCount} corroborating reports
              </p>
            )}
          </div>
        </Popup>
      </CircleMarker>

      {/* Pulse animation for Cat 1 */}
      {incident.triageCategory === "CAT1_PURPLE" && incident.status === "active" && (
        <CircleMarker
          center={[incident.latitude, incident.longitude]}
          radius={radius + 15}
          pathOptions={{
            color: color,
            fillColor: "transparent",
            weight: 2,
            opacity: 0.4,
            className: "animate-ping",
          }}
        />
      )}
    </>
  );
}

export function MapView() {
  const incidents = useIncidentStore((s) => s.incidents);
  const locatedIncidents = incidents.filter(
    (i) => i.latitude && i.longitude && i.status === "active"
  );

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={NYC_CENTER}
        zoom={NYC_ZOOM}
        className="w-full h-full"
        zoomControl={false}
        style={{ background: "#0a0a0f" }}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapUpdater />
        {locatedIncidents.map((incident) => (
          <IncidentMarkerComponent key={incident.id} incident={incident} />
        ))}
      </MapContainer>

      {/* Map overlay info */}
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] text-gray-400 border border-white/5 z-[1000]">
        <span className="text-white font-semibold">{locatedIncidents.length}</span> incidents on map
      </div>
    </div>
  );
}
