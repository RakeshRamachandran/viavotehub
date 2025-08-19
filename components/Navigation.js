import Link from 'next/link';
import { useAuth } from '../utils/authContext';

export default function Navigation() {
  const { user } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role) => {
    if (role === 'superadmin') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-600/20 backdrop-blur-sm border border-purple-500/30 text-purple-300">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Super Admin
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 text-blue-300">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Judge
        </span>
      );
    }
  };

  const getRoleDescription = (role) => {
    if (role === 'superadmin') {
      return 'Full system access - Create submissions, view results';
    } else {
      return 'Vote on submissions (1-10 rating scale)';
    }
  };

  return (
    <nav className="bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="/submissions" className="text-lg font-semibold text-white hover:text-blue-300 transition duration-200">
              Submissions
            </Link>
            {user?.role === 'superadmin' && (
              <Link href="/analytics" className="text-lg font-semibold text-white hover:text-blue-300 transition duration-200">
                Results Dashboard
              </Link>
            )}
            {user?.role === 'superadmin' && (
              <Link href="/admin" className="text-lg font-semibold text-white hover:text-blue-300 transition duration-200">
                Admin Dashboard
              </Link>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end space-y-1">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-blue-200">
                  Welcome, {user?.name || user?.email}
                </span>
                {getRoleBadge(user?.role)}
              </div>
              <span className="text-xs text-slate-300">
                {getRoleDescription(user?.role)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
