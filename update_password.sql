-- Update the existing user password to use the correct Base64 hash
-- This script fixes the password mismatch issue

-- Update the admin user password from plain text to Base64 hash
UPDATE public.users 
SET password = 'cGFzc3dvcmQxMjM=' 
WHERE email = 'admin@example.com';

-- Verify the update
SELECT id, email, name, password, created_at 
FROM public.users 
WHERE email = 'admin@example.com';

-- You can also create a new user with a different password if needed
-- INSERT INTO public.users (email, name, password) 
-- VALUES ('test@example.com', 'Test User', 'dGVzdDEyMw==')  -- password: test123
-- ON CONFLICT (email) DO NOTHING;
