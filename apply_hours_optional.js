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

async function applySchemaChange() {
    console.log('🚀 Making "hours_spent" optional...');

    // Note: We cannot use standard ALTER TABLE commands easily via the JS client without exec_sql RPC.
    // Assuming exec_sql is available (since we verified the user should have it, or we are using the same method as before).

    const sql = `
    ALTER TABLE public.submissions ALTER COLUMN hours_spent DROP NOT NULL;
  `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing SQL:', error);
            // Fallback message if RPC fails
            console.log('\n⚠️ If the RPC call failed, please run this SQL in your Supabase Dashboard:');
            console.log(sql);
        } else {
            console.log('✅ Schema updated: "hours_spent" is now optional (NULLable).');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

applySchemaChange();
