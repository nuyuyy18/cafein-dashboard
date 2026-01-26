import { useState } from 'react';
import { Search, MapPin, Grid, Map as MapIcon, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCafes } from '@/hooks/useCafes';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CafeCard } from '@/components/cafe/CafeCard';
import { CafeMap } from '@/components/cafe/CafeMap';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function CafeList() {
  const navigate = useNavigate();
  const { isAdmin, isStoreManager } = useAuth();
  const { data: cafes, isLoading } = useCafes();
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'split' | 'grid' | 'map'>('split');
  const [hoveredCafeId, setHoveredCafeId] = useState<string | null>(null);

  const filteredCafes = cafes?.filter(cafe =>
    cafe.name.toLowerCase().includes(search.toLowerCase()) ||
    cafe.address.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const mapMarkers = filteredCafes
    .filter(cafe => cafe.latitude && cafe.longitude)
    .map(cafe => ({
      id: cafe.id,
      lat: cafe.latitude!,
      lng: cafe.longitude!,
      name: cafe.name,
      address: cafe.address,
    }));

  const canAddCafe = isAdmin || isStoreManager;

  return (
    <div className="h-full animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('cafelist.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('cafelist.found', { count: filteredCafes.length })}
          </p>
        </div>

        {canAddCafe && (
          <Button onClick={() => navigate('/cafes/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('cafelist.addnew')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('cafelist.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as typeof view)}
          className="border rounded-lg"
        >
          <ToggleGroupItem value="split" aria-label="Split view">
            <Grid className="mr-2 h-4 w-4" />
            {t('cafelist.view.split')}
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label="Map view">
            <MapIcon className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className={`
          ${view === 'split' ? 'grid grid-cols-1 gap-6 lg:grid-cols-5' : ''}
          ${view === 'grid' ? '' : ''}
          ${view === 'map' ? 'h-[calc(100vh-280px)]' : ''}
        `}>
          {/* Cards */}
          {view !== 'map' && (
            <div className={`
              ${view === 'split' ? 'lg:col-span-3' : ''}
              grid gap-6 
              ${view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-2'}
              ${view === 'split' ? 'max-h-[calc(100vh-280px)] overflow-y-auto pr-4' : ''}
            `}>
              {filteredCafes.length > 0 ? (
                filteredCafes.map(cafe => (
                  <CafeCard
                    key={cafe.id}
                    cafe={cafe}
                    onHover={setHoveredCafeId}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">
                    {t('cafelist.notfound.title')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('cafelist.notfound.desc')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Map */}
          {(view === 'split' || view === 'map') && (
            <div className={`
              ${view === 'split' ? 'lg:col-span-2 sticky top-0 h-[calc(100vh-280px)]' : 'h-full'}
              rounded-lg overflow-hidden border
            `}>
              <CafeMap
                markers={mapMarkers}
                selectedId={hoveredCafeId}
                onMarkerClick={(id) => navigate(`/cafes/${id}`)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
