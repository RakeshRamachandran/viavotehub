import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/authContext';
import ProtectedRoute from '../utils/ProtectedRoute';
import Navigation from '../components/Navigation';
import ErrorBoundary from '../components/ErrorBoundary';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRating, setSelectedRating] = useState(5);
  const [remarks, setRemarks] = useState('');
  const [votingFor, setVotingFor] = useState(null);
  const [judgeVotes, setJudgeVotes] = useState({});
  const [submissionRatings, setSubmissionRatings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const { user, signOut, loading: authLoading } = useAuth();

  // Custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
        margin: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
        border: 2px solid #f1f5f9;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      .custom-scrollbar::-webkit-scrollbar-corner {
        background: transparent;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Filter submissions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSubmissions(submissions);
    } else {
      const filtered = submissions.filter(sub =>
        sub.team_member_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubmissions(filtered);
    }
  }, [searchTerm, submissions]);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth to finish loading
    }
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchSubmissions();
        // Fetch judge votes for all users to show individual ratings
        if (user) {
          await fetchJudgeVotes();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setMessage('Error loading data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, authLoading]);

  const fetchSubmissions = async () => {
    // Fetch submissions with their average ratings and vote counts
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        *,
        votes (
          rating
        )
      `);
    
    if (error) {
      console.error(error);
      return;
    }

    // Calculate average ratings and vote counts
    const submissionsWithRatings = data.map(sub => {
      const votes = sub.votes || [];
      const totalRating = votes.reduce((sum, vote) => sum + vote.rating, 0);
      const averageRating = votes.length > 0 ? (totalRating / votes.length).toFixed(1) : 0;
      
      return {
        ...sub,
        averageRating: parseFloat(averageRating),
        voteCount: votes.length
      };
    });

    setSubmissions(submissionsWithRatings);
  };

  const fetchJudgeVotes = async () => {
    // Fetch all votes with judge information for superadmin view
    const { data, error } = await supabase
      .from('votes')
      .select(`
        *,
        users!votes_judge_id_fkey(name, email),
        submissions!votes_submission_id_fkey(team_member_name)
      `)
      .order('submission_id', { ascending: true });

    if (error) {
      console.error('Error fetching judge votes:', error);
      return;
    }

    // Group votes by submission
    const votesBySubmission = {};
    data.forEach(vote => {
      if (!votesBySubmission[vote.submission_id]) {
        votesBySubmission[vote.submission_id] = [];
      }
      votesBySubmission[vote.submission_id].push({
        judge_id: vote.judge_id,
        judgeName: vote.users.name,
        judgeEmail: vote.users.email,
        rating: vote.rating,
        remarks: vote.remarks,
        submissionName: vote.submissions.team_member_name
      });
    });

    setJudgeVotes(votesBySubmission);
  };

  const handleVote = async (submissionId) => {
    if (!user) {
      setMessage('Please log in first.');
      return;
    }

    if (!shouldShowVoting) {
      setMessage('Only judges can vote on submissions.');
      return;
    }

    if (selectedRating < 1 || selectedRating > 10) {
      setMessage('Please select a rating between 1 and 10.');
      return;
    }

    // Check if user has already voted for this submission
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('judge_id', user.id)
      .single();

    let result;
    if (existingVote) {
      // Update existing vote
      result = await supabase
        .from('votes')
        .update({ rating: selectedRating, remarks: remarks })
        .eq('submission_id', submissionId)
        .eq('judge_id', user.id);
    } else {
      // Insert new vote
      result = await supabase
        .from('votes')
        .insert({
          submission_id: submissionId,
          judge_id: user.id,
          rating: selectedRating,
          remarks: remarks
        });
    }

    if (result.error) {
      setMessage(result.error.message);
            } else {
          setMessage(`Rating of ${selectedRating} submitted successfully!`);
          // Save the submitted rating for this submission
          setSubmissionRatings(prev => ({
            ...prev,
            [submissionId]: selectedRating
          }));
          setVotingFor(null);
          setSelectedRating(5);
          setRemarks('');
          fetchSubmissions();
          // Refresh judge votes for all users to show updated ratings
          fetchJudgeVotes();
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

  const startVoting = (submissionId) => {
    setVotingFor(submissionId);
    // Use existing vote from judge votes if available, otherwise default to 5
    const existingVote = judgeVotes[submissionId]?.find(vote => vote.judge_id == user.id);
    const storedRating = existingVote ? existingVote.rating : 5;
    const storedRemarks = existingVote ? existingVote.remarks : '';
    setSelectedRating(storedRating);
    setRemarks(storedRemarks);
  };

  const cancelVoting = () => {
    setVotingFor(null);
    setSelectedRating(5);
    setRemarks('');
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const canVote = user && user.role === 'judge';
  const shouldShowVoting = canVote;

  // Function to highlight search terms in text
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-400/30 text-yellow-200 px-1 rounded">$1</mark>');
  };

  // Get unique team member names for suggestions
  const uniqueTeamMembers = [...new Set(submissions.map(sub => sub.team_member_name))].sort();

  // Don't render if user is not properly loaded
  if (!user || !user.role) {
    return (
      <ErrorBoundary>
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
                  <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <svg className="h-10 w-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Loading User Session</h2>
                  <p className="text-slate-300 mb-6">Please wait while we load your user information...</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ProtectedRoute>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Submissions Dashboard</h1>
                    <p className="text-blue-200 text-xs sm:text-sm">Team Evaluation Platform</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-600/20 backdrop-blur-sm border border-red-500/30 text-red-300 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition duration-200 hover:bg-red-600/30 hover:border-red-400/50 self-end sm:self-auto"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative z-10 max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 xl:p-8">
            {/* Loading State */}
            {authLoading && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-blue-300 text-sm sm:text-base">Loading user session...</p>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {message && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-600/10 backdrop-blur-sm border border-green-500/30 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-green-300 text-sm sm:text-base">{message}</p>
                </div>
              </div>
            )}
            
            {/* Welcome and Role Information Panel */}
            {user && (
              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                        Welcome back, {user.name}!
                      </h3>
                      <p className="text-blue-200 text-sm sm:text-base">
                        {user.role === 'superadmin' 
                          ? 'You have full system access. View all submissions, judge votes, and access admin features.'
                          : 'You can view all submissions and vote on them using a 1-10 rating scale.'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-center lg:text-right">
                    <div className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-white/10 backdrop-blur-sm border border-white/20 text-white">
                      {user.role === 'superadmin' ? (
                        <>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="hidden sm:inline">Super Admin</span>
                          <span className="sm:hidden">Admin</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Judge
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State for Submissions */}
            {isLoading && (
              <div className="bg-white/5 backdrop-blur-xl p-8 mb-6 border border-white/10 rounded-3xl shadow-2xl">
                <div className="flex items-center justify-center space-x-4">
                  <svg className="animate-spin h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-blue-200 text-lg">Loading submissions...</p>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search submissions by team member name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchTerm('');
                      e.target.blur();
                    }
                  }}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-200"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors duration-200"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Submissions Grid */}
            {!isLoading && (
              <>
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="bg-white/5 backdrop-blur-xl p-6 sm:p-8 border border-white/10 rounded-3xl shadow-2xl">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-600/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <svg className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-3.042 0-5.824-1.135-7.938-3M9 12H5a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                        {searchTerm ? 'No Search Results Found' : 'No Submissions Available'}
                      </h3>
                      <p className="text-slate-300 mb-4 text-sm sm:text-base">
                        {searchTerm 
                          ? `No submissions found for "${searchTerm}". Try adjusting your search terms.`
                          : 'There are currently no submissions in the system.'
                        }
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600/50 backdrop-blur-sm border border-blue-500/30 text-blue-200 rounded-xl font-medium transition duration-200 hover:bg-blue-600/70 hover:text-white text-sm"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Clear Search</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {filteredSubmissions.map((sub) => (
                      <div key={sub.id} className="bg-white/5 backdrop-blur-xl p-4 sm:p-6 border border-white/10 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:bg-white/10">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                            <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white" 
                                dangerouslySetInnerHTML={{ 
                                  __html: highlightSearchTerm(sub.team_member_name, searchTerm) 
                                }} />
                            <p className="text-blue-200 text-xs sm:text-sm">Team Member</p>
                          </div>
                        </div>
                    
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setShowDetailModal(true);
                        }}
                        className="w-full inline-flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-green-600/50 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-xl font-medium transition duration-200 hover:bg-green-600/70 hover:text-white text-sm"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View Details</span>
                      </button>
                    </div>
                    
                    {sub.project_name && (
                      <p className="text-slate-200 mb-3 text-sm sm:text-base">
                        <span className="text-blue-200 font-medium">📁 Project:</span> {sub.project_name}
                      </p>
                    )}
                    <p className="text-slate-200 mb-4 text-sm sm:text-base">
                      <span className="text-yellow-200 font-medium">📝 Description:</span> 
                      <span className="text-truncate-2-lines block ml-2">
                        {sub.problem_description || 'No description'}
                      </span>
                    </p>
                    <p className="text-blue-200 mb-4 text-sm sm:text-base">⏱️ Hours spent: {sub.hours_spent}</p>
                    {sub.services_used && (
                      <p className="text-slate-200 mb-4 text-sm sm:text-base">
                        <span className="text-blue-200 font-medium">🛠️ Services:</span> 
                        <span className="text-truncate-2-lines block ml-2">
                          {sub.services_used}
                        </span>
                      </p>
                    )}
                    
                    {/* Submission Link Button */}
                    {sub.submission_link && (
                      <div className="mb-4">
                        <button
                          onClick={() => window.open(sub.submission_link, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-200 text-xs sm:text-sm bg-cyan-600/50 hover:bg-cyan-600/70 text-cyan-200 hover:text-white border border-cyan-500/30 hover:border-cyan-400/50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>Open Video</span>
                        </button>
                      </div>
                    )}
                    
                    {/* Rating Display */}
                    <div className="mb-4">
                      {/* Show rating based on user role */}
                      {user && user.role === 'superadmin' ? (
                        /* Superadmin sees all judge ratings */
                        judgeVotes[sub.id] ? (
                          <div className="space-y-2">
                            <h4 className="text-slate-300 text-xs sm:text-sm font-medium">Judge Ratings:</h4>
                            {judgeVotes[sub.id].map((vote, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-white/5 rounded-xl">
                                <span className="text-slate-200 text-xs">{vote.judgeName}</span>
                                <span className={`font-semibold text-xs sm:text-sm px-2 py-1 rounded-full ${getRatingColor(vote.rating)} bg-white/10`}>
                                  {vote.rating}/10
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs sm:text-sm">No ratings yet</div>
                        )
                      ) : (
                        /* Judge users see their own rating from fetched judge votes */
                        (() => {
                          const userVote = judgeVotes[sub.id]?.find(vote => vote.judge_id == user.id);
                          return userVote ? (
                            <div className="space-y-2">
                              <h4 className="text-slate-300 text-xs sm:text-sm font-medium">Your Rating:</h4>
                              <div className="flex justify-between items-center p-2 bg-white/5 rounded-xl">
                                <span className="text-slate-200 text-xs">You</span>
                                <span className={`font-semibold text-xs sm:text-sm px-2 py-1 rounded-full ${getRatingColor(userVote.rating)} bg-white/10`}>
                                  {userVote.rating}/10
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400 text-xs sm:text-sm">Not rated yet</div>
                          );
                        })()
                      )}
                    </div>
                    
                    {/* Voting Section - Only for Judges */}
                    {shouldShowVoting && (
                      <div className="mt-4 p-3 sm:p-4 bg-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-2xl">
                        {votingFor === sub.id ? (
                          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                            {/* Show current rating if it exists */}
                            {(() => {
                              const existingVote = judgeVotes[sub.id]?.find(vote => vote.judge_id == user.id);
                              return existingVote ? (
                                <div className="w-full text-center mb-2 p-2 bg-green-600/20 rounded-xl border border-green-500/30">
                                  <span className="text-green-200 text-xs sm:text-sm">Current Rating: </span>
                                  <span className="text-green-100 font-bold text-base sm:text-lg">{existingVote.rating}/10</span>
                                  {existingVote.remarks && (
                                    <div className="mt-2 text-left">
                                      <span className="text-green-200 text-xs block mb-1">Current Remarks:</span>
                                      <div className="text-green-100 text-xs sm:text-sm bg-green-600/30 rounded-lg p-2 border border-green-500/20">
                                        {existingVote.remarks}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null;
                            })()}
                            
                            <div className="w-full max-w-xs">
                              <label className="text-blue-200 font-medium text-xs sm:text-sm block text-center mb-3">New Rating: {selectedRating}/10</label>
                              <div className="relative">
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={selectedRating}
                                  onChange={(e) => setSelectedRating(parseInt(e.target.value))}
                                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                                  style={{
                                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((selectedRating - 1) / 9) * 100}%, rgba(255, 255, 255, 0.2) ${((selectedRating - 1) / 9) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                                  }}
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-2">
                                  <span>1</span>
                                  <span>5</span>
                                  <span>10</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Quick Rating Buttons */}
                            <div className="flex justify-center space-x-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                                <button
                                  key={rating}
                                  onClick={() => setSelectedRating(rating)}
                                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded text-xs font-medium transition-all duration-200 ${
                                    selectedRating === rating
                                      ? 'bg-blue-600 text-white border border-blue-500'
                                      : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20 hover:text-white'
                                  }`}
                                >
                                  {rating}
                                </button>
                              ))}
                            </div>
                            
                            {/* Remarks Field */}
                            <div className="w-full max-w-md">
                              <label htmlFor={`remarks-${sub.id}`} className="block text-blue-200 font-medium text-xs sm:text-sm mb-2 text-center">
                                Remarks (Optional)
                              </label>
                              <textarea
                                id={`remarks-${sub.id}`}
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add your comments or feedback about this submission..."
                                className="w-full px-3 py-2 bg-white/5 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm text-xs sm:text-sm resize-none"
                                rows="3"
                                maxLength="500"
                              />
                              <div className="text-right text-xs text-slate-400 mt-1">
                                {remarks.length}/500
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
                              <button
                                onClick={() => handleVote(sub.id)}
                                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold shadow-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 transform hover:scale-[1.02] text-xs sm:text-sm"
                              >
                                Submit Rating
                              </button>
                              <button
                                onClick={cancelVoting}
                                className="bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 px-3 sm:px-4 py-2 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70 text-xs sm:text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startVoting(sub.id)} 
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:from-blue-700 hover:to-blue-800 text-xs sm:text-sm"
                          >
                            {(() => {
                              const existingVote = judgeVotes[sub.id]?.find(vote => vote.judge_id == user.id);
                              return existingVote ? `🗳️ Update Rating (Current: ${existingVote.rating}/10)` : '🗳️ Rate This Submission';
                            })()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Submission Detail Modal */}
        {showDetailModal && selectedSubmission && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => {
              setShowDetailModal(false);
              setSelectedSubmission(null);
            }}
          >
            <div 
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Inside Modal */}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSubmission(null);
                }}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-full shadow-lg border border-gray-200 transition duration-200 hover:shadow-xl z-10"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Submission Details</h2>
              </div>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Team Member Info */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Team Member Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <span className="text-blue-600 font-medium text-sm sm:text-base">Name:</span>
                      <p className="text-gray-800 text-base sm:text-lg font-semibold">{selectedSubmission.team_member_name}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium text-sm sm:text-base">Hours Spent:</span>
                      <p className="text-gray-800 text-base sm:text-lg">{selectedSubmission.hours_spent}</p>
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                {selectedSubmission.project_name && (
                  <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Project Information
                    </h3>
                    <p className="text-gray-800 text-base sm:text-lg">{selectedSubmission.project_name}</p>
                  </div>
                )}

                {/* Problem Description */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Problem Description
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedSubmission.problem_description}</p>
                </div>

                {/* Services Used */}
                {selectedSubmission.services_used && (
                  <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Services Used
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedSubmission.services_used}</p>
                  </div>
                )}

                {/* Git Repository URL */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Git Repository
                  </h3>
                  {selectedSubmission.git_repo_url ? (
                    <a 
                      href={selectedSubmission.git_repo_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center space-x-2 text-orange-600 hover:text-orange-700 underline transition duration-200 text-sm sm:text-base break-all"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span>{selectedSubmission.git_repo_url}</span>
                    </a>
                  ) : (
                    <p className="text-gray-500 text-sm sm:text-base">No repository linked</p>
                  )}
                </div>

                {/* Submission Link */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Attachments
                  </h3>
                  <button
                    onClick={() => window.open(selectedSubmission.submission_link, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center justify-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white hover:shadow-cyan-500/40 hover:shadow-xl border-2 border-cyan-400/20 hover:border-cyan-300/40 text-sm sm:text-base"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Open Video</span>
                  </button>
                </div>

                {/* Rating Section */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {user && user.role === 'superadmin' ? 'Judge Ratings' : 'Your Rating'}
                  </h3>
                  
                  {/* Show ratings based on user role */}
                  {user && user.role === 'superadmin' ? (
                    /* Superadmin sees all judge ratings */
                    judgeVotes[selectedSubmission.id] ? (
                      <div className="space-y-3">
                        <h4 className="text-gray-700 font-medium text-sm">Individual Judge Ratings:</h4>
                        {judgeVotes[selectedSubmission.id].map((vote, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200">
                            <span className="text-gray-700 font-medium">{vote.judgeName}</span>
                            <span className={`font-semibold px-3 py-1 rounded-full ${getRatingColor(vote.rating)} bg-gray-100`}>
                              {vote.rating}/10
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-4">
                        <p className="text-lg">No ratings yet</p>
                        <p className="text-sm text-gray-400">Judges haven't rated this submission yet.</p>
                      </div>
                    )
                  ) : (
                    /* Judge users see their own rating from fetched judge votes */
                    (() => {
                      const userVote = judgeVotes[selectedSubmission.id]?.find(vote => vote.judge_id == user.id);
                      return userVote ? (
                        <div className="space-y-3">
                          <h4 className="text-gray-700 font-medium text-sm">Your Rating:</h4>
                          <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200">
                            <span className="text-gray-700 font-medium">You</span>
                            <span className={`font-semibold px-3 py-1 rounded-full ${getRatingColor(userVote.rating)} bg-gray-100`}>
                              {userVote.rating}/10
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500 text-center py-4">
                          <p className="text-lg">Not rated yet</p>
                          <p className="text-sm text-gray-400">You haven't rated this submission yet.</p>
                        </div>
                      );
                    })()
                  )}

                  {/* Rating Input Section - Only for Judges */}
                  {shouldShowVoting && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                      <h4 className="text-blue-800 font-medium text-sm mb-4 text-center">Rate This Submission</h4>
                      
                      {/* Show current rating if it exists */}
                      {(() => {
                        const existingVote = judgeVotes[selectedSubmission.id]?.find(vote => vote.judge_id == user.id);
                        return existingVote ? (
                          <div className="w-full text-center mb-4 p-3 bg-green-100 rounded-xl border border-green-200">
                            <span className="text-green-700 text-sm">Current Rating: </span>
                            <span className="text-green-800 font-bold text-lg">{existingVote.rating}/10</span>
                            {existingVote.remarks && (
                              <div className="mt-2 text-left">
                                <span className="text-green-700 text-sm block mb-1">Current Remarks:</span>
                                <div className="text-green-800 text-sm bg-green-200 rounded-lg p-2 border border-green-300">
                                  {existingVote.remarks}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Rating Slider */}
                      <div className="w-full max-w-xs mx-auto mb-4">
                        <label className="text-blue-800 font-medium text-sm block text-center mb-3">New Rating: {selectedRating}/10</label>
                        <div className="relative">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={selectedRating}
                            onChange={(e) => setSelectedRating(parseInt(e.target.value))}
                            className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((selectedRating - 1) / 9) * 100}%, #dbeafe ${((selectedRating - 1) / 9) * 100}%, #dbeafe 100%)`
                            }}
                          />
                          <div className="flex justify-between text-xs text-blue-600 mt-2">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Rating Buttons */}
                      <div className="flex justify-center space-x-1 mb-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setSelectedRating(rating)}
                            className={`w-8 h-8 rounded text-xs font-medium transition-all duration-200 ${
                              selectedRating === rating
                                ? 'bg-blue-600 text-white border border-blue-500'
                                : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      
                      {/* Remarks Field */}
                      <div className="w-full max-w-md mx-auto mb-4">
                        <label htmlFor={`modal-remarks-${selectedSubmission.id}`} className="block text-blue-800 font-medium text-sm mb-2 text-center">
                          Remarks (Optional)
                        </label>
                        <textarea
                          id={`modal-remarks-${selectedSubmission.id}`}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Add your comments or feedback about this submission..."
                          className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm resize-none"
                          rows="3"
                          maxLength="500"
                        />
                        <div className="text-right text-xs text-blue-600 mt-1">
                          {remarks.length}/500
                        </div>
                      </div>
                      
                      {/* Submit Button */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            handleVote(selectedSubmission.id);
                            // Close modal after successful submission
                            setTimeout(() => {
                              setShowDetailModal(false);
                              setSelectedSubmission(null);
                            }, 1500);
                          }}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
                        >
                          Submit Rating
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Overlay */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
              <div className="text-center">
                {/* Icon */}
                <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-red-600/20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                
                {/* Title */}
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Confirm Logout</h3>
                
                {/* Message */}
                <p className="text-slate-300 mb-4 sm:mb-6 text-sm sm:text-base">
                  Are you sure you want to logout, <span className="font-semibold text-white">{user?.name}</span>?
                  <br />
                  <span className="text-xs sm:text-sm text-slate-400">
                    ({user?.role === 'superadmin' ? 'Super Admin' : 'Judge'})
                  </span>
                </p>
                
                {/* Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={cancelLogout}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70 hover:border-slate-400/50 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 transform hover:scale-[1.02] text-sm sm:text-base"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </ProtectedRoute>
  </ErrorBoundary>
  );
}
