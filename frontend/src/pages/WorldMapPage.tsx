import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { Site } from '../types';
import { MapPin } from 'lucide-react';
import { api } from '../services/api';

const DEFAULT_VIEW_ZOOMS: Record<string, number> = {
  world: 2,
  continent: 3,
  country: 5,
  city: 7,
};

const MapCentering = ({
  sites,
  defaultCenter,
  defaultZoom,
}: {
  sites: Site[];
  defaultCenter: { lat: number; lon: number };
  defaultZoom: number;
}) => {
  const map = useMap();

  useEffect(() => {
    const points = sites
      .map((site) => site.location)
      .filter(Boolean)
      .map((loc) => [(loc as NonNullable<typeof loc>).lat, (loc as NonNullable<typeof loc>).lon]) as [number, number][];

    if (points.length === 0) {
      map.setView([defaultCenter.lat, defaultCenter.lon], defaultZoom);
      return;
    }
    const avg = points.reduce(
      (acc, point) => ({ lat: acc.lat + point[0], lon: acc.lon + point[1] }),
      { lat: 0, lon: 0 }
    );
    const center = { lat: avg.lat / points.length, lon: avg.lon / points.length };
    map.setView([center.lat, center.lon], defaultZoom, { animate: true });
  }, [map, sites, defaultCenter.lat, defaultCenter.lon, defaultZoom]);

  return null;
};

export const WorldMapPage = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [mapConfig, setMapConfig] = useState({
    default_view: 'world',
    default_zoom: 2,
    min_zoom: 2,
    max_zoom: 7,
    zoom_controls: true,
    center: { lat: 20, lon: 0 },
  });

  useEffect(() => {
    Promise.all([api.getSites(), api.getConfig()])
      .then(([sitesData, configData]) => {
        setSites(Array.isArray(sitesData) ? sitesData : []);
        const map = configData?.map;
        if (map) {
          const zoom =
            typeof map.default_zoom === 'number'
              ? map.default_zoom
              : DEFAULT_VIEW_ZOOMS[map.default_view || 'world'] || 2;
          setMapConfig({
            default_view: map.default_view || 'world',
            default_zoom: zoom,
            min_zoom: map.min_zoom ?? 2,
            max_zoom: map.max_zoom ?? 7,
            zoom_controls: map.zoom_controls ?? true,
            center: {
              lat: map.center?.lat ?? 20,
              lon: map.center?.lon ?? 0,
            },
          });
        }
      })
      .catch(console.error);
  }, []);

  const sitesWithLocation = useMemo(
    () =>
      sites.filter(
        (site) => typeof site.location?.lat === 'number' && typeof site.location?.lon === 'number'
      ),
    [sites]
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 bg-black/20 px-8 py-6">
        <div>
          <div className="mb-1 flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <MapPin className="h-3 w-3 text-[var(--color-accent)]" />
            Global Infrastructure Map
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-[var(--color-text-primary)] uppercase italic">
            Datacenter World Map
          </h1>
          <p className="mt-2 max-w-xl text-sm text-gray-400">
            Explore all datacenters on a single globe view. Click a site to see rooms and jump
            directly to the physical layout.
          </p>
        </div>
      </header>

      <div className="flex-1 p-6">
        <div className="bg-rack-panel border-rack-border relative h-full overflow-hidden rounded-2xl border shadow-2xl">
          <MapContainer
            center={[mapConfig.center.lat, mapConfig.center.lon]}
            zoom={mapConfig.default_zoom}
            minZoom={mapConfig.min_zoom}
            maxZoom={mapConfig.max_zoom}
            scrollWheelZoom
            zoomControl={mapConfig.zoom_controls}
            className="h-full w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapCentering
              sites={sitesWithLocation}
              defaultCenter={mapConfig.center}
              defaultZoom={mapConfig.default_zoom}
            />
            {sitesWithLocation.map((site) => (
              <CircleMarker
                key={site.id}
                center={[(site.location as NonNullable<typeof site.location>).lat, (site.location as NonNullable<typeof site.location>).lon]}
                radius={8}
                pathOptions={{
                  color: 'rgba(56,189,248,0.9)',
                  fillColor: 'rgba(56,189,248,0.7)',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup className="rackscope-map-popup">
                  <div className="min-w-[220px] space-y-2">
                    <div>
                      <div className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
                        Datacenter
                      </div>
                      <div className="text-lg font-bold text-[var(--color-text-primary)]">
                        {site.name}
                      </div>
                      {site.description && (
                        <div className="text-xs text-gray-400">{site.description}</div>
                      )}
                      {site.location?.address && (
                        <div className="text-[11px] text-gray-500">{site.location.address}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
                        Rooms
                      </div>
                      <div className="space-y-1">
                        {(site.rooms || []).map((room) => (
                          <div key={room.id} className="flex items-center justify-between">
                            <span className="text-sm text-[var(--color-text-primary)]">
                              {room.name}
                            </span>
                            <Link
                              to={`/room/${room.id}`}
                              className="text-xs font-semibold text-[var(--color-accent)]"
                            >
                              Open
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="pointer-events-none absolute top-6 left-6 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[10px] font-bold tracking-[0.3em] text-gray-300 uppercase">
            Night Globe
          </div>
          {sitesWithLocation.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
              No datacenter coordinates configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
