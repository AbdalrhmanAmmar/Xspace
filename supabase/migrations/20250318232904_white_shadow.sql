/*
  # Remove created_by from tables

  1. Changes
    - Remove created_by column from clients table
    - Remove created_by column from products table
    - Update RLS policies to allow authenticated users full access
*/

-- Drop existing foreign key constraints
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_created_by_fkey;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_created_by_fkey;

-- Drop created_by columns
ALTER TABLE public.clients
DROP COLUMN IF EXISTS created_by;

ALTER TABLE public.products
DROP COLUMN IF EXISTS created_by;

-- Update RLS policies for clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;

CREATE POLICY "Allow authenticated users to manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update RLS policies for products
DROP POLICY IF EXISTS "Users can read products they created" ON public.products;
DROP POLICY IF EXISTS "Users can insert products" ON public.products;
DROP POLICY IF EXISTS "Users can update products they created" ON public.products;
DROP POLICY IF EXISTS "Users can delete products they created" ON public.products;

CREATE POLICY "Allow authenticated users to manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);