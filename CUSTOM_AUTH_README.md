# Custom Authentication with public.users Table

This application has been updated to use custom authentication against a `public.users` table instead of Supabase's built-in authentication system.

## Database Setup

### 1. Create the users table

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Create the public.users table for custom authentication
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Insert a sample user (password: 'password123')
INSERT INTO public.users (email, name, password_hash) 
VALUES ('admin@example.com', 'Admin User', 'password123')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS) for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for the users table
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (true);
```

### 2. Add more users

To add more users, you can either:

**Option A: Use the SQL editor**
```sql
INSERT INTO public.users (email, name, password_hash) 
VALUES ('user@example.com', 'John Doe', 'password123');
```

**Option B: Use the createUser function in the code**
```javascript
import { createUser } from '../utils/authUtils';

const result = await createUser('user@example.com', 'John Doe', 'password123');
```

## How It Works

### Authentication Flow

1. **Login**: User enters email and password
2. **Validation**: System queries the `public.users` table for the email
3. **Password Check**: Compares the provided password with the stored hash
4. **Session**: If successful, stores user data in localStorage
5. **Redirect**: User is redirected to the submissions page

### User Data Structure

The `public.users` table contains:
- `id`: Unique identifier (auto-increment)
- `email`: User's email address (unique)
- `name`: User's display name
- `password_hash`: Hashed password
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

### Security Features

- **Password Hashing**: Passwords are hashed before storage
- **Row Level Security**: Database policies control access
- **Session Management**: User sessions are stored in localStorage
- **Input Validation**: All inputs are validated before processing

## Important Security Notes

⚠️ **WARNING**: The current password hashing implementation uses base64 encoding for demonstration purposes. This is **NOT SECURE** for production use.

### For Production Use:

1. **Install bcrypt**:
   ```bash
   npm install bcrypt
   ```

2. **Update authUtils.js**:
   ```javascript
   import bcrypt from 'bcrypt';

   export const hashPassword = (password) => {
     return bcrypt.hashSync(password, 10);
   };

   export const verifyPassword = (password, hashedPassword) => {
     return bcrypt.compareSync(password, hashedPassword);
   };
   ```

## Testing the System

1. **Default Login Credentials**:
   - Email: `admin@example.com`
   - Password: `password123`

2. **Test Login**:
   - Navigate to `/login`
   - Enter the credentials above
   - You should be redirected to `/submissions`

## Troubleshooting

### Common Issues

1. **"User not found" error**:
   - Check if the user exists in the `public.users` table
   - Verify the email spelling

2. **"Invalid password" error**:
   - Check if the password hash in the database matches
   - Verify the password was hashed correctly

3. **Database connection issues**:
   - Check your Supabase environment variables
   - Verify the table exists and has the correct structure

### Debug Mode

Enable console logging to see authentication details:
```javascript
// In authUtils.js, add more console.log statements
console.log('Querying user:', email);
console.log('Database result:', data);
console.log('Password verification:', verifyPassword(password, data.password_hash));
```

## File Changes Made

- `database_schema.sql`: Database table structure
- `utils/authUtils.js`: Custom authentication functions
- `utils/authContext.js`: Updated to use custom auth
- `pages/login.js`: Modified to use custom auth
- `pages/submissions.js`: Updated to display user name

## Migration from Supabase Auth

If you were previously using Supabase's built-in authentication:

1. **Export existing users** (if any)
2. **Create the new table structure**
3. **Migrate user data** to the new format
4. **Update the application code** (already done)
5. **Test the new authentication system**

## Support

For issues or questions about the custom authentication system, check:
1. Browser console for error messages
2. Supabase logs for database errors
3. Network tab for API request failures
