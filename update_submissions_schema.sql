-- Update submissions table to add missing fields
-- Run this script to update existing database schema

-- Add missing columns to submissions table if they don't exist
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS project_name VARCHAR(255);
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS services_used TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS git_repo_url TEXT;

-- Update existing submissions with sample data for the new fields
UPDATE public.submissions 
SET 
    project_name = CASE 
        WHEN id = 1 THEN 'AI RecSys'
        WHEN id = 2 THEN 'BlockVote'
        WHEN id = 3 THEN 'ElderCare'
        WHEN id = 4 THEN 'EcoMonitor'
        WHEN id = 5 THEN 'VR Edu'
        ELSE 'Project ' || id
    END,
    services_used = CASE 
        WHEN id = 1 THEN 'Python, TensorFlow, PostgreSQL'
        WHEN id = 2 THEN 'Solidity, Web3.js, React'
        WHEN id = 3 THEN 'React Native, Node.js, MongoDB'
        WHEN id = 4 THEN 'Python, IoT, InfluxDB'
        WHEN id = 5 THEN 'Unity, C#, Firebase'
        ELSE 'Various technologies'
    END,
    git_repo_url = CASE 
        WHEN id = 1 THEN 'https://github.com/team-alpha/ai-recsys'
        WHEN id = 2 THEN 'https://github.com/team-beta/blockvote'
        WHEN id = 3 THEN 'https://github.com/team-gamma/eldercare'
        WHEN id = 4 THEN 'https://github.com/team-delta/ecomonitor'
        WHEN id = 5 THEN 'https://github.com/team-epsilon/vr-edu'
        ELSE 'https://github.com/example/project-' || id
    END
WHERE project_name IS NULL OR services_used IS NULL OR git_repo_url IS NULL;

-- Verify the changes
SELECT id, team_member_name, project_name, services_used, git_repo_url 
FROM public.submissions 
ORDER BY id;
