-- Add payment_plan_id to student_debts to link installments to payment plans
ALTER TABLE public.student_debts 
ADD COLUMN payment_plan_id UUID REFERENCES public.payment_plans(id) ON DELETE CASCADE;

-- Add installment_number to track which installment this is
ALTER TABLE public.student_debts 
ADD COLUMN installment_number INTEGER;