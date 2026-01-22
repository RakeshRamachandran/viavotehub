
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://atolusadolxgomkfccag.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2x1c2Fkb2x4Z29ta2ZjY2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjEzNjcsImV4cCI6MjA4NDUzNzM2N30.S-bXOl-mJdf4c87RVfQ6KyvVTtztoIByDu4Q66MEZBA';

const { supabase } = require('./utils/supabaseClient');

async function addCreatedAtColumn() {
    console.log('🚀 Adding created_at column to users table...');

    try {
        const { error } = await supabase.rpc('exec_sql', {
            sql: `
        ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `
        });

        if (error) {
            console.error('❌ Error adding column:', error.message);
        } else {
            console.log('✅ Column created_at added successfully (or already exists)');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
}

addCreatedAtColumn();
