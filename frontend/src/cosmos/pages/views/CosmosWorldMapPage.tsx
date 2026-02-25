import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';
import { api } from '../../../services/api';
import type { Site } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  EmptyState,
  ClickableRow,
} from '../templates/EmptyPage';

export const CosmosWorldMapPage = () => {
  usePageTitle('World Map');
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSites()
      .then((data) => {
        setSites(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const geoSites = sites.filter((s) => s.location?.lat && s.location?.lon);
  const totalRooms = sites.reduce((acc, s) => acc + (s.rooms?.length ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="World Map"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Monitoring', href: '/cosmos/views/worldmap' },
              { label: 'World Map' },
            ]}
          />
        }
        actions={
          <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
            <span className="bg-brand-500 h-1.5 w-1.5 animate-pulse rounded-full" />
            Live
          </span>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sites', value: sites.length },
          { label: 'With location', value: geoSites.length },
          { label: 'Rooms', value: totalRooms },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Map — fixed height, no SectionCard padding needed */}
      <div
        className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
        style={{ height: 500 }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-gray-900">
            <LoadingState message="Loading map data…" />
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
                center={[(site.location as NonNullable<typeof site.location>).lat, (site.location as NonNullable<typeof site.location>).lon]}
                radius={10}
                fillColor="#465fff"
                color="#3641f5"
                weight={2}
                opacity={1}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <p className="font-semibold text-gray-900">{site.name}</p>
                    {site.description && (
                      <p className="mt-1 text-xs text-gray-500">{site.description}</p>
                    )}
                    {site.location?.address && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {site.location.address}
                      </div>
                    )}
                    {site.rooms && site.rooms.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-gray-600">Rooms</p>
                        {site.rooms.map((room) => (
                          <button
                            key={room.id}
                            onClick={() => navigate(`/cosmos/views/room/${room.id}`)}
                            className="text-brand-600 hover:text-brand-700 flex w-full items-center gap-1 text-xs hover:underline"
                          >
                            {room.name}
                          </button>
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
      <SectionCard title="All Sites" desc={`${sites.length} site${sites.length !== 1 ? 's' : ''} configured`}>
        {loading ? (
          <LoadingState />
        ) : sites.length === 0 ? (
          <EmptyState
            title="No sites configured"
            description="Add sites with geolocation coordinates to see them on the map."
          />
        ) : (
          <div className="-mx-1 divide-y divide-gray-100 dark:divide-gray-800">
            {sites.map((site) => (
              <ClickableRow
                key={site.id}
                icon={Building2}
                title={site.name}
                subtitle={[
                  `${site.rooms?.length ?? 0} room${(site.rooms?.length ?? 0) !== 1 ? 's' : ''}`,
                  site.location?.address,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onClick={() => {
                  const firstRoom = site.rooms?.[0];
                  if (firstRoom) navigate(`/cosmos/views/room/${firstRoom.id}`);
                }}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
