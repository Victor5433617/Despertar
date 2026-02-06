-- Add 'parent' role to the existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';