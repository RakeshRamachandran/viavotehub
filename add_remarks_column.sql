-- Add remarks column to votes table for judge comments
-- Run this SQL in your Supabase SQL editor

ALTER TABLE public.votes 
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add a comment to describe the new column
COMMENT ON COLUMN public.votes.remarks IS 'Optional comments/remarks from judges when rating submissions';

-- Update the existing votes table structure
-- This will add the remarks column to all existing votes (will be NULL for existing records)
