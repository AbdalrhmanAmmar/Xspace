/*
  # Fix RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Create new policies that allow authenticated users to manage all data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage their own products" ON public.products;
DROP POLICY IF EXISTS "Users can manage their own halls" ON public.halls;
DROP POLICY IF EXISTS "Users can manage their own visits" ON public.visits;
DROP POLICY IF EXISTS "Users can manage their own visit_products" ON public.visit_products;
DROP POLICY IF EXISTS "Users can manage their own visit_pauses" ON public.visit_pauses;
DROP POLICY IF EXISTS "Users can manage their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can manage their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can manage their own sale_items" ON public.sale_items;

-- Create new policies that allow authenticated users to manage all data
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