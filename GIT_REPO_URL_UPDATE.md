# Git Repository URL Field Addition

This update adds a new `git_repo_url` field to the submissions system, allowing users to link their GitHub repositories or other Git hosting services to their submissions.

## Changes Made

### 1. Database Schema Updates
- **File**: `database_schema.sql`
- **Changes**: Added `git_repo_url TEXT` field to the `submissions` table
- **Sample Data**: Updated sample submissions with example Git repository URLs

### 2. Database Migration
- **File**: `update_submissions_schema.sql`
- **Purpose**: Script to add the new field to existing databases
- **Usage**: Run this script on your existing database to add the new column

### 3. Backend Functions
- **File**: `utils/authUtils.js`
- **Changes**: Updated `createSubmission` and `updateSubmission` functions to handle the new field

### 4. Frontend Forms
- **File**: `pages/admin.js`
- **Changes**: 
  - Added Git Repo URL input field to create submission form
  - Added Git Repo URL input field to edit submission form
  - Added Git Repo URL column to submissions table
  - Added Git Repo URL to submission detail modal
  - Added Git Repo URL to judge dashboard view
  - Updated search functionality to include Git Repo URL

## Database Update Instructions

### Option 1: Run the Migration Script
```sql
-- Run the update_submissions_schema.sql file in your database
-- This will add the new columns and populate them with sample data
```

### Option 2: Manual Database Update
```sql
-- Add the new column
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS git_repo_url TEXT;

-- Update existing submissions with placeholder data (optional)
UPDATE public.submissions 
SET git_repo_url = 'https://github.com/example/project-' || id 
WHERE git_repo_url IS NULL;
```

## New Field Details

- **Field Name**: `git_repo_url`
- **Type**: TEXT (nullable)
- **Purpose**: Store links to Git repositories (GitHub, GitLab, Bitbucket, etc.)
- **Validation**: Frontend validates as URL format
- **Display**: Clickable links that open in new tab

## Features

1. **Create Submission**: Users can now add Git repository URLs when creating submissions
2. **Edit Submission**: Existing submissions can be updated to include Git repository URLs
3. **Search**: Users can search submissions by Git repository URL
4. **Display**: Git repository URLs are displayed as clickable links throughout the interface
5. **Judge View**: Judges can see Git repository URLs in the dashboard view

## Example Usage

```javascript
// Creating a submission with Git repo URL
const result = await createSubmission(
  'John Doe',
  'https://example.com/project',
  'AI-powered chatbot',
  40,
  'ChatBot Pro',
  'React, Node.js, OpenAI API',
  'https://github.com/johndoe/chatbot-pro'
);
```

## Backward Compatibility

- Existing submissions without Git repository URLs will display "N/A" or "No repository linked"
- The field is optional, so existing functionality remains unchanged
- All existing API endpoints continue to work as before

## Testing

After implementing these changes:

1. **Create Form**: Test creating a new submission with a Git repository URL
2. **Edit Form**: Test editing an existing submission to add/update the Git repository URL
3. **Search**: Test searching by Git repository URL
4. **Display**: Verify Git repository URLs appear correctly in all views
5. **Links**: Test that Git repository URLs open correctly in new tabs

## Notes

- Git repository URLs are validated as URLs on the frontend
- The field supports any Git hosting service (GitHub, GitLab, Bitbucket, etc.)
- URLs are displayed as clickable links with proper security attributes (`rel="noopener noreferrer"`)
- The field is included in all CRUD operations (Create, Read, Update, Delete)
