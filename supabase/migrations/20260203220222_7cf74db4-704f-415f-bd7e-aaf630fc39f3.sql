-- Add status and cancellation tracking to payments table
ALTER TABLE public.payments 
ADD COLUMN status text NOT NULL DEFAULT 'active',
ADD COLUMN cancelled_at timestamp with time zone,
ADD COLUMN cancelled_by uuid REFERENCES public.profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN public.payments.status IS 'Payment status: active or cancelled';
COMMENT ON COLUMN public.payments.cancelled_at IS 'Timestamp when the payment was cancelled';
COMMENT ON COLUMN public.payments.cancelled_by IS 'User who cancelled the payment';