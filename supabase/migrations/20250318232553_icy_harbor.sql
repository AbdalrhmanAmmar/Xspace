/*
  # Fix clients table foreign key

  1. Changes
    - Drop existing foreign key constraint on clients.created_by
    - Update created_by reference to point to auth.users instead of admins
*/

-- Drop existing foreign key constraint
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_created_by_fkey;

-- Add new foreign key constraint
ALTER TABLE public.clients
ADD CONSTRAINT clients_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Update RLS policies to use auth.uid() directly
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;

CREATE POLICY "Users can manage their own clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());