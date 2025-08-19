-- Add missing columns to submissions table
-- Run this SQL in your Supabase SQL editor

-- Add the updated_at column if it doesn't exist
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add the project_name column if it doesn't exist
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);

-- Add the services_used column if it doesn't exist
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS services_used TEXT;

-- Update existing records to have a default updated_at value
UPDATE public.submissions 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.submissions;

-- Create the trigger
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify all columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'submissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify the table structure matches what the application expects
SELECT 
    'Expected columns:' as info,
    'id, team_member_name, submission_link, problem_description, hours_spent, created_at, updated_at, project_name, services_used' as columns
UNION ALL
SELECT 
    'Actual columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'submissions' 
AND table_schema = 'public';
