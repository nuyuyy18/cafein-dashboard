-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'store_manager', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create cafes table
CREATE TABLE public.cafes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating NUMERIC(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cafes
ALTER TABLE public.cafes ENABLE ROW LEVEL SECURITY;

-- Create operating_hours table
CREATE TABLE public.operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT false,
    UNIQUE (cafe_id, day_of_week)
);

-- Enable RLS on operating_hours
ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

-- Create cafe_menus table
CREATE TABLE public.cafe_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('coffee', 'non_coffee', 'food')),
    description TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cafe_menus
ALTER TABLE public.cafe_menus ENABLE ROW LEVEL SECURITY;

-- Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_admin_created BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create cafe_images table
CREATE TABLE public.cafe_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID REFERENCES public.cafes(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cafe_images
ALTER TABLE public.cafe_images ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user owns a cafe
CREATE OR REPLACE FUNCTION public.owns_cafe(_user_id UUID, _cafe_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cafes
    WHERE id = _cafe_id
      AND owner_id = _user_id
  )
$$;

-- Create function to update cafe rating
CREATE OR REPLACE FUNCTION public.update_cafe_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cafes
  SET 
    rating = (SELECT COALESCE(AVG(rating), 0) FROM public.reviews WHERE cafe_id = COALESCE(NEW.cafe_id, OLD.cafe_id)),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE cafe_id = COALESCE(NEW.cafe_id, OLD.cafe_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.cafe_id, OLD.cafe_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update rating when review changes
CREATE TRIGGER update_cafe_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_cafe_rating();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cafes_updated_at
BEFORE UPDATE ON public.cafes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for cafes
CREATE POLICY "Anyone can view active cafes"
ON public.cafes FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated can view all cafes"
ON public.cafes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage all cafes"
ON public.cafes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store managers can manage own cafes"
ON public.cafes FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'store_manager') 
  AND owner_id = auth.uid()
);

CREATE POLICY "Store managers can insert cafes"
ON public.cafes FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'store_manager') 
  AND owner_id = auth.uid()
);

-- RLS Policies for operating_hours
CREATE POLICY "Anyone can view operating hours"
ON public.operating_hours FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all operating hours"
ON public.operating_hours FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store managers can manage own cafe hours"
ON public.operating_hours FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'store_manager')
  AND public.owns_cafe(auth.uid(), cafe_id)
);

-- RLS Policies for cafe_menus
CREATE POLICY "Anyone can view menus"
ON public.cafe_menus FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all menus"
ON public.cafe_menus FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store managers can manage own cafe menus"
ON public.cafe_menus FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'store_manager')
  AND public.owns_cafe(auth.uid(), cafe_id)
);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all reviews"
ON public.reviews FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cafe_images
CREATE POLICY "Anyone can view cafe images"
ON public.cafe_images FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all images"
ON public.cafe_images FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store managers can manage own cafe images"
ON public.cafe_images FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'store_manager')
  AND public.owns_cafe(auth.uid(), cafe_id)
);

-- Create storage bucket for cafe images
INSERT INTO storage.buckets (id, name, public) VALUES ('cafe-images', 'cafe-images', true);

-- Storage policies for cafe-images bucket
CREATE POLICY "Anyone can view cafe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cafe-images');

CREATE POLICY "Authenticated users can upload cafe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cafe-images');

CREATE POLICY "Admins can manage all cafe images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'cafe-images' AND public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);