/*
  # Add Subscription Prices Table

  1. New Tables
    - subscription_prices
      - id (integer, primary key)
      - weekly (numeric)
      - half_monthly (numeric)
      - monthly (numeric)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create subscription_prices table
CREATE TABLE public.subscription_prices (
  id integer PRIMARY KEY DEFAULT 1,
  weekly numeric NOT NULL CHECK (weekly >= 0),
  half_monthly numeric NOT NULL CHECK (half_monthly >= 0),
  monthly numeric NOT NULL CHECK (monthly >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage subscription prices"
  ON public.subscription_prices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default prices
INSERT INTO public.subscription_prices (weekly, half_monthly, monthly)
VALUES (150, 300, 500)
ON CONFLICT (id) DO UPDATE
SET
  weekly = EXCLUDED.weekly,
  half_monthly = EXCLUDED.half_monthly,
  monthly = EXCLUDED.monthly,
  updated_at = now();

-- Add constraint to ensure only one row exists
CREATE UNIQUE CONSTRAINT subscription_prices_singleton_row ON public.subscription_prices ((id = 1));