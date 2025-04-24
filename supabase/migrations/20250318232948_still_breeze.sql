/*
  # Simplify Database Schema

  1. Changes
    - Drop all tables to start fresh
    - Create simplified tables without created_by
    - Add appropriate RLS policies
    
  2. New Tables
    - clients
      - id (uuid)
      - name (text)
      - phone (text)
      - job (text)
      - age (integer)
      - is_new_client (boolean)
      - last_visit (timestamptz)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - products
      - id (uuid)
      - name (text)
      - price (numeric)
      - category (text)
      - quantity (integer)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - halls
      - id (uuid)
      - name (text)
      - price_per_hour (numeric)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - reservations
      - id (uuid)
      - client_id (uuid)
      - hall_id (uuid)
      - start_time (timestamptz)
      - end_time (timestamptz)
      - duration_minutes (integer)
      - total_price (numeric)
      - deposit_amount (numeric)
      - status (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - subscriptions
      - id (uuid)
      - client_id (uuid)
      - type (text)
      - start_date (timestamptz)
      - end_date (timestamptz)
      - price (numeric)
      - total_days (integer)
      - remaining_days (integer)
      - is_flexible (boolean)
      - status (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - sales
      - id (uuid)
      - client_id (uuid)
      - hall_id (uuid)
      - start_time (timestamptz)
      - end_time (timestamptz)
      - hall_price (numeric)
      - total_price (numeric)
      - created_at (timestamptz)
    
    - sale_items
      - id (uuid)
      - sale_id (uuid)
      - product_id (uuid)
      - quantity (integer)
      - price (numeric)
      - total (numeric)
      - created_at (timestamptz)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage all data
*/

-- Drop existing tables
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.halls CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  job text,
  age integer,
  is_new_client boolean DEFAULT true,
  last_visit timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  category text,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create halls table
CREATE TABLE public.halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_per_hour numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  total_price numeric NOT NULL,
  deposit_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  price numeric NOT NULL,
  total_days integer NOT NULL,
  remaining_days integer NOT NULL,
  is_flexible boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  hall_id uuid REFERENCES public.halls(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  hall_price numeric DEFAULT 0,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create sale_items table
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sales"
  ON public.sales FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage sale_items"
  ON public.sale_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default halls
INSERT INTO public.halls (name, price_per_hour)
VALUES 
  ('القاعة الكبيرة', 90),
  ('القاعة الصغيرة', 45);