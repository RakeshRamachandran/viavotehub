const dotenv = require('dotenv');
// Try to load .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixSubmissionRLS() {
    console.log('🚀 Fixing Submissions RLS Policies...');

    const sql = `
    -- Enable RLS just in case (good practice)
    ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Enable update access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Allow all operations for submissions" ON public.submissions;

    -- Create a permissive policy for ALL operations
    CREATE POLICY "Allow all operations for submissions"
    ON public.submissions
    FOR ALL
    USING (true)
    WITH CHECK (true);
  `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing SQL:', error);
            console.error('Details:', error.message);
        } else {
            console.log('✅ RLS policies updated successfully!');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

fixSubmissionRLS();
