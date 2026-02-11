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
  const { data: listData, isLoading: isLoadingList } = useCafes(0, 20, search, { withImages: true });
  const { data: mapData, isLoading: isLoadingMap } = useCafes(0, 1000, search, { withImages: false });

  const filteredCafes = listData?.cafes || [];
  const mapCafes = mapData?.cafes || [];
  // Use mapData count as it fetches all items (or at least more) and is lightweight
  const totalCount = mapData?.count || 0;

  const mapMarkers = mapCafes
    .filter(cafe => cafe.latitude && cafe.longitude)
    .map(cafe => ({
      id: cafe.id,
      lat: cafe.latitude!,
      lng: cafe.longitude!,
      name: cafe.name,
      address: cafe.address,
    }));

  const canAddCafe = isAdmin || isStoreManager;
  const isLoading = isLoadingList || isLoadingMap;

  return (
    <div className="h-full animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('cafelist.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('cafelist.found', { count: totalCount })}
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
                  {filteredCafes.map(cafe => {
                    const primaryImage = cafe.cafe_images?.find((img: any) => img.is_primary) || cafe.cafe_images?.[0];
                    const imageUrl = primaryImage?.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop';

                    return (
                      <div
                        key={cafe.id}
                        onClick={() => navigate(`/cafes/${cafe.id}`)}
                        onMouseEnter={() => setHoveredCafeId(cafe.id)}
                        onMouseLeave={() => setHoveredCafeId(null)}
                        className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                      >
                        {/* Image Section - Fixed size like Google Maps */}
                        <div className="w-[100px] h-[100px] shrink-0 overflow-hidden rounded-md">
                          <img
                            src={imageUrl}
                            alt={cafe.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>

                        {/* Content Section */}
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                              {cafe.name}
                            </h3>
                            {cafe.is_active === false && (
                              <span className="text-xs font-medium text-destructive whitespace-nowrap">Tutup</span>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center font-medium text-foreground">
                                <span className="text-yellow-500 mr-1">{Number(cafe.rating).toFixed(1)}</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${star <= Math.round(Number(cafe.rating)) ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-muted-foreground ml-1 font-normal">({cafe.review_count})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <span>Cafe</span>
                              <span>•</span>
                              <span>Rp 15.000 - Rp 50.000</span>
                            </div>

                            <div className="flex items-center gap-1 text-sm truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{cafe.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
