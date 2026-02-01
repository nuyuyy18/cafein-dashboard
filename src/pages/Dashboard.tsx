import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Star, MessageSquare, TrendingUp, Search, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCafes, useDashboardStats } from '@/hooks/useCafes';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Cafe } from '@/types/database';

export default function Dashboard() {
  const { profile, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: cafes, isLoading: cafesLoading } = useCafes();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCafes = useMemo(() => {
    if (!cafes) return [];
    const query = searchQuery.toLowerCase();
    return cafes.filter(
      (cafe) =>
        cafe.name.toLowerCase().includes(query) ||
        cafe.address.toLowerCase().includes(query)
    );
  }, [cafes, searchQuery]);

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
                  Menampilkan {filteredCafes.length} dari {cafes?.length || 0} kafe
                </CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau daerah..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {filteredCafes.map((cafe) => (
                    <div
                      key={cafe.id}
                      onClick={() => navigate(`/cafes/${cafe.id}`)}
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
                          {cafe.review_count} ulasan
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
