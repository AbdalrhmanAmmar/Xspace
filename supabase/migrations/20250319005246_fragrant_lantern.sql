/*
  # Complete Schema Update

  1. Changes
    - Drop and recreate all tables with proper constraints
    - Add created_by columns for user ownership
    - Update RLS policies to filter by created_by
    - Add proper indexes for performance
    - Add CHECK constraints for data validation
*/

-- Drop existing tables in correct order
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.visit_pauses CASCADE;
DROP TABLE IF EXISTS public.visit_products CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.halls CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  job text,
  age integer CHECK (age > 0),
  is_new_client boolean DEFAULT true,
  last_visit timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  category text,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create halls table
CREATE TABLE public.halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_per_hour numeric NOT NULL CHECK (price_per_hour >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create visits table
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_amount numeric DEFAULT 0 CHECK (total_amount >= 0),
  is_paused boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create visit_products table
CREATE TABLE public.visit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create visit_pauses table
CREATE TABLE public.visit_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  deposit_amount numeric NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  total_days integer NOT NULL CHECK (total_days > 0),
  remaining_days integer NOT NULL CHECK (remaining_days >= 0),
  is_flexible boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  hall_price numeric DEFAULT 0 CHECK (hall_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_pauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables
CREATE POLICY "Users can manage their own clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own products"
  ON public.products FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own visits"
  ON public.visits FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own visit_products"
  ON public.visit_products FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own visit_pauses"
  ON public.visit_pauses FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own sales"
  ON public.sales FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can manage their own sale_items"
  ON public.sale_items FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX clients_created_by_idx ON public.clients(created_by);
CREATE INDEX products_created_by_idx ON public.products(created_by);
CREATE INDEX halls_created_by_idx ON public.halls(created_by);
CREATE INDEX visits_client_id_idx ON public.visits(client_id);
CREATE INDEX visits_created_by_idx ON public.visits(created_by);
CREATE INDEX visit_products_visit_id_idx ON public.visit_products(visit_id);
CREATE INDEX visit_products_product_id_idx ON public.visit_products(product_id);
CREATE INDEX visit_products_created_by_idx ON public.visit_products(created_by);
CREATE INDEX visit_pauses_visit_id_idx ON public.visit_pauses(visit_id);
CREATE INDEX visit_pauses_created_by_idx ON public.visit_pauses(created_by);
CREATE INDEX reservations_client_id_idx ON public.reservations(client_id);
CREATE INDEX reservations_hall_id_idx ON public.reservations(hall_id);
CREATE INDEX reservations_created_by_idx ON public.reservations(created_by);
CREATE INDEX subscriptions_client_id_idx ON public.subscriptions(client_id);
CREATE INDEX subscriptions_created_by_idx ON public.subscriptions(created_by);
CREATE INDEX sales_client_id_idx ON public.sales(client_id);
CREATE INDEX sales_hall_id_idx ON public.sales(hall_id);
CREATE INDEX sales_created_by_idx ON public.sales(created_by);
CREATE INDEX sale_items_sale_id_idx ON public.sale_items(sale_id);
CREATE INDEX sale_items_product_id_idx ON public.sale_items(product_id);
CREATE INDEX sale_items_created_by_idx ON public.sale_items(created_by);

-- Function to get or create default halls for a user
CREATE OR REPLACE FUNCTION create_default_halls_for_user()
RETURNS void AS $$
BEGIN
  -- Create large hall if it doesn't exist for the user
  INSERT INTO public.halls (name, price_per_hour, created_by)
  SELECT 
    'القاعة الكبيرة',
    90,
    auth.uid()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.halls 
    WHERE name = 'القاعة الكبيرة' 
    AND created_by = auth.uid()
  );

  -- Create small hall if it doesn't exist for the user
  INSERT INTO public.halls (name, price_per_hour, created_by)
  SELECT 
    'القاعة الصغيرة',
    45,
    auth.uid()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.halls 
    WHERE name = 'القاعة الصغيرة' 
    AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;