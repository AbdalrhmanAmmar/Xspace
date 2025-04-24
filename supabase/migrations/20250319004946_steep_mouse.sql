/*
  # Fix Visits Tables Structure

  1. Changes
    - Drop existing visits tables to ensure clean state
    - Recreate tables with proper constraints and defaults
    - Update RLS policies
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
  updated_at timestamptz DEFAULT now()
);

-- Create visit_products table
CREATE TABLE public.visit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create visit_pauses table
CREATE TABLE public.visit_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES public.visits(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_pauses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to manage visits"
  ON public.visits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage visit_products"
  ON public.visit_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage visit_pauses"
  ON public.visit_pauses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX visits_client_id_idx ON public.visits(client_id);
CREATE INDEX visit_products_visit_id_idx ON public.visit_products(visit_id);
CREATE INDEX visit_products_product_id_idx ON public.visit_products(product_id);
CREATE INDEX visit_pauses_visit_id_idx ON public.visit_pauses(visit_id);