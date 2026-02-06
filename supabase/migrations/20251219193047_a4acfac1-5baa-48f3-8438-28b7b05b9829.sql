-- Create payment_plans table for managing total debt with monthly installments
CREATE TABLE public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  number_of_installments INTEGER NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins full access to payment_plans" 
ON public.payment_plans 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for parents to view their children's payment plans
CREATE POLICY "Parents can view their children payment plans" 
ON public.payment_plans 
FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  student_id IN (
    SELECT student_id FROM student_guardians WHERE guardian_user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();