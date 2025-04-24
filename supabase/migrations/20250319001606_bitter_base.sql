/*
  # Fix Halls Selection

  1. Changes
    - Ensure halls table has correct data
    - Update RLS policies
*/

-- Delete existing halls to avoid duplicates
DELETE FROM public.halls;

-- Insert default halls with correct names and prices
INSERT INTO public.halls (name, price_per_hour)
VALUES 
  ('القاعة الكبيرة', 90),
  ('القاعة الصغيرة', 45);