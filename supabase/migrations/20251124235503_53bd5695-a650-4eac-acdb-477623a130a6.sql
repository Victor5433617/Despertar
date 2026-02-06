-- Create table to link parents/guardians with their students
CREATE TABLE public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text, -- e.g., 'padre', 'madre', 'tutor'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, guardian_user_id)
);

-- Enable RLS on student_guardians
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all guardian relationships
CREATE POLICY "Admins full access to student_guardians"
ON public.student_guardians
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Parents can view their own student relationships
CREATE POLICY "Parents can view their student relationships"
ON public.student_guardians
FOR SELECT
USING (
  guardian_user_id = auth.uid() AND 
  public.has_role(auth.uid(), 'parent')
);

-- Update student_debts policies to allow parents to view their children's debts
CREATE POLICY "Parents can view their children debts"
ON public.student_debts
FOR SELECT
USING (
  public.has_role(auth.uid(), 'parent') AND
  student_id IN (
    SELECT student_id 
    FROM public.student_guardians 
    WHERE guardian_user_id = auth.uid()
  )
);

-- Update students policies to allow parents to view their children's info
CREATE POLICY "Parents can view their children info"
ON public.students
FOR SELECT
USING (
  public.has_role(auth.uid(), 'parent') AND
  id IN (
    SELECT student_id 
    FROM public.student_guardians 
    WHERE guardian_user_id = auth.uid()
  )
);

-- Update payments policies to allow parents to view payments for their children
CREATE POLICY "Parents can view their children payments"
ON public.payments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'parent') AND
  student_id IN (
    SELECT student_id 
    FROM public.student_guardians 
    WHERE guardian_user_id = auth.uid()
  )
);

-- Update debt_concepts policies to allow parents to view debt concepts
CREATE POLICY "Parents can view debt concepts"
ON public.debt_concepts
FOR SELECT
USING (public.has_role(auth.uid(), 'parent'));

-- Enable realtime for payments and student_debts so parents get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_debts;