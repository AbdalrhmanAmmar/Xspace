/*
  # Update Reservations Table

  1. Changes
    - Drop existing reservations table
    - Create new reservations table with hall_name instead of hall_id
    - Update RLS policies
    - Add proper indexes

  2. New Structure
    - id (uuid)
    - client_id (uuid)
    - hall_name (text)
    - start_time (timestamptz)
    - end_time (timestamptz)
    - duration_minutes (integer)
    - total_price (numeric)
    - deposit_amount (numeric)
    - status (text)
    - created_at (timestamptz)
    - updated_at (timestamptz)
*/

-- Drop existing table
DROP TABLE IF EXISTS public.reservations CASCADE;

-- Create new reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  hall_name text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  total_price numeric NOT NULL CHECK (total_price >= 0),
  deposit_amount numeric NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage reservations"
  ON public.reservations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX reservations_client_id_idx ON public.reservations(client_id);
CREATE INDEX reservations_start_time_idx ON public.reservations(start_time);
CREATE INDEX reservations_status_idx ON public.reservations(status);

-- Add constraint to ensure hall_name is valid
ALTER TABLE public.reservations
ADD CONSTRAINT valid_hall_name CHECK (
  hall_name IN ('القاعة الكبيرة', 'القاعة الصغيرة')
);