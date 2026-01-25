import { Star, Clock, MapPin, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import type { Cafe, CafeImage } from '@/types/database';

interface CafeCardProps {
  cafe: Cafe & { cafe_images?: CafeImage[] };
  onHover?: (id: string | null) => void;
}

export function CafeCard({ cafe, onHover }: CafeCardProps) {
  const navigate = useNavigate();
  
  const primaryImage = cafe.cafe_images?.find(img => img.is_primary) || cafe.cafe_images?.[0];
  const placeholderImage = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop';

  const handleClick = () => {
    navigate(`/cafes/${cafe.id}`);
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden border-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      onClick={handleClick}
      onMouseEnter={() => onHover?.(cafe.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative">
        <AspectRatio ratio={4 / 3}>
          <img
            src={primaryImage?.image_url || placeholderImage}
            alt={cafe.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>
        
        {!cafe.is_active && (
          <Badge 
            variant="destructive" 
            className="absolute right-2 top-2"
          >
            Tutup
          </Badge>
        )}
        
        {cafe.rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-sm font-medium backdrop-blur-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{Number(cafe.rating).toFixed(1)}</span>
            <span className="text-muted-foreground">({cafe.review_count})</span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-foreground group-hover:text-primary">
          {cafe.name}
        </h3>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="line-clamp-2">{cafe.address}</span>
          </div>
          
          {cafe.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{cafe.phone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
