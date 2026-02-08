import { useState } from 'react';
import { Search, MapPin, Grid, Map as MapIcon, Plus, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCafes } from '@/hooks/useCafes';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CafeMap } from '@/components/cafe/CafeMap';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function CafeList() {
  const navigate = useNavigate();
  const { isAdmin, isStoreManager } = useAuth();
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'split' | 'grid' | 'map'>('split');
  const [hoveredCafeId, setHoveredCafeId] = useState<string | null>(null);

  // useCafes now returns { cafes, count } object
  // Pass search state to hook (although we might want to debounce this in a real app, strict mode is fine for now)
  const { data: cafesData, isLoading } = useCafes(0, 1000, search);
  const filteredCafes = cafesData?.cafes || [];

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
          {/* Cafe List */}
          {view !== 'map' && (
            <div className={`
              ${view === 'split' ? 'lg:col-span-3' : ''}
              ${view === 'split' ? 'max-h-[calc(100vh-280px)] overflow-y-auto pr-4' : ''}
            `}>
              {filteredCafes.length > 0 ? (
                <div className="space-y-3">
                  {filteredCafes.map(cafe => (
                    <div
                      key={cafe.id}
                      onClick={() => navigate(`/cafes/${cafe.id}`)}
                      onMouseEnter={() => setHoveredCafeId(cafe.id)}
                      onMouseLeave={() => setHoveredCafeId(null)}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {cafe.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cafe.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-yellow-500 font-medium">
                          <Star className="h-4 w-4 fill-yellow-500" />
                          {Number(cafe.rating).toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {cafe.review_count} {t('detail.reviews')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
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
