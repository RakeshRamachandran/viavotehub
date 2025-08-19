-- Database Schema for Custom Authentication with Role-Based Access Control
-- This file contains the SQL commands to create the necessary tables

-- Create the public.users table for custom authentication
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'judge' CHECK (role IN ('judge', 'superadmin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Insert sample users with different roles
-- The password is Base64 encoded using btoa() function
INSERT INTO public.users (email, name, password, role) 
VALUES 
    ('admin@example.com', 'Super Admin', 'cGFzc3dvcmQxMjM=', 'superadmin'),
    ('judge1@example.com', 'Judge 1', 'cGFzc3dvcmQxMjM=', 'judge'),
    ('judge2@example.com', 'Judge 2', 'cGFzc3dvcmQxMjM=', 'judge')
ON CONFLICT (email) DO NOTHING;

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
    id SERIAL PRIMARY KEY,
    team_member_name VARCHAR(255) NOT NULL,
    submission_link TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    hours_spent INTEGER NOT NULL,
    project_name VARCHAR(255),
    services_used TEXT,
    git_repo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table with rating support
CREATE TABLE IF NOT EXISTS public.votes (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    judge_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, judge_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_votes_submission_id ON votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_judge_id ON votes(judge_id);
CREATE INDEX IF NOT EXISTS idx_votes_rating ON votes(rating);

-- Insert sample submissions
INSERT INTO public.submissions (team_member_name, submission_link, problem_description, hours_spent, project_name, services_used, git_repo_url) 
VALUES 
    ('Team Alpha', 'https://example.com/project1', 'AI-powered recommendation system', 120, 'AI RecSys', 'Python, TensorFlow, PostgreSQL', 'https://github.com/team-alpha/ai-recsys'),
    ('Team Beta', 'https://example.com/project2', 'Blockchain-based voting platform', 150, 'BlockVote', 'Solidity, Web3.js, React', 'https://github.com/team-beta/blockvote'),
    ('Team Gamma', 'https://example.com/project3', 'Mobile app for elderly care', 90, 'ElderCare', 'React Native, Node.js, MongoDB', 'https://github.com/team-gamma/eldercare'),
    ('Team Delta', 'https://example.com/project4', 'Sustainable energy monitoring', 200, 'EcoMonitor', 'Python, IoT, InfluxDB', 'https://github.com/team-delta/ecomonitor'),
    ('Team Epsilon', 'https://example.com/project5', 'Virtual reality education platform', 180, 'VR Edu', 'Unity, C#, Firebase', 'https://github.com/team-epsilon/vr-edu')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (true);

-- Create policies for submissions table
CREATE POLICY "All authenticated users can view submissions" ON public.submissions
    FOR SELECT USING (true);

-- Create policies for votes table
CREATE POLICY "Judges can view all votes" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Judges can insert their own votes" ON public.votes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = votes.judge_id 
            AND users.role = 'judge'
        )
    );

CREATE POLICY "Judges can update their own votes" ON public.votes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = votes.judge_id 
            AND users.role = 'judge'
        )
    );
