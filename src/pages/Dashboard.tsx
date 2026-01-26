import { Coffee, Star, MessageSquare, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useCafes';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { profile, role, isAdmin } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { t } = useLanguage();

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
        {isLoading ? (
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t('dashboard.welcome', { name: profile?.full_name?.split(' ')[0] || 'User' })}
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
          title={t('dashboard.stats.total')}
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

      {/* Top Cafes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('dashboard.top.cafes')}
            </CardTitle>
            <CardDescription>{t('dashboard.top.cafes.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.topCafes && stats.topCafes.length > 0 ? (
              <div className="space-y-3">
                {stats.topCafes.map((cafe, index) => (
                  <div
                    key={cafe.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="font-medium">{cafe.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {Number(cafe.rating).toFixed(1)}
                      </span>
                      <span>{cafe.review_count} ulasan</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                {t('dashboard.no.data')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              {t('dashboard.top.rating')}
            </CardTitle>
            <CardDescription>{t('dashboard.top.rating.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.topCafes && stats.topCafes.length > 0 ? (
              <div className="space-y-3">
                {[...stats.topCafes]
                  .sort((a, b) => Number(b.rating) - Number(a.rating))
                  .map((cafe, index) => (
                    <div
                      key={cafe.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                          {index + 1}
                        </span>
                        <span className="font-medium">{cafe.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{Number(cafe.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                {t('dashboard.no.data')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
