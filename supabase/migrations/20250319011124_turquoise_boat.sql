/*
  # Remove Category Field from Products Table

  1. Changes
    - Remove category column from products table
*/

-- Remove category column from products table
ALTER TABLE public.products DROP COLUMN IF EXISTS category;