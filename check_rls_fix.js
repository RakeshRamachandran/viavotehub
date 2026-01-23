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

// Helper function to create submission
const createSubmission = async (data) => {
    const { data: submission, error } = await supabase
        .from('submissions')
        .insert([{
            team_member_name: data.teamMemberName,
            submission_link: data.submissionLink,
            problem_description: data.problemDescription,
            hours_spent: data.hoursSpent,
            project_name: data.projectName,
            services_used: data.servicesUsed,
            git_repo_url: data.gitRepoUrl,
            category: data.category
        }])
        .select('*')
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, submission };
};

// Helper function to delete submission
const deleteSubmission = async (id) => {
    const { error } = await supabase
        .from('submissions')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
};

async function verifyFix() {
    console.log('🧪 Verifying RLS Fix...');

    const testSubmission = {
        teamMemberName: 'RLS Test User',
        submissionLink: 'https://example.com/rls-test',
        problemDescription: 'Testing RLS policies',
        hoursSpent: 1,
        projectName: 'RLS Verification',
        servicesUsed: 'Supabase',
        gitRepoUrl: 'https://github.com/example/rls-test',
        category: 'Via Hackathon'
    };

    console.log('📝 Attempting to create validation submission...');
    const createResult = await createSubmission(testSubmission);

    if (createResult.success) {
        console.log('✅ Submission created successfully!');
        console.log('   ID:', createResult.submission.id);

        console.log('🧹 Cleaning up (deleting submission)...');
        const deleteResult = await deleteSubmission(createResult.submission.id);

        if (deleteResult.success) {
            console.log('✅ Submission deleted successfully!');
            console.log('🎉 Verification COMPLETE: RLS fix is working.');
        } else {
            console.error('⚠️ Submission created but failed to delete:', deleteResult.error);
        }
    } else {
        console.error('❌ Failed to create submission:', createResult.error);
    }
}

verifyFix();
