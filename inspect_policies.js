const dotenv = require('dotenv');
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

async function inspectPolicies() {
    console.log('🔍 Inspecting RLS policies for "submissions" table...');

    const sql = `
    SELECT * FROM pg_policies WHERE tablename = 'submissions';
  `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing SQL:', error);
            console.error('Details:', error.message);
        } else {
            console.log('✅ Active Policies:', data);

            // Also check if RLS is enabled
            const rlsSql = `
        SELECT relname, relrowsecurity 
        FROM pg_class 
        WHERE relname = 'submissions';
      `;
            const { data: rlsData, error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSql });
            if (rlsError) {
                console.error('❌ Error checking RLS status:', rlsError);
            } else {
                console.log('🔒 RLS Status:', rlsData);
            }
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

inspectPolicies();
