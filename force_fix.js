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

async function forceFix() {
    console.log('🚀 Force Applying RLS and Schema Fixes...');

    const sql = `
    -- 1. Ensure RLS is enabled
    ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

    -- 2. Drop all restrictive policies
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Enable insert access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Enable update access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Enable delete access for all users" ON public.submissions;
    DROP POLICY IF EXISTS "Allow all operations for submissions" ON public.submissions;

    -- 3. Create permissive policy
    CREATE POLICY "Allow all operations for submissions"
    ON public.submissions
    FOR ALL
    USING (true)
    WITH CHECK (true);

    -- 4. Ensure hours_spent is nullable
    ALTER TABLE public.submissions ALTER COLUMN hours_spent DROP NOT NULL;
  `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing SQL:', error);
            console.error('Details:', error.message);
        } else {
            console.log('✅ SQL executed successfully!');
        }

        // Refresh schema cache
        console.log('🔄 Refreshing schema cache...');
        await supabase.rpc('reload_schema_cache', {}); // hypothetical, or just simple query

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

forceFix();
