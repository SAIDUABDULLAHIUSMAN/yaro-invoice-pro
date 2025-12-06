-- Update function with secure search_path
DROP FUNCTION IF EXISTS public.decrement_stock(uuid, integer);

CREATE OR REPLACE FUNCTION public.decrement_stock(product_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE public.products 
  SET stock = GREATEST(stock - qty, 0)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;