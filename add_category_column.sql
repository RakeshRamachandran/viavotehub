-- Add category column to submissions table
ALTER TABLE public.submissions
ADD COLUMN category VARCHAR(255) NOT NULL DEFAULT 'Via Cursor Project';

-- Add check constraint to ensure data consistency
-- We can remove this later if we want dynamic categories, but it helps prevent typos for now
ALTER TABLE public.submissions
ADD CONSTRAINT check_category CHECK (category IN ('Via Cursor Project', 'Via Hackathon'));
