/*
  # Add Hall Prices Table

  1. New Tables
    - `hall_prices`
      - `id` (integer, primary key)
      - `large_hall_price` (numeric)
      - `small_hall_price` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
*/

-- Create hall_prices table
CREATE TABLE public.hall_prices (
  id integer PRIMARY KEY DEFAULT 1,
  large_hall_price numeric NOT NULL CHECK (large_hall_price >= 0),
  small_hall_price numeric NOT NULL CHECK (small_hall_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hall_prices ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage hall prices"
  ON public.hall_prices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default prices
INSERT INTO public.hall_prices (large_hall_price, small_hall_price)
VALUES (90, 45)
ON CONFLICT (id) DO UPDATE
SET
  large_hall_price = EXCLUDED.large_hall_price,
  small_hall_price = EXCLUDED.small_hall_price,
  updated_at = now();

-- Add constraint to ensure only one row exists
CREATE UNIQUE CONSTRAINT hall_prices_singleton_row ON public.hall_prices ((id = 1));