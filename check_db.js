require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Checking connection...');
    try {
        const { data: submissions, error: subError } = await supabase.from('submissions').select('*').limit(1);

        if (subError) {
            console.error('Error querying submissions:', JSON.stringify(subError, null, 2));
        } else {
            console.log('Submissions found:', submissions ? submissions.length : 0);
        }

        console.log('Checking USERS table...');
        const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1);
        if (usersError) {
            console.error('Error querying users:', JSON.stringify(usersError, null, 2));
        } else {
            console.log('Users found:', users ? users.length : 0);
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

check();
