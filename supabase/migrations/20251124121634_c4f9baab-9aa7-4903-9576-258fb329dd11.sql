-- Add grade text field to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grade text;

-- Add comment to explain the field
COMMENT ON COLUMN public.students.grade IS 'Grade or level of the student (text field)';