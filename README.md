# 🗳️ Via Voting App

A comprehensive, role-based voting application built with modern web technologies for managing project submissions and judge evaluations.

## 🚀 Features

### 🎯 Role-Based Access Control
- **Judge Role**: Can view submissions and vote on them using a 1-10 rating scale
- **Superadmin Role**: Can view all submissions and judge votes, but cannot vote themselves
- Secure authentication with role-based permissions

### 📊 Submissions Management
- View project submissions with detailed information
- Rate submissions from 1 to 10 scale
- Update existing votes
- View average ratings and vote counts
- Track project details including team members, descriptions, and links

### 📈 Analytics & Results
- Top 3 projects based on overall scores
- Complete ranking of all submissions
- Individual judge votes for each submission
- Score consistency analysis (standard deviation)
- Total score, average rating, and judge count metrics
- Real-time results updates

### 🔐 Security Features
- Row Level Security (RLS) enabled on all database tables
- Role-based database policies
- Protected routes for authenticated users
- Secure password authentication with Base64 encoding
- Custom authentication system

## 🛠️ Tech Stack

### Frontend
- **Next.js** - React framework for production
- **React** - JavaScript library for building user interfaces
- **TailwindCSS** - Utility-first CSS framework
- **PostCSS** - CSS transformation tool
- **Autoprefixer** - CSS vendor prefixing

### Backend & Database
- **Supabase** - Open-source Firebase alternative
- **PostgreSQL** - Advanced open-source database
- **Row Level Security (RLS)** - Database-level security policies

### Development Tools
- **Node.js** - JavaScript runtime
- **npm** - Package manager
- **Git** - Version control

### Key Libraries
- **@supabase/supabase-js** - Supabase JavaScript client
- **dotenv** - Environment variable management

## 📁 Project Structure

```
via-voting-app/
├── components/                 # React components
│   ├── Navigation.js          # Role-based navigation component
│   └── ErrorBoundary.js       # Error handling component
├── pages/                     # Next.js pages
│   ├── _app.js               # App wrapper
│   ├── _document.js          # Document wrapper
│   ├── index.js              # Home page
│   ├── login.js              # Authentication page
│   ├── submissions.js        # Submissions and voting page
│   ├── analytics.js          # Results and analytics page
│   └── admin.js              # Admin panel
├── utils/                     # Utility functions
│   ├── authContext.js        # Authentication context
│   ├── authUtils.js          # Authentication utilities
│   ├── supabaseClient.js     # Supabase client configuration
│   └── ProtectedRoute.js     # Route protection component
├── styles/                    # CSS styles
├── .next/                     # Next.js build output
├── node_modules/              # Dependencies
├── database_schema.sql        # Complete database schema
├── setup_database.js          # Database setup script
├── package.json               # Project dependencies
├── tailwind.config.js         # TailwindCSS configuration
├── postcss.config.js          # PostCSS configuration
└── README.md                  # This file
```

## 🗄️ Database Schema

The system uses three main tables with Row Level Security:

### Users Table
- User accounts with role-based permissions (judge/superadmin)
- Secure password storage
- Timestamp tracking

### Submissions Table
- Project submissions with detailed information
- Team member details, problem descriptions
- Links to projects and repositories
- Time tracking (hours spent)

### Votes Table
- Individual judge ratings for each submission
- 1-10 rating scale
- Unique constraint per judge per submission
- Timestamp tracking

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- PostgreSQL database

### 1. Clone the Repository
```bash
git clone <repository-url>
cd via-voting-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
Run the database schema in your Supabase SQL editor:
```sql
-- Execute database_schema.sql in Supabase
```

Or use the automated setup script:
```bash
node setup_database.js
```

### 4. Configure Environment
Set up your Supabase credentials in `utils/supabaseClient.js`:
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
```

### 5. Run the Application
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 6. Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👥 Sample Accounts

### Superadmin
- **Email**: `admin@example.com`
- **Password**: `password123`
- **Role**: Full access to view all data

### Judges
- **Judge 1**: `judge1@example.com` / `password123`
- **Judge 2**: `judge2@example.com` / `password123`
- **Role**: Can vote on submissions

## 📱 Usage Guide

### For Judges
1. Login with judge account credentials
2. Navigate to Submissions page
3. View project details and rate submissions (1-10 scale)
4. Update votes as needed
5. Check Analytics page for current rankings

### For Superadmins
1. Login with superadmin account credentials
2. View all submissions and judge votes
3. Access Analytics page for comprehensive results
4. Monitor voting progress across all judges
5. Cannot vote on submissions

## 🔧 Configuration

### TailwindCSS
Custom color scheme and animations are configured in `tailwind.config.js`:
- Primary color palette
- Custom fade-in and slide-up animations
- Responsive design utilities

### Database Policies
Row Level Security policies ensure:
- Users can only access data they're authorized to see
- Judges can only vote once per submission
- Role-based access control at the database level

## 🚀 Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables
Ensure the following environment variables are set:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Test thoroughly before submitting
- Update documentation as needed
- Ensure all tests pass

## 📚 Additional Documentation

- [Database Setup Guide](DATABASE_FIX_README.md)
- [Custom Authentication Guide](CUSTOM_AUTH_README.md)
- [Git Repository Update Guide](GIT_REPO_URL_UPDATE.md)
- [Setup Instructions](SETUP.md)

## 🐛 Troubleshooting

### Common Issues
1. **Database Connection**: Verify Supabase credentials
2. **Authentication**: Check user roles and permissions
3. **Build Errors**: Ensure all dependencies are installed

### Support
For detailed documentation and troubleshooting, see the additional README files in the project root.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with Next.js and React
- Styled with TailwindCSS
- Powered by Supabase and PostgreSQL
- Enhanced with custom authentication and role-based access control

---

**Made with ❤️ for efficient project evaluation and voting systems**