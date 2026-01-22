-- Update votes table to support 1-10 rating system
-- Run this SQL in your Supabase SQL editor

-- First, drop the existing votes table if it exists
DROP TABLE IF EXISTS votes;

-- Create the new votes table with rating support
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id),
  judge_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, judge_id)
);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_votes_submission_id ON votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_judge_id ON votes(judge_id);
