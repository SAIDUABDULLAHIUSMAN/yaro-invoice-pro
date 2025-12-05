-- Add stock column to products table
ALTER TABLE public.products ADD COLUMN stock integer NOT NULL DEFAULT 0;