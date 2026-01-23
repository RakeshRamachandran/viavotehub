require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { supabase } = require('./utils/supabaseClient');

async function setupDatabase() {
  console.log('🚀 Setting up database schema...');

  try {
    // Create users table with roles
    console.log('📋 Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'judge' CHECK (role IN ('judge', 'superadmin')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (usersError) {
      console.log('Users table already exists or error:', usersError.message);
    } else {
      console.log('✅ Users table created successfully');
    }

    // Create submissions table
    console.log('📋 Creating submissions table...');
    const { error: submissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.submissions (
          id SERIAL PRIMARY KEY,
          team_member_name VARCHAR(255) NOT NULL,
          submission_link TEXT NOT NULL,
          problem_description TEXT NOT NULL,
          hours_spent INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (submissionsError) {
      console.log('Submissions table already exists or error:', submissionsError.message);
    } else {
      console.log('✅ Submissions table created successfully');
    }

    // Create votes table
    console.log('📋 Creating votes table...');
    const { error: votesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.votes (
          id SERIAL PRIMARY KEY,
          submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
          judge_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(submission_id, judge_id)
        );
      `
    });

    if (votesError) {
      console.log('Votes table already exists or error:', votesError.message);
    } else {
      console.log('✅ Votes table created successfully');
    }

    // Insert sample users
    console.log('👥 Inserting sample users...');
    const { error: insertUsersError } = await supabase
      .from('users')
      .upsert([
        {
          email: 'admin@example.com',
          name: 'Super Admin',
          password: 'cGFzc3dvcmQxMjM=', // password123 encoded
          role: 'superadmin'
        },
        {
          email: 'judge1@example.com',
          name: 'Judge 1',
          password: 'cGFzc3dvcmQxMjM=', // password123 encoded
          role: 'judge'
        },
        {
          email: 'judge2@example.com',
          name: 'Judge 2',
          password: 'cGFzc3dvcmQxMjM=', // password123 encoded
          role: 'judge'
        }
      ], { onConflict: 'email' });

    if (insertUsersError) {
      console.log('Error inserting users:', insertUsersError.message);
    } else {
      console.log('✅ Sample users created successfully');
    }

    // Insert sample submissions
    console.log('📝 Inserting sample submissions...');
    const { error: insertSubmissionsError } = await supabase
      .from('submissions')
      .upsert([
        {
          team_member_name: 'Team Alpha',
          submission_link: 'https://example.com/project1',
          problem_description: 'AI-powered recommendation system',
          hours_spent: 120
        },
        {
          team_member_name: 'Team Beta',
          submission_link: 'https://example.com/project2',
          problem_description: 'Blockchain-based voting platform',
          hours_spent: 150
        },
        {
          team_member_name: 'Team Gamma',
          submission_link: 'https://example.com/project3',
          problem_description: 'Mobile app for elderly care',
          hours_spent: 90
        },
        {
          team_member_name: 'Team Delta',
          submission_link: 'https://example.com/project4',
          problem_description: 'Sustainable energy monitoring',
          hours_spent: 200
        },
        {
          team_member_name: 'Team Epsilon',
          submission_link: 'https://example.com/project5',
          problem_description: 'Virtual reality education platform',
          hours_spent: 180
        }
      ], { onConflict: 'id' });

    if (insertSubmissionsError) {
      console.log('Error inserting submissions:', insertSubmissionsError.message);
    } else {
      console.log('✅ Sample submissions created successfully');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Sample accounts:');
    console.log('Superadmin: admin@example.com / password123');
    console.log('Judge 1: judge1@example.com / password123');
    console.log('Judge 2: judge2@example.com / password123');
    console.log('\n🔗 You can now login and test the role-based system!');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
