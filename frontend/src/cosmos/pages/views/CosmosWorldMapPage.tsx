import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ExternalLink } from 'lucide-react';
import { api } from '../../../services/api';
import type { Site } from '../../../types';

export const CosmosWorldMapPage = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSites().then((data) => {
      setSites(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const geoSites = sites.filter((s) => s.location?.lat && s.location?.lon);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">World Map</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {geoSites.length} site{geoSites.length !== 1 ? 's' : ''} with geolocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-500 dark:bg-brand-500/15">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
            Live
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sites', value: sites.length },
          { label: 'With location', value: geoSites.length },
          { label: 'Rooms', value: sites.reduce((acc, s) => acc + (s.rooms?.length ?? 0), 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800" style={{ height: '500px' }}>
        {loading ? (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700" />
          </div>
        ) : (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            zoomControl
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
            />
            {geoSites.map((site) => (
              <CircleMarker
                key={site.id}
                center={[site.location!.lat!, site.location!.lon!]}
                radius={10}
                fillColor="#465fff"
                color="#3641f5"
                weight={2}
                opacity={1}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="font-semibold text-gray-900">{site.name}</div>
                    {site.description && (
                      <div className="mt-1 text-xs text-gray-500">{site.description}</div>
                    )}
                    {site.location?.address && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />{site.location.address}
                      </div>
                    )}
                    {site.rooms && site.rooms.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-semibold text-gray-600">Rooms:</div>
                        {site.rooms.map((room) => (
                          <a
                            key={room.id}
                            href={`/cosmos/views/room/${room.id}`}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />{room.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Sites list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">All Sites</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {sites.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No sites configured</p>
            </div>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15">
                  <Building2 className="h-4 w-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{site.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {site.rooms?.length ?? 0} room{(site.rooms?.length ?? 0) !== 1 ? 's' : ''}
                    {site.location?.address && ` • ${site.location.address}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {site.rooms?.map((room) => (
                    <Link
                      key={room.id}
                      to={`/cosmos/views/room/${room.id}`}
                      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500"
                    >
                      {room.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
