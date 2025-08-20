import Link from 'next/link';
import { useAuth } from '../utils/authContext';
import { useState } from 'react';

export default function Navigation() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const getRoleBadge = (role) => {
    if (role === 'superadmin') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-purple-600/20 backdrop-blur-sm border border-purple-500/30 text-purple-300">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="hidden sm:inline">Super Admin</span>
          <span className="sm:hidden">Admin</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 text-blue-300">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="bg-white/5 backdrop-blur-md border-b border-white/10 shadow-lg relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Brand - Mobile Responsive */}
          <div className="flex items-center space-x-4">
            <Link href="/submissions" className="text-lg sm:text-xl font-semibold text-white hover:text-blue-300 transition duration-200">
              <span className="hidden sm:inline">Submissions</span>
              <span className="sm:hidden">VIA</span>
            </Link>
          </div>

          {/* Desktop Navigation - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-8">
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
          
          {/* User Info and Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            {/* User Info - Responsive */}
            <div className="hidden sm:flex flex-col items-end space-y-1">
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

            {/* Mobile User Info - Simplified */}
            <div className="sm:hidden flex items-center space-x-2">
              <span className="text-xs text-blue-200">
                {user?.name || user?.email}
              </span>
              {getRoleBadge(user?.role)}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-white hover:text-blue-300 transition duration-200"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu - Responsive Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-4">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/submissions" 
                className="text-lg font-semibold text-white hover:text-blue-300 transition duration-200 py-2 px-4 rounded-lg hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Submissions
              </Link>
              {user?.role === 'superadmin' && (
                <Link 
                  href="/analytics" 
                  className="text-lg font-semibold text-white hover:text-blue-300 transition duration-200 py-2 px-4 rounded-lg hover:bg-white/5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Results Dashboard
                </Link>
              )}
              {user?.role === 'superadmin' && (
                <Link 
                  href="/admin" 
                  className="text-lg font-semibold text-white hover:text-blue-300 transition duration-200 py-2 px-4 rounded-lg hover:bg-white/5"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
