/*
  # Fix Visits Tables Final

  1. Changes
    - Drop and recreate visits tables with proper constraints
    - Add created_by column to track ownership
    - Update RLS policies to filter by created_by
    - Add proper indexes and foreign keys
*/

-- Drop existing tables in correct order
DROP TABLE IF EXISTS public.visit_pauses CASCADE;
DROP TABLE IF EXISTS public.visit_products CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;

-- Create visits table
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_amount numeric DEFAULT 0,
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

-- Enable Row Level Security
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_pauses ENABLE ROW LEVEL SECURITY;

-- Create policies for visits
CREATE POLICY "Users can manage their own visits"
  ON public.visits FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create policies for visit_products
CREATE POLICY "Users can manage their own visit_products"
  ON public.visit_products FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create policies for visit_pauses
CREATE POLICY "Users can manage their own visit_pauses"
  ON public.visit_pauses FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX visits_client_id_idx ON public.visits(client_id);
CREATE INDEX visits_created_by_idx ON public.visits(created_by);
CREATE INDEX visit_products_visit_id_idx ON public.visit_products(visit_id);
CREATE INDEX visit_products_product_id_idx ON public.visit_products(product_id);
CREATE INDEX visit_products_created_by_idx ON public.visit_products(created_by);
CREATE INDEX visit_pauses_visit_id_idx ON public.visit_pauses(visit_id);
CREATE INDEX visit_pauses_created_by_idx ON public.visit_pauses(created_by);