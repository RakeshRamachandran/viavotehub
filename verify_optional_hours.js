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

async function verifyOptionalHours() {
    console.log('🧪 Verifying Optional Hours Submission...');

    const testSubmission = {
        team_member_name: 'Optional Hours Test',
        submission_link: 'https://example.com/optional-hours',
        problem_description: 'Testing optional hours',
        hours_spent: null, // explicitly null
        project_name: 'Optional Hours Project',
        services_used: 'Supabase',
        git_repo_url: 'https://github.com/example/optional-hours',
        category: 'Via Hackathon'
    };

    try {
        const { data, error } = await supabase
            .from('submissions')
            .insert([testSubmission])
            .select()
            .single();

        if (error) {
            console.error('❌ Failed to create submission:', error.message);
        } else {
            console.log('✅ Submission created successfully with null hours!');
            console.log('   ID:', data.id);
            console.log('   Hours Spent:', data.hours_spent);

            // Clean up
            const { error: deleteError } = await supabase.from('submissions').delete().eq('id', data.id);
            if (deleteError) console.error('⚠️ Failed to clean up:', deleteError.message);
            else console.log('🧹 Cleaned up test submission.');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

verifyOptionalHours();
