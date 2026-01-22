# Database Schema Fix

## Issue
The edit functionality in the admin panel is not working because the database is missing several required columns:
- `updated_at` - Timestamp column for tracking when submissions are modified
- `project_name` - VARCHAR column for storing project names
- `services_used` - TEXT column for storing services used

## Solution
Run the SQL script `add_updated_at_column.sql` in your Supabase SQL editor to add the missing columns.

## Steps to Fix

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Fix Script**
   - Copy and paste the contents of `add_updated_at_column.sql`
   - Execute the script

3. **Verify the Fix**
   - The script will automatically verify that all columns were added
   - Check the output to ensure all expected columns are present

## What the Script Does

1. **Adds Missing Columns**:
   - `updated_at` - Timestamp with timezone, defaults to current time
   - `project_name` - VARCHAR(255) for project names
   - `services_used` - TEXT for services used

2. **Sets Default Values**:
   - Sets `updated_at` to `created_at` for existing records

3. **Creates Auto-Update Trigger**:
   - Automatically updates the `updated_at` column whenever a record is modified

4. **Verification**:
   - Shows the current table structure
   - Compares expected vs actual columns

## Expected Result
After running the script, your submissions table should have these columns:
- `id` (SERIAL PRIMARY KEY)
- `team_member_name` (VARCHAR)
- `submission_link` (TEXT)
- `problem_description` (TEXT)
- `hours_spent` (INTEGER)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `project_name` (VARCHAR)
- `services_used` (TEXT)

## After the Fix
Once the database schema is updated:
1. The edit functionality in the admin panel should work correctly
2. All form fields will be properly saved and updated
3. The `updated_at` column will automatically track modification times

## Troubleshooting
If you encounter any issues:
1. Check the Supabase logs for error messages
2. Verify that all columns were added successfully
3. Ensure you have the necessary permissions to alter the table structure
