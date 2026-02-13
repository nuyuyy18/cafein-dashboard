import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coffee, Star, MessageSquare, TrendingUp, Search, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCafes, useDashboardStats } from '@/hooks/useCafes';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Cafe } from '@/types/database';

export default function Dashboard() {
  const { profile, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const PAGE_SIZE = 20;

  const page = Number(searchParams.get('page')) || 0;
  const searchQuery = searchParams.get('q') || '';

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: cafesResponse, isLoading: cafesLoading } = useCafes(page, PAGE_SIZE, searchQuery, { withImages: true });
  const cafes = cafesResponse?.cafes || [];

  const { t } = useLanguage();

  const setPage = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(newPage));
    setSearchParams(newParams);
  };

  const updateSearch = (query: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('q', query);
    } else {
      newParams.delete('q');
    }
    // Reset page on search
    newParams.set('page', '0');
    setSearchParams(newParams);
  };

  // Handled by URL params now
  // const [searchQuery, setSearchQuery] = useState('');

  // Client-side filtering removed as it is now handled by server
  const filteredCafes = cafes;

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
  }) => (
    <Card className="border-0 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {statsLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t('dashboard.welcome', { name: profile?.full_name || 'User' })}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isAdmin
            ? t('dashboard.subtitle.admin')
            : t('dashboard.subtitle.user')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.stat.cafes')}
          value={stats?.totalCafes || 0}
          icon={Coffee}
          description={t('dashboard.stats.total.desc')}
        />
        <StatCard
          title={t('dashboard.stats.reviews')}
          value={stats?.totalReviews || 0}
          icon={MessageSquare}
          description={t('dashboard.stats.reviews.desc')}
        />
        <StatCard
          title={t('dashboard.stats.rating')}
          value={stats?.avgRating || '0.0'}
          icon={Star}
          description={t('dashboard.stats.rating.desc')}
        />
        <StatCard
          title={t('dashboard.stats.trending')}
          value={stats?.topCafes?.length || 0}
          icon={TrendingUp}
          description={t('dashboard.stats.trending.desc')}
        />
      </div>

      {/* Cafe List Section */}
      <div className="grid gap-6">
        <Card className="border-0 shadow-card">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Daftar Kafe</CardTitle>
                <CardDescription>
                  Menampilkan {cafes.length > 0 ? (page * PAGE_SIZE + 1) : 0} - {Math.min((page + 1) * PAGE_SIZE, cafesResponse?.count || 0)} dari total {cafesResponse?.count || 0} kafe
                </CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau daerah..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => updateSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {cafesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredCafes.length > 0 ? (
              <>
                <ScrollArea className="h-[600px] pr-4 overflow-x-hidden">
                  <div className="space-y-3 pb-20">
                    {filteredCafes.map((cafe) => {
                      const primaryImage = cafe.cafe_images?.find((img) => img.is_primary) || cafe.cafe_images?.[0];
                      const imageUrl = primaryImage?.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop';

                      return (
                        <div
                          key={cafe.id}
                          onClick={() => navigate(`/cafes/${cafe.id}`)}
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

                  {/* Pagination Controls - Sticky Bottom */}
                  <div className="sticky bottom-0 left-0 right-0 bg-card py-4 border-t flex items-center justify-between z-10">
                    <p className="text-sm text-muted-foreground">
                      Halaman {page + 1} dari {Math.ceil((cafesResponse?.count || 0) / PAGE_SIZE)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={(page + 1) * PAGE_SIZE >= (cafesResponse?.count || 0)}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Coffee className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Tidak ada kafe yang ditemukan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
