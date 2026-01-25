import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Cafe, CafeWithDetails, CafeMenu, OperatingHours, CafeImage, Review, MenuCategory } from '@/types/database';

// Fetch all cafes
export function useCafes() {
  return useQuery({
    queryKey: ['cafes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cafes')
        .select(`
          *,
          cafe_images (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Cafe & { cafe_images: CafeImage[] })[];
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

      const totalCafes = cafes?.length || 0;
      const totalReviews = cafes?.reduce((sum, c) => sum + (c.review_count || 0), 0) || 0;
      const avgRating = cafes?.length 
        ? cafes.reduce((sum, c) => sum + (Number(c.rating) || 0), 0) / cafes.length 
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
