-- Verify the current state of the users table
-- Run this in your Supabase SQL editor to see what's actually stored

-- Check all users and their password hashes
SELECT 
    id,
    email,
    name,
    password,
    LENGTH(password) as password_length,
    created_at
FROM public.users;

-- Check specifically for the admin user
SELECT 
    id,
    email,
    name,
    password,
    LENGTH(password) as password_length,
    created_at
FROM public.users 
WHERE email = 'admin@example.com';

-- Verify the password hash matches what we expect
-- The password 'password123' should hash to 'cGFzc3dvcmQxMjM='
SELECT 
    CASE 
        WHEN password = 'cGFzc3dvcmQxMjM=' THEN '✅ CORRECT HASH'
        ELSE '❌ WRONG HASH - Expected: cGFzc3dvcmQxMjM='
    END as hash_status,
    password,
    'cGFzc3dvcmQxMjM=' as expected_hash
FROM public.users 
WHERE email = 'admin@example.com';

-- If the hash is wrong, update it:
-- UPDATE public.users 
-- SET password = 'cGFzc3dvcmQxMjM=' 
-- WHERE email = 'admin@example.com';
