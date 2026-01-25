export type AppRole = 'admin' | 'store_manager' | 'user';

export type MenuCategory = 'coffee' | 'non_coffee' | 'food';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Cafe {
  id: string;
  owner_id: string | null;
  name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OperatingHours {
  id: string;
  cafe_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface CafeMenu {
  id: string;
  cafe_id: string;
  name: string;
  price: number;
  category: MenuCategory;
  description: string | null;
  is_available: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  cafe_id: string;
  user_id: string | null;
  rating: number;
  comment: string | null;
  is_admin_created: boolean | null;
  created_at: string;
  // Joined data
  profiles?: Profile;
}

export interface CafeImage {
  id: string;
  cafe_id: string;
  image_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface CafeWithDetails extends Cafe {
  operating_hours?: OperatingHours[];
  cafe_menus?: CafeMenu[];
  reviews?: Review[];
  cafe_images?: CafeImage[];
}

export interface UserWithRole {
  profile: Profile;
  role: AppRole;
}

export const DAYS_OF_WEEK = [
  'Minggu',
  'Senin', 
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
] as const;

export const MENU_CATEGORIES: { value: MenuCategory; label: string }[] = [
  { value: 'coffee', label: 'Kopi' },
  { value: 'non_coffee', label: 'Non-Kopi' },
  { value: 'food', label: 'Makanan' },
];
