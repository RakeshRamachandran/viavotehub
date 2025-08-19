import { supabase } from './supabaseClient';

// Simple password hashing function (in production, use bcrypt or similar)
export const hashPassword = (password) => {
  // In production, use: return bcrypt.hashSync(password, 10);
  
  // Handle both browser and Node.js environments
  if (typeof window !== 'undefined' && window.btoa) {
    // Browser environment
    return window.btoa(password);
  } else if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(password).toString('base64');
  } else {
    // Fallback for other environments
    return btoa(password);
  }
};

// Simple password verification function
export const verifyPassword = (password, hashedPassword) => {
  // In production, use: return bcrypt.compareSync(password, hashedPassword);
  console.log(hashPassword(password), hashedPassword, password)
  return hashPassword(password) === hashedPassword;
};

// Utility function to generate password hash
export const generatePasswordHash = (password) => {
  return hashPassword(password);
};

// Authenticate user against public.users table
export const authenticateUser = async (email, password) => {
  try {
    // Query the public.users table
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, password, role')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Database error:', error);
      return { success: false, error: 'Database error occurred' };
    }

    if (!data) {
      return { success: false, error: 'User not found' };
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, data.password);
    
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Return user data (without password)
    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role
    };

    return { success: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
};

// Create a new user in the public.users table
export const createUser = async (email, name, password) => {
  try {
    const hashedPassword = hashPassword(password);
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          name,
          password: hashedPassword
        }
      ])
      .select('id, email, name')
      .single();

    if (error) {
      console.error('User creation error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (error) {
    console.error('User creation error:', error);
    return { success: false, error: 'Failed to create user' };
  }
};

// Get user by ID from public.users table
export const getUserById = async (userId) => {
  try {
    console.log('🔍 getUserById called with userId:', userId);
    
    // First try to get user by ID
    let { data, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();

    console.log('🔍 getUserById database response:', { data, error });

    if (error) {
      console.error('Get user by ID error:', error);
      return null;
    }

    console.log('🔍 getUserById returning user data:', data);
    return data;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// Get user by email from public.users table (fallback method)
export const getUserByEmail = async (email) => {
  try {
    console.log('🔍 getUserByEmail called with email:', email);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('email', email)
      .single();

    console.log('🔍 getUserByEmail database response:', { data, error });

    if (error) {
      console.error('Get user by email error:', error);
      return null;
    }

    console.log('🔍 getUserByEmail returning user data:', data);
    return data;
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
};

// Create a new submission (superadmin only)
export const createSubmission = async (teamMemberName, submissionLink, problemDescription, hoursSpent, projectName, servicesUsed, gitRepoUrl) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert([
        {
          team_member_name: teamMemberName,
          submission_link: submissionLink,
          problem_description: problemDescription,
          hours_spent: hoursSpent,
          project_name: projectName,
          services_used: servicesUsed,
          git_repo_url: gitRepoUrl
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Submission creation error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, submission: data };
  } catch (error) {
    console.error('Submission creation error:', error);
    return { success: false, error: 'Failed to create submission' };
  }
};

// Update an existing submission (superadmin only)
export const updateSubmission = async (submissionId, updates) => {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .update({
        team_member_name: updates.teamMemberName,
        submission_link: updates.submissionLink,
        problem_description: updates.problemDescription,
        hours_spent: updates.hoursSpent,
        project_name: updates.projectName,
        services_used: updates.servicesUsed,
        git_repo_url: updates.gitRepoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select('*')
      .single();

    if (error) {
      console.error('Submission update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, submission: data };
  } catch (error) {
    console.error('Submission update error:', error);
    return { success: false, error: 'Failed to update submission' };
  }
};

// Delete an existing submission (superadmin only)
export const deleteSubmission = async (submissionId) => {
  try {
    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId);

    if (error) {
      console.error('Submission deletion error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Submission deletion error:', error);
    return { success: false, error: 'Failed to delete submission' };
  }
};
