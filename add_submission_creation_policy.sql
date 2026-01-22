-- Database policy setup for custom authentication system
-- Since you're using custom authentication, we'll disable RLS and handle permissions in the application

-- Disable Row Level Security for submissions table to allow superadmin operations
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- Alternative: If you prefer to keep RLS enabled, use this more permissive policy
-- CREATE POLICY "Allow all operations for submissions" ON public.submissions
--     FOR ALL USING (true)
--     WITH CHECK (true);

-- Note: With custom authentication, it's recommended to handle permissions at the application level
-- where you can check user roles before allowing operations like creating submissions.
