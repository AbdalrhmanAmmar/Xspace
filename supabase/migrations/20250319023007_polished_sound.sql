-- Drop existing subscriptions table
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Create subscriptions table without created_by
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  total_days integer NOT NULL CHECK (total_days > 0),
  remaining_days integer NOT NULL CHECK (remaining_days >= 0),
  is_flexible boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage all data"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX subscriptions_client_id_idx ON public.subscriptions(client_id);