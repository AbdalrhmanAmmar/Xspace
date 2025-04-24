/*
  # Fix Halls Data

  1. Changes
    - Ensure default halls exist in the database
    - Update hall prices
*/

-- Delete existing halls to avoid duplicates
DELETE FROM public.halls;

-- Insert default halls
INSERT INTO public.halls (name, price_per_hour)
VALUES 
  ('القاعة الكبيرة', 90),
  ('القاعة الصغيرة', 45);

-- Update hall prices
INSERT INTO public.hall_prices (large_hall_price, small_hall_price)
VALUES (90, 45)
ON CONFLICT (id) DO UPDATE
SET
  large_hall_price = EXCLUDED.large_hall_price,
  small_hall_price = EXCLUDED.small_hall_price,
  updated_at = now();