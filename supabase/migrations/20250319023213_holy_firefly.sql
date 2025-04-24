/*
  # Fix Subscriptions Schema with Auth

  1. Changes
    - Add created_by column referencing auth.users
    - Update RLS policies to filter by created_by
    - Keep existing constraints and indexes
*/

-- Drop existing subscriptions table
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Create subscriptions table with created_by
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('أسبوعي', 'نصف شهري', 'شهري')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  total_days integer NOT NULL CHECK (total_days > 0),
  remaining_days integer NOT NULL CHECK (remaining_days >= 0),
  is_flexible boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage their own data
CREATE POLICY "Users can manage their own subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX subscriptions_client_id_idx ON public.subscriptions(client_id);
CREATE INDEX subscriptions_type_idx ON public.subscriptions(type);
CREATE INDEX subscriptions_status_idx ON public.subscriptions(status);
CREATE INDEX subscriptions_end_date_idx ON public.subscriptions(end_date);
CREATE INDEX subscriptions_created_by_idx ON public.subscriptions(created_by);