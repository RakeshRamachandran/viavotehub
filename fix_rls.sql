-- Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Allow anonymous users (login page) to read user data
-- This is required because your app uses a custom 'public.users' table for auth
-- instead of Supabase's built-in auth system.
CREATE POLICY "Enable read access for all users"
ON public.users
FOR SELECT
USING (true);

-- 2. Allow anonymous users to read submissions
CREATE POLICY "Enable read access for all users"
ON public.submissions
FOR SELECT
USING (true);

-- 3. Allow anonymous users to read votes
CREATE POLICY "Enable read access for all users"
ON public.votes
FOR SELECT
USING (true);

-- 4. Enable RLS on these tables as well (if not already enabled)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

