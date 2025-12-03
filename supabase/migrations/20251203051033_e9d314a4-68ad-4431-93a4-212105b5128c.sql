-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_phone TEXT,
  customer_name TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  products JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
ON public.invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
ON public.invoices FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);