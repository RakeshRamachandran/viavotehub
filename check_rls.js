require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLS() {
    console.log('Checking read access to `users` table...');

    // 1. Try to count ALL users (often blocked by RLS if Select policy is restrictive)
    const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.log('❌ Count failed:', countError.message);
    } else {
        console.log(`✅ Table seems accessible. Total rows visible to anon: ${count}`);
    }

    // 2. Try to fetch the specific user trying to login (replace email if possible or just fetch any)
    const { data, error } = await supabase
        .from('users')
        .select('email')
        .limit(1);

    if (error) {
        console.log('❌ Select failed:', error.message, error.code, error.details);
    } else if (data.length === 0) {
        console.log('❌ Query successful but returned 0 rows. RLS is likely hiding the data.');
    } else {
        console.log('✅ Successfully read a row from users:', data[0]);
    }

    // 3. Check Submissions
    console.log('\nChecking read access to `submissions` table...');
    const { count: subCount, error: subError } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true });

    if (subError) {
        console.log('❌ Submissions Count failed:', subError.message);
    } else {
        console.log(`✅ Submissions table accessible. Total rows: ${subCount}`);
    }

    // 4. Check Votes
    console.log('\nChecking read access to `votes` table...');
    const { count: voteCount, error: voteError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true });

    if (voteError) {
        console.log('❌ Votes Count failed:', voteError.message);
    } else {
        console.log(`✅ Votes table accessible. Total rows: ${voteCount}`);
    }
}

checkRLS();
