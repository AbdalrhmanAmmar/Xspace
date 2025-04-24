/*
  # Fix Halls Table and Policies

  1. Changes
    - Drop created_by constraint from halls table
    - Update RLS policies for halls
    - Add default halls
*/

-- Drop existing RLS policies for halls
DROP POLICY IF EXISTS "Users can manage their own halls" ON public.halls;
DROP POLICY IF EXISTS "Allow authenticated users to manage halls" ON public.halls;

-- Remove created_by constraint
ALTER TABLE public.halls
DROP CONSTRAINT IF EXISTS halls_created_by_fkey;

ALTER TABLE public.halls
DROP COLUMN IF EXISTS created_by;

-- Create new RLS policy
CREATE POLICY "Allow authenticated users to manage halls"
  ON public.halls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Delete existing halls
DELETE FROM public.halls;

-- Insert default halls
INSERT INTO public.halls (name, price_per_hour)
VALUES 
  ('القاعة الكبيرة', 90),
  ('القاعة الصغيرة', 45);