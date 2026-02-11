import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Cafe, CafeWithDetails, CafeMenu, OperatingHours, CafeImage, Review, MenuCategory } from '@/types/database';

// Fetch all cafes
// Fetch cafes with pagination
// Fetch cafes with pagination and search
export function useCafes(page = 0, pageSize = 20, searchQuery = '', options = { withImages: false }) {
  return useQuery({
    queryKey: ['cafes', page, pageSize, searchQuery, options],
    queryFn: async () => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let selectQuery = '*';
      // Remove usage of join in main query
      // if (options.withImages) { selectQuery += ', cafe_images(image_url, is_primary)'; }

      let query = supabase
        .from('cafes')
        .select(selectQuery, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter BEFORE pagination
      if (searchQuery.trim()) {
        const words = searchQuery.trim().split(/\s+/).filter(w => w.length > 0);
        for (const word of words) {
          query = query.or(`name.ilike.%${word}%,address.ilike.%${word}%`);
        }
      }

      // Apply pagination
      query = query.range(from, to);

      const { data: cafesData, error, count } = await query;
      const cafes = cafesData as unknown as Cafe[];

      if (error) {
        console.error("Error fetching cafes:", error);
        throw error;
      };

      if (!cafes || cafes.length === 0) {
        return { cafes: [], count: 0 };
      }

      // Manual join for images if requested
      let finalCafes = cafes;
      if (options.withImages) {
        const cafeIds = cafes.map(c => c.id);
        const { data: images, error: imgError } = await supabase
          .from('cafe_images')
          .select('cafe_id, image_url, is_primary')
          .in('cafe_id', cafeIds);

        if (!imgError && images) {
          finalCafes = cafes.map(cafe => ({
            ...cafe,
            cafe_images: images.filter(img => img.cafe_id === cafe.id)
          }));
        }
      }

      return {
        cafes: finalCafes as unknown as CafeWithDetails[],
        count: count || 0
      };
    },
  });
}

// Fetch single cafe with all details
export function useCafe(id: string | undefined) {
  return useQuery({
    queryKey: ['cafe', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('cafes')
        .select(`
          *,
          operating_hours (*),
          cafe_menus (*),
          reviews (*),
          cafe_images (*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      // Fetch profile data for reviews separately
      if (data?.reviews && data.reviews.length > 0) {
        const userIds = data.reviews
          .map((r: Review) => r.user_id)
          .filter((id: string | null): id is string => id !== null);

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', userIds);

          if (profiles) {
            data.reviews = data.reviews.map((review: Review) => ({
              ...review,
              profiles: profiles.find((p) => p.user_id === review.user_id) || undefined,
            }));
          }
        }
      }

      return data as CafeWithDetails | null;
    },
    enabled: !!id,
  });
}

// Create cafe
export function useCreateCafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cafe: Omit<Cafe, 'id' | 'created_at' | 'updated_at' | 'rating' | 'review_count'>) => {
      const { data, error } = await supabase
        .from('cafes')
        .insert(cafe)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
    },
  });
}

// Update cafe
export function useUpdateCafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cafe> & { id: string }) => {
      const { data, error } = await supabase
        .from('cafes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
      queryClient.invalidateQueries({ queryKey: ['cafe', data.id] });
    },
  });
}

// Delete cafe
export function useDeleteCafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cafes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
    },
  });
}

// Menu CRUD
export function useCreateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (menu: { cafe_id: string; name: string; price: number; category: MenuCategory; description?: string }) => {
      const { data, error } = await supabase
        .from('cafe_menus')
        .insert(menu)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', data.cafe_id] });
    },
  });
}

export function useUpdateMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CafeMenu> & { id: string }) => {
      const { data, error } = await supabase
        .from('cafe_menus')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', data.cafe_id] });
    },
  });
}

export function useDeleteMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cafe_id }: { id: string; cafe_id: string }) => {
      const { error } = await supabase
        .from('cafe_menus')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return cafe_id;
    },
    onSuccess: (cafe_id) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', cafe_id] });
    },
  });
}

// Operating hours
export function useUpdateOperatingHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hours: Omit<OperatingHours, 'id'> & { id?: string }) => {
      const { data, error } = await supabase
        .from('operating_hours')
        .upsert(hours, { onConflict: 'cafe_id,day_of_week' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', data.cafe_id] });
    },
  });
}

// Reviews
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: { cafe_id: string; user_id: string; rating: number; comment?: string; is_admin_created?: boolean }) => {
      const { data, error } = await supabase
        .from('reviews')
        .insert(review)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', data.cafe_id] });
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
    },
  });
}

// Cafe images
export function useUploadCafeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cafe_id, file, is_primary = false }: { cafe_id: string; file: File; is_primary?: boolean }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${cafe_id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cafe-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cafe-images')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('cafe_images')
        .insert({ cafe_id, image_url: publicUrl, is_primary })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', data.cafe_id] });
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
    },
  });
}

export function useDeleteCafeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cafe_id, image_url }: { id: string; cafe_id: string; image_url: string }) => {
      // Extract file path from URL
      const urlParts = image_url.split('/cafe-images/');
      if (urlParts.length > 1) {
        await supabase.storage.from('cafe-images').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('cafe_images')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return cafe_id;
    },
    onSuccess: (cafe_id) => {
      queryClient.invalidateQueries({ queryKey: ['cafe', cafe_id] });
      queryClient.invalidateQueries({ queryKey: ['cafes'] });
    },
  });
}

// Dashboard stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: cafes, error: cafesError } = await supabase
        .from('cafes')
        .select('id, rating, review_count');

      if (cafesError) throw cafesError;

      const { count: totalCafes, error: countError } = await supabase
        .from('cafes')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // For stats aggregation, we need a larger sample or a DB function. 
      // Since we don't have a DB function, we'll fetch up to 3000 rows (covering all 1929) 
      // just for rating/review_count to be accurate.
      // This is safe for ~2000 rows (approx 50-100KB payload).
      const { data: statsData, error: statsError } = await supabase
        .from('cafes')
        .select('rating, review_count')
        .range(0, 2500); // Increased limit to cover all cafes

      if (statsError) throw statsError;

      const totalReviews = statsData?.reduce((sum, c) => sum + (c.review_count || 0), 0) || 0;
      const avgRating = statsData?.length
        ? statsData.reduce((sum, c) => sum + (Number(c.rating) || 0), 0) / statsData.length
        : 0;

      // Top cafes by reviews
      const { data: topCafes } = await supabase
        .from('cafes')
        .select('id, name, rating, review_count')
        .order('review_count', { ascending: false })
        .limit(5);

      return {
        totalCafes,
        totalReviews,
        avgRating: avgRating.toFixed(1),
        topCafes: topCafes || [],
      };
    },
  });
}
