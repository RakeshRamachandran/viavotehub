# Authentication Setup Guide

## Prerequisites

1. **Supabase Account**: You need a Supabase account and project
2. **Node.js**: Make sure you have Node.js installed

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the "Project URL" and "anon public" key
5. Paste them in your `.env.local` file

## Database Setup

Make sure you have the following tables in your Supabase database:

### Users Table (Auto-created by Supabase Auth)
- This is automatically managed by Supabase

### Submissions Table
```sql
CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  team_member_name TEXT NOT NULL,
  submission_link TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  hours_spent INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Votes Table
```sql
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id),
  judge_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, judge_id)
);
```

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- **Modern Login UI**: Beautiful, responsive login page with proper error handling
- **Authentication Context**: Manages user state across the application
- **Protected Routes**: Automatically redirects unauthenticated users
- **Session Management**: Handles login/logout and session persistence
- **Responsive Design**: Works on all device sizes

## File Structure

- `pages/login.js` - Enhanced login page with modern UI
- `pages/submissions.js` - Protected submissions page with logout
- `utils/authContext.js` - Authentication context provider
- `utils/ProtectedRoute.js` - Route protection component
- `utils/supabaseClient.js` - Supabase client configuration
- `pages/_app.js` - App wrapper with auth provider

## Security Features

- Protected routes that require authentication
- Automatic session management
- Secure logout functionality
- Input validation and sanitization
- CSRF protection through Supabase
