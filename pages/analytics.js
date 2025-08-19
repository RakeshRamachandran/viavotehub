import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/authContext';
import ProtectedRoute from '../utils/ProtectedRoute';
import Navigation from '../components/Navigation';
import { useRouter } from 'next/router';

export default function Analytics() {
  const [topProjects, setTopProjects] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-superadmin users away from analytics page
    if (user && user.role !== 'superadmin') {
      router.push('/submissions');
      return;
    }
    
    if (user?.role === 'superadmin') {
      fetchAnalytics();
    }
  }, [user, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all submissions with their votes
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          votes (
            rating,
            users!votes_judge_id_fkey(name, email)
          )
        `);

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        setMessage('Error fetching submissions data');
        return;
      }

      // Calculate scores and statistics for each submission
      const submissionsWithScores = submissionsData.map(sub => {
        const votes = sub.votes || [];
        const totalRating = votes.reduce((sum, vote) => sum + vote.rating, 0);
        const averageRating = votes.length > 0 ? (totalRating / votes.length).toFixed(2) : 0;
        const totalScore = totalRating;
        const judgeCount = votes.length;
        
        // Calculate standard deviation for score consistency
        let standardDeviation = 0;
        if (votes.length > 1) {
          const mean = totalRating / votes.length;
          const squaredDiffs = votes.map(vote => Math.pow(vote.rating - mean, 2));
          const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / votes.length;
          standardDeviation = Math.sqrt(variance).toFixed(2);
        }

        return {
          ...sub,
          totalScore,
          averageRating: parseFloat(averageRating),
          judgeCount,
          standardDeviation: parseFloat(standardDeviation),
          votes: votes.map(vote => ({
            judgeName: vote.users.name,
            rating: vote.rating
          }))
        };
      });

      // Sort by total score (descending) and get top 3
      const sortedSubmissions = submissionsWithScores.sort((a, b) => b.totalScore - a.totalScore);
      const top3 = sortedSubmissions.slice(0, 3);
      
      setTopProjects(top3);
      setAllSubmissions(sortedSubmissions);
      setMessage('');
    } catch (error) {
      console.error('Error in analytics:', error);
      setMessage('Error loading analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const getScoreColor = (score) => {
    if (score >= 24) return 'text-green-600';
    if (score >= 18) return 'text-yellow-600';
    if (score >= 12) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRankBadge = (rank) => {
    const badges = {
      1: { text: '🥇 1st Place', color: 'bg-yellow-600/20 backdrop-blur-sm border-yellow-500/30 text-yellow-300 border' },
      2: { text: '🥈 2nd Place', color: 'bg-slate-600/20 backdrop-blur-sm border-slate-500/30 text-slate-300 border' },
      3: { text: '🥉 3rd Place', color: 'bg-orange-600/20 backdrop-blur-sm border-orange-500/30 text-orange-300 border' }
    };
    return badges[rank] || { text: `${rank}th Place`, color: 'bg-blue-600/20 backdrop-blur-sm border-blue-500/30 text-blue-300 border' };
  };

  // If not superadmin, show access denied
  if (user && user.role !== 'superadmin') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-slate-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
            <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
          </div>
          
          <Navigation />
          <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto h-20 w-20 bg-red-600/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-slate-300 mb-6">Only Super Admins can access the Results Dashboard.</p>
                <button
                  onClick={() => router.push('/submissions')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Go to Submissions
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-slate-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
            <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
          </div>
          
          <Navigation />
          <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 max-w-md w-full">
              <div className="text-center">
                <div className="mx-auto h-20 w-20 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="h-10 w-10 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Loading Analytics</h2>
                <p className="text-slate-300 mb-6">Please wait while we load your analytics data...</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-slate-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        {/* Navigation */}
        <Navigation />
        
        {/* Header */}
        <header className="relative z-10 bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Results Dashboard</h1>
                  <p className="text-green-200 text-sm">Analytics & Rankings</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600/20 backdrop-blur-sm border border-red-500/30 text-red-300 px-4 py-2 rounded-xl text-sm font-medium transition duration-200 hover:bg-red-600/30 hover:border-red-400/50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">


          {message && (
            <div className="mb-6 p-4 bg-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-2xl">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300">{message}</p>
              </div>
            </div>
          )}
          


          {/* Top 3 Projects Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">🏆 Top 3 Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topProjects.map((project, index) => {
                const rank = index + 1;
                const badge = getRankBadge(rank);
                return (
                  <div key={project.id} className="bg-white/5 backdrop-blur-xl p-6 border border-white/10 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/10">
                    <div className="text-center mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-white mb-2 text-center">
                      {project.team_member_name}
                    </h3>
                    {project.project_name && (
                      <p className="text-blue-200 text-sm text-center mb-2">
                        📁 {project.project_name}
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-400">
                          {project.totalScore}
                        </p>
                        <p className="text-sm text-blue-200">Total Score</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-white">
                            {project.averageRating}
                          </p>
                          <p className="text-xs text-blue-200">Avg Rating</p>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-white">
                            {project.judgeCount}
                          </div>
                          <div className="text-xs text-blue-200">Judges</div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-blue-200">Consistency</p>
                        <p className="text-sm font-medium text-white">
                          {project.standardDeviation > 0 ? `±${project.standardDeviation}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Complete Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Judges
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Individual Votes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allSubmissions.map((submission, index) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {submission.team_member_name}
                          </div>
                          {submission.project_name && (
                            <div className="text-sm text-blue-600 font-medium">
                              📁 {submission.project_name}
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            {submission.problem_description.substring(0, 50)}...
                          </div>
                          {submission.services_used && (
                            <div className="text-sm text-green-600">
                              🛠️ {submission.services_used.substring(0, 40)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-lg font-semibold ${getScoreColor(submission.totalScore)}`}>
                          {submission.totalScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.averageRating}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.judgeCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          {submission.votes.map((vote, voteIndex) => (
                            <div key={voteIndex} className="flex justify-between">
                              <span className="text-gray-600">{vote.judgeName}:</span>
                              <span className="font-medium">{vote.rating}/10</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Logout Confirmation Overlay */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center">
                {/* Icon */}
                <div className="mx-auto h-16 w-16 bg-red-600/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg className="h-8 w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2">Confirm Logout</h3>
                
                {/* Message */}
                <p className="text-slate-300 mb-6">
                  Are you sure you want to logout, <span className="font-semibold text-white">{user?.name}</span>?
                  <br />
                  <span className="text-sm text-slate-400">
                    ({user?.role === 'superadmin' ? 'Super Admin' : 'Judge'})
                  </span>
                </p>
                
                {/* Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={cancelLogout}
                    className="flex-1 px-6 py-3 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70 hover:border-slate-400/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
