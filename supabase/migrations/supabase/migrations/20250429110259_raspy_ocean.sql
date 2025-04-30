/*
  # Add Maintenance Table

  1. New Tables
    - `maintenance`
      - `id` (uuid, primary key)
      - `description` (text)
      - `cost` (numeric)
      - `date` (timestamptz)
      - `created_at` (timestamptz)
*/

CREATE TABLE public.maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  cost numeric NOT NULL CHECK (cost >= 0),
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage maintenance"
  ON public.maintenance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX maintenance_date_idx ON public.maintenance(date);