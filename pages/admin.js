import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { createSubmission, updateSubmission, deleteSubmission } from '../utils/authUtils';
import { useAuth } from '../utils/authContext';
import ProtectedRoute from '../utils/ProtectedRoute';
import Navigation from '../components/Navigation';
import { useRouter } from 'next/router';

export default function Admin() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Add error boundary and debugging
  const [error, setError] = useState(null);

  // Debug logging
  console.log('🔍 Admin component rendering');
  console.log('🔍 User:', user);
  console.log('🔍 Router:', router);

  const [submissions, setSubmissions] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [formData, setFormData] = useState({
    teamMemberName: '',
    submissionLink: '',
    problemDescription: '',
    hoursSpent: '',
    projectName: '',
    servicesUsed: '',
    gitRepoUrl: '',
    category: 'Via Hackathon'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [judgeVotes, setJudgeVotes] = useState({});
  const [votingRatings, setVotingRatings] = useState({});

  const isSuperAdmin = user?.role === 'superadmin';
  const isJudge = user?.role === 'judge';

  // Filter and sort submissions
  const filteredAndSortedSubmissions = submissions
    .filter(sub =>
      sub.team_member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.project_name && sub.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.git_repo_url && sub.git_repo_url.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'team_member_name':
          aValue = a.team_member_name.toLowerCase();
          bValue = b.team_member_name.toLowerCase();
          break;
        case 'hours_spent':
          aValue = a.hours_spent;
          bValue = b.hours_spent;
          break;
        case 'voteCount':
          aValue = a.voteCount;
          bValue = b.voteCount;
          break;
        case 'created_at':
        default:
          // Handle case where created_at might not exist
          if (a.created_at && b.created_at) {
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
          } else {
            // Fallback to id-based sorting
            aValue = a.id;
            bValue = b.id;
          }
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  useEffect(() => {
    try {
      console.log('🔍 Admin useEffect running');
      console.log('🔍 User:', user);
      console.log('🔍 IsSuperAdmin:', isSuperAdmin);

      // Redirect non-superadmin users away from admin page
      if (user && !isSuperAdmin && !isJudge) {
        console.log('🔍 Redirecting non-superadmin user to submissions');
        router.push('/submissions');
        return;
      }

      if (isSuperAdmin || isJudge) {
        console.log('🔍 Fetching submissions for superadmin/judge');
        fetchSubmissions();
      }
    } catch (err) {
      console.error('❌ Error in Admin useEffect:', err);
      setError(new Error(`Setup error: ${err.message}`));
    }
  }, [user, isSuperAdmin, isJudge, router]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching submissions...');

      // Check if Supabase is properly configured
      if (!supabase) {
        throw new Error('Database connection not configured. Please check your environment variables.');
      }

      // First, let's check what columns exist in the submissions table
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*');

      if (submissionsError) {
        console.error('❌ Error fetching submissions:', submissionsError);

        // Provide more helpful error messages
        if (submissionsError.message.includes('does not exist')) {
          setMessage('Database table not found. Please run the database setup script first.');
        } else if (submissionsError.message.includes('column') && submissionsError.message.includes('does not exist')) {
          setMessage('Database schema mismatch. Please run the database setup script to update the schema.');
        } else {
          setMessage(`Error fetching submissions: ${submissionsError.message}`);
        }
        return;
      }

      console.log('🔍 Submissions fetched:', submissionsData);

      // Sort by id if created_at doesn't exist, otherwise by created_at
      const sortedSubmissions = submissionsData.sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        // Fallback to id-based sorting
        return b.id - a.id;
      });

      // Fetch votes for each submission
      const submissionsWithVotes = await Promise.all(
        sortedSubmissions.map(async (submission) => {
          const { data: votesData, error: votesError } = await supabase
            .from('votes')
            .select('rating')
            .eq('submission_id', submission.id);

          if (votesError) {
            console.error('❌ Error fetching votes for submission:', submission.id, votesError);
            return { ...submission, voteCount: 0, averageRating: 0 };
          }

          const voteCount = votesData.length;
          const averageRating = voteCount > 0
            ? votesData.reduce((sum, vote) => sum + vote.rating, 0) / voteCount
            : 0;

          return { ...submission, voteCount, averageRating };
        })
      );

      setSubmissions(submissionsWithVotes);

      // If user is a judge, fetch their existing votes
      if (isJudge) {
        await fetchJudgeVotes();
      }

    } catch (error) {
      console.error('❌ Error in fetchSubmissions:', error);

      // Provide more helpful error messages
      if (error.message.includes('Database connection not configured')) {
        setMessage('Database connection not configured. Please check your environment variables.');
      } else if (error.message.includes('fetch')) {
        setMessage('Network error. Please check your internet connection and try again.');
      } else {
        setMessage(`Error fetching submissions: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJudgeVotes = async () => {
    try {
      const { data: votes, error } = await supabase
        .from('votes')
        .select('submission_id, rating')
        .eq('judge_id', user.id);

      if (error) {
        console.error('Error fetching judge votes:', error);
        return;
      }

      const votesBySubmission = {};
      votes.forEach(vote => {
        votesBySubmission[vote.submission_id] = vote.rating;
      });

      setJudgeVotes(votesBySubmission);
      setVotingRatings(votesBySubmission);
    } catch (error) {
      console.error('Error fetching judge votes:', error);
    }
  };

  const handleVote = async (submissionId, rating) => {
    try {
      if (!user || user.role !== 'judge') {
        setMessage('Only judges can vote on submissions.');
        return;
      }

      // Check if judge has already voted on this submission
      const existingVote = judgeVotes[submissionId];

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from('votes')
          .update({ rating })
          .eq('submission_id', submissionId)
          .eq('judge_id', user.id);

        if (error) {
          console.error('Error updating vote:', error);
          setMessage(`Error updating vote: ${error.message}`);
          return;
        }
      } else {
        // Create new vote
        const { error } = await supabase
          .from('votes')
          .insert({
            submission_id: submissionId,
            judge_id: user.id,
            rating
          });

        if (error) {
          console.error('Error creating vote:', error);
          setMessage(`Error creating vote: ${error.message}`);
          return;
        }
      }

      // Update local state
      setJudgeVotes(prev => ({ ...prev, [submissionId]: rating }));
      setVotingRatings(prev => ({ ...prev, [submissionId]: rating }));

      // Refresh submissions to update vote counts
      await fetchSubmissions();

      setMessage('Vote submitted successfully!');
    } catch (error) {
      console.error('Error submitting vote:', error);
      setMessage(`Error submitting vote: ${error.message}`);
    }
  };

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const result = await createSubmission(
        formData.teamMemberName,
        formData.submissionLink,
        formData.problemDescription,
        parseInt(formData.hoursSpent),
        formData.projectName,
        formData.servicesUsed,
        formData.gitRepoUrl,
        formData.category
      );

      if (result.success) {
        setMessage('Submission created successfully!');
        setFormData({
          teamMemberName: '',
          submissionLink: '',
          problemDescription: '',
          hoursSpent: '',
          projectName: '',
          servicesUsed: '',
          gitRepoUrl: '',
          category: 'Via Hackathon'
        });
        setShowCreateForm(false);
        fetchSubmissions(); // Refresh the list
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (submission) => {
    if (showEditForm && editingSubmission?.id === submission.id) {
      // If already editing this submission, just return
      return;
    }

    if (showEditForm) {
      // If editing a different submission, ask for confirmation
      if (!confirm('You are currently editing another submission. Do you want to switch to editing this one? Your current changes will be lost.')) {
        return;
      }
    }

    setEditingSubmission(submission);
    setFormData({
      teamMemberName: submission.team_member_name,
      submissionLink: submission.submission_link,
      problemDescription: submission.problem_description,
      hoursSpent: submission.hours_spent.toString(),
      projectName: submission.project_name || '',
      servicesUsed: submission.services_used || '',
      gitRepoUrl: submission.git_repo_url || '',
      category: submission.category || 'Via Hackathon'
    });
    setShowEditForm(true);
    setShowCreateForm(false);
    setMessage('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const result = await updateSubmission(editingSubmission.id, {
        teamMemberName: formData.teamMemberName,
        submissionLink: formData.submissionLink,
        problemDescription: formData.problemDescription,
        hoursSpent: parseInt(formData.hoursSpent),
        projectName: formData.projectName,
        servicesUsed: formData.servicesUsed,
        gitRepoUrl: formData.gitRepoUrl,
        category: formData.category
      });

      if (result.success) {
        setMessage('Submission updated successfully!');
        setFormData({
          teamMemberName: '',
          submissionLink: '',
          problemDescription: '',
          hoursSpent: '',
          projectName: '',
          servicesUsed: '',
          gitRepoUrl: '',
          category: 'Via Hackathon'
        });
        setShowEditForm(false);
        setEditingSubmission(null);
        fetchSubmissions(); // Refresh the list
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (submissionId, submissionName) => {
    const confirmMessage = `Are you sure you want to delete the submission "${submissionName}"?

This action will:
• Permanently remove the submission
• Delete all associated votes and ratings
• Cannot be undone

Type "DELETE" to confirm:`;

    const userInput = prompt(confirmMessage);

    if (userInput !== 'DELETE') {
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const result = await deleteSubmission(submissionId);

      if (result.success) {
        setMessage(`Submission "${submissionName}" deleted successfully!`);
        fetchSubmissions(); // Refresh the list
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setShowEditForm(false);
    setEditingSubmission(null);
    setFormData({
      teamMemberName: '',
      submissionLink: '',
      problemDescription: '',
      hoursSpent: '',
      projectName: '',
      servicesUsed: '',
      gitRepoUrl: '',
      category: 'Via Hackathon'
    });
    setMessage('');
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

  // Add error handling
  if (error) {
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
                <h2 className="text-2xl font-bold text-white mb-4">Error Loading Admin Dashboard</h2>
                <p className="text-slate-300 mb-6">{error.message}</p>
                <button
                  onClick={() => setError(null)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // If not superadmin, show access denied
  if (!isSuperAdmin && !isJudge) {
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
                <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
                <p className="text-slate-300 mb-6">Only Super Admins and Judges can access the Admin Dashboard.</p>
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
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-lg ${isSuperAdmin
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700'
                  }`}>
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {isSuperAdmin ? 'Admin Dashboard' : 'Judge Dashboard'}
                  </h1>
                  <p className="text-purple-200 text-sm">
                    {isSuperAdmin ? 'System Management Platform' : 'Review and Rate Submissions'}
                  </p>
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

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-2xl ${message.includes('Error') ? 'bg-red-600/10 backdrop-blur-sm border border-red-500/30' : 'bg-green-600/10 backdrop-blur-sm border border-green-500/30'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {message.includes('Error') ? (
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <p className={`font-medium ${message.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>{message}</p>
                </div>
                <button
                  onClick={() => setMessage('')}
                  className={`p-1 rounded-full ${message.includes('Error') ? 'text-red-400 hover:bg-red-600/20' : 'text-green-400 hover:bg-green-600/20'}`}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}



          {/* Superadmin Controls */}
          {isSuperAdmin && (
            <div className="mb-8 p-6 bg-blue-600/10 backdrop-blur-xl border border-blue-500/30 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-blue-200">Submission Management</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={fetchSubmissions}
                    disabled={isLoading}
                    className="px-4 py-3 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {showCreateForm ? 'Cancel' : 'Create New Submission'}
                  </button>
                </div>
              </div>

              {showCreateForm && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none"
                      >
                        <option value="Via Cursor Project" className="bg-slate-800">Via Cursor Project</option>
                        <option value="Via Hackathon" className="bg-slate-800">Via Hackathon</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">
                        Team Member Name
                      </label>
                      <input
                        type="text"
                        name="teamMemberName"
                        value={formData.teamMemberName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter team member name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-2">
                        Submission Link
                      </label>
                      <input
                        type="url"
                        name="submissionLink"
                        value={formData.submissionLink}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="https://example.com/project"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Problem Description
                    </label>
                    <textarea
                      name="problemDescription"
                      value={formData.problemDescription}
                      onChange={handleInputChange}
                      required
                      rows="3"
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Describe the problem or project"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Hours Spent
                    </label>
                    <input
                      type="number"
                      name="hoursSpent"
                      value={formData.hoursSpent}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter hours spent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Services Used
                    </label>
                    <textarea
                      name="servicesUsed"
                      value={formData.servicesUsed}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="List services used (e.g., React, Node.js, PostgreSQL)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-200 mb-2">
                      Git Repository URL
                    </label>
                    <input
                      type="url"
                      name="gitRepoUrl"
                      value={formData.gitRepoUrl}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-blue-400/50 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://github.com/username/repository"
                    />
                  </div>



                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-6 py-3 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold shadow-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Submission'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Judge Dashboard View */}
          {isJudge && (
            <div className="mb-8">
              {/* Judge Header */}
              <div className="mb-6 p-6 bg-purple-600/10 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-purple-200">Judge Dashboard</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={fetchSubmissions}
                      disabled={isLoading}
                      className="px-4 py-3 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-purple-200 text-sm">Review and rate submissions. You can update your ratings at any time.</p>
              </div>

              {/* Search and Filter for Judges */}
              <div className="mb-6 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by team member, project name, or Git repo URL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="created_at" className="bg-slate-800 text-white">Date Created</option>
                      <option value="team_member_name" className="bg-slate-800 text-white">Team Member</option>
                      <option value="hours_spent" className="bg-slate-800 text-white">Hours Spent</option>
                      <option value="voteCount" className="bg-slate-800 text-white">Vote Count</option>
                    </select>

                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200"
                    >
                      {sortOrder === 'asc' ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submission Tiles for Judges */}
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-purple-200">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading submissions...
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedSubmissions.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400">
                      {searchTerm ? 'No submissions found matching your search.' : 'No submissions available.'}
                    </div>
                  ) : (
                    filteredAndSortedSubmissions.map((sub) => (
                      <div key={sub.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 hover:bg-white/10 transition-all duration-200">
                        {/* Submission Info */}
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-white mb-2">{sub.team_member_name}</h3>
                          <p className="text-sm text-slate-300 mb-2">
                            <span className="text-blue-200 font-medium">Project:</span> {sub.project_name || 'N/A'}
                          </p>
                          <p className="text-sm text-slate-300 mb-2">
                            <span className="text-green-200 font-medium">Hours:</span> {sub.hours_spent}
                          </p>
                          <p className="text-sm text-slate-300 mb-2">
                            <span className="text-purple-200 font-medium">Rating:</span> {sub.averageRating ? sub.averageRating.toFixed(1) : 'No ratings'}
                          </p>
                          <p className="text-sm text-slate-300 mb-2">
                            <span className="text-yellow-200 font-medium">Description:</span>
                            <span className="text-truncate-2-lines block">
                              {sub.problem_description || 'No description'}
                            </span>
                          </p>
                          <p className="text-sm text-slate-300 mb-4">
                            <span className="text-cyan-200 font-medium">Services:</span>
                            <span className="text-truncate-2-lines block">
                              {sub.services_used || 'No services listed'}
                            </span>
                          </p>
                          <p className="text-sm text-slate-300 mb-4">
                            <span className="text-orange-200 font-medium">Git Repo:</span>
                            {sub.git_repo_url ? (
                              <a
                                href={sub.git_repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-300 hover:text-orange-100 underline block truncate"
                              >
                                {sub.git_repo_url}
                              </a>
                            ) : (
                              <span className="text-slate-400 block">No repository linked</span>
                            )}
                          </p>
                        </div>

                        {/* View Button */}
                        <div className="mb-4">
                          <button
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setShowDetailModal(true);
                            }}
                            className="w-full px-4 py-2 bg-blue-600/50 backdrop-blur-sm border border-blue-500/30 text-blue-200 rounded-xl font-medium transition duration-200 hover:bg-blue-600/70 hover:text-white"
                          >
                            View Details
                          </button>
                        </div>

                        {/* Voting Section */}
                        <div className="border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold text-white mb-3">Your Vote</h4>
                          <div className="space-y-3">
                            {/* Rating Slider */}
                            <div className="relative">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={votingRatings[sub.id] || 5}
                                onChange={(e) => handleVote(sub.id, parseInt(e.target.value))}
                                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                  background: `linear-gradient(to right, #9333ea 0%, #9333ea ${((votingRatings[sub.id] || 5) - 1) * 11.11}%, rgba(255, 255, 255, 0.2) ${((votingRatings[sub.id] || 5) - 1) * 11.11}%, rgba(255, 255, 255, 0.2) 100%)`
                                }}
                              />
                              <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>1</span>
                                <span>5</span>
                                <span>10</span>
                              </div>
                            </div>

                            {/* Current Rating Display */}
                            <div className="flex items-center justify-center">
                              <span className="text-2xl font-bold text-purple-400">
                                {votingRatings[sub.id] || 5}
                              </span>
                              <span className="text-sm text-slate-400 ml-1">/10</span>
                            </div>

                            {/* Quick Rating Buttons */}
                            <div className="flex justify-center space-x-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                                <button
                                  key={rating}
                                  onClick={() => handleVote(sub.id, rating)}
                                  className={`w-6 h-6 rounded text-xs font-medium transition-all duration-200 ${votingRatings[sub.id] === rating
                                    ? 'bg-purple-600 text-white border border-purple-500'
                                    : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20 hover:text-white'
                                    }`}
                                >
                                  {rating}
                                </button>
                              ))}
                            </div>
                          </div>
                          {judgeVotes[sub.id] && (
                            <p className="text-xs text-purple-200 mt-2 text-center">
                              You rated this: {judgeVotes[sub.id]}/10
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit Submission Form - Superadmin Only */}
          {isSuperAdmin && showEditForm && (
            <div className="mb-8 p-6 bg-green-600/10 backdrop-blur-xl border border-green-500/30 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-green-200">Edit Submission</h2>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70"
                >
                  Cancel Edit
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-200 mb-2">
                      Team Member Name
                    </label>
                    <input
                      type="text"
                      name="teamMemberName"
                      value={formData.teamMemberName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter team member name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-200 mb-2">
                      Submission Link
                    </label>
                    <input
                      type="url"
                      name="submissionLink"
                      value={formData.submissionLink}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://example.com/project"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-200 mb-2">
                    Problem Description
                  </label>
                  <textarea
                    name="problemDescription"
                    value={formData.problemDescription}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="Describe the problem or project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-200 mb-2">
                    Hours Spent
                  </label>
                  <input
                    type="number"
                    name="hoursSpent"
                    value={formData.hoursSpent}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter hours spent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-200 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-200 mb-2">
                    Services Used
                  </label>
                  <textarea
                    name="servicesUsed"
                    value={formData.servicesUsed}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="List services used (e.g., React, Node.js, PostgreSQL)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-200 mb-2">
                    Git Repository URL
                  </label>
                  <input
                    type="url"
                    name="gitRepoUrl"
                    value={formData.gitRepoUrl}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-green-400/50 rounded-xl text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="https://github.com/username/repository"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-3 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold shadow-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Submission'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Statistics Section - Superadmin Only */}
          {isSuperAdmin && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-blue-600/10 backdrop-blur-xl border border-blue-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-200">Total Submissions</p>
                    <p className="text-2xl font-bold text-white">{submissions.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-green-600/10 backdrop-blur-xl border border-green-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-green-600/20 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-200">Total Votes</p>
                    <p className="text-2xl font-bold text-white">
                      {submissions.reduce((total, sub) => total + sub.voteCount, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-purple-600/10 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-purple-600/20 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-200">Avg Rating</p>
                    <p className="text-2xl font-bold text-white">
                      {submissions.length > 0
                        ? (submissions.reduce((total, sub) => total + (sub.averageRating || 0), 0) / submissions.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Section - Judge Only */}
          {isJudge && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-purple-600/10 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-purple-600/20 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-200">Total Submissions</p>
                    <p className="text-2xl font-bold text-white">{submissions.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-green-600/10 backdrop-blur-xl border border-green-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-green-600/20 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-200">Your Votes</p>
                    <p className="text-2xl font-bold text-white">
                      {Object.keys(judgeVotes).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-600/10 backdrop-blur-xl border border-blue-500/30 rounded-3xl shadow-2xl">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mr-4">
                    <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-200">Avg Rating</p>
                    <p className="text-2xl font-bold text-white">
                      {submissions.length > 0
                        ? (submissions.reduce((total, sub) => total + (sub.averageRating || 0), 0) / submissions.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Controls - Superadmin Only */}
          {isSuperAdmin && (
            <div className="mb-6 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by team member, project name, or Git repo URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="created_at" className="bg-slate-800 text-white">Date Created</option>
                    <option value="team_member_name" className="bg-slate-800 text-white">Team Member</option>
                    <option value="hours_spent" className="bg-slate-800 text-white">Hours Spent</option>
                    <option value="voteCount" className="bg-slate-800 text-white">Vote Count</option>
                  </select>

                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all duration-200"
                  >
                    {sortOrder === 'asc' ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submissions Table - Superadmin Only */}
          {isSuperAdmin && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
              <div className="px-6 py-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">All Submissions</h2>
                  <div className="text-sm text-slate-300">
                    {searchTerm ? (
                      <span>
                        Showing {filteredAndSortedSubmissions.length} of {submissions.length} submissions
                      </span>
                    ) : (
                      <span>
                        {submissions.length} submission{submissions.length !== 1 ? 's' : ''} total
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-blue-200">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading submissions...
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Team Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Project Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Votes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Hours Spent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Submission Link</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/5 divide-y divide-white/10">
                    {filteredAndSortedSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                          {searchTerm ? 'No submissions found matching your search.' : 'No submissions available.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-white/10 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {sub.team_member_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-200 max-w-xs truncate" title={sub.project_name || 'N/A'}>
                            {sub.project_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                            {sub.voteCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                            {sub.hours_spent}
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-200 max-w-xs truncate" title={sub.submission_link}>
                            <a
                              href={sub.submission_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:text-blue-100 underline"
                            >
                              {sub.submission_link}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedSubmission(sub);
                                  setShowDetailModal(true);
                                }}
                                className="px-3 py-1 bg-green-600/50 backdrop-blur-sm border border-green-500/30 text-green-200 rounded-lg font-medium transition duration-200 hover:bg-green-600/70 hover:text-white cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleEdit(sub)}
                                className="px-3 py-1 bg-blue-600/50 backdrop-blur-sm border border-blue-500/30 text-blue-200 rounded-lg font-medium transition duration-200 hover:bg-blue-600/70 hover:text-white"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(sub.id, sub.team_member_name)}
                                className="px-3 py-1 bg-red-600/50 backdrop-blur-sm border border-red-500/30 text-red-200 rounded-lg font-medium transition duration-200 hover:bg-red-600/70 hover:text-white"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}


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

        {/* Submission Detail Modal */}
        {showDetailModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Submission Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-600/50 backdrop-blur-sm border border-slate-500/30 text-slate-200 rounded-xl font-semibold transition duration-200 hover:bg-slate-600/70"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-blue-200">Team Member:</p>
                  <p className="text-lg font-bold text-white">{selectedSubmission.team_member_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-200">Project Name:</p>
                  <p className="text-lg font-bold text-white">{selectedSubmission.project_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-200">Votes:</p>
                  <p className="text-lg font-bold text-white">{selectedSubmission.voteCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-200">Hours Spent:</p>
                  <p className="text-lg font-bold text-white">{selectedSubmission.hours_spent}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-blue-200">Problem Description:</p>
                  <p className="text-lg text-slate-200">{selectedSubmission.problem_description}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-blue-200">Services Used:</p>
                  <p className="text-lg text-slate-200">{selectedSubmission.services_used || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-200">Git Repository URL:</p>
                  {selectedSubmission.git_repo_url ? (
                    <a
                      href={selectedSubmission.git_repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 hover:text-blue-100 underline"
                    >
                      {selectedSubmission.git_repo_url}
                    </a>
                  ) : (
                    <p className="text-lg text-slate-400">N/A</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-200">Submission Link:</p>
                  <a
                    href={selectedSubmission.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-100 underline"
                  >
                    {selectedSubmission.submission_link}
                  </a>
                  <div className="mt-2">
                    <a
                      href={selectedSubmission.submission_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600/50 backdrop-blur-sm border border-blue-500/30 text-blue-200 rounded-lg font-medium transition duration-200 hover:bg-blue-600/70 hover:text-white"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open Submission
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
