import { createContext, useContext, useEffect, useState } from 'react';
import { getUserById, getUserByEmail } from './authUtils';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session from localStorage
    const getSession = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('🔍 Session restoration - Stored user data:', userData);
          
          // Verify user still exists in database
          let currentUser = await getUserById(userData.id);
          console.log('🔍 Session restoration - Database user data by ID:', currentUser);
          
          // If ID lookup fails, try email lookup as fallback
          if (!currentUser && userData.email) {
            console.log('🔍 ID lookup failed, trying email lookup...');
            currentUser = await getUserByEmail(userData.email);
            console.log('🔍 Session restoration - Database user data by email:', currentUser);
          }
          
          if (currentUser) {
            // Check if roles match
            if (currentUser.role !== userData.role) {
              console.warn('⚠️ Role mismatch detected!');
              console.warn('Stored role:', userData.role);
              console.warn('Database role:', currentUser.role);
              console.warn('Using database role (more authoritative)');
              
              // Update localStorage with the correct role from database
              const updatedUserData = { ...userData, role: currentUser.role };
              localStorage.setItem('user', JSON.stringify(updatedUserData));
              console.log('🔍 Updated localStorage with correct role');
            }
            
            // Ensure role is properly set
            if (!currentUser.role) {
              console.error('❌ User has no role assigned:', currentUser);
              // Set default role if none exists
              currentUser.role = 'judge';
              console.log('🔍 Set default role to judge');
            }
            
            // Validate role value
            if (!['judge', 'superadmin'].includes(currentUser.role)) {
              console.error('❌ Invalid role value:', currentUser.role);
              console.error('❌ User data:', currentUser);
              // Set default role if invalid
              currentUser.role = 'judge';
              console.log('🔍 Set default role to judge due to invalid role');
            }
            
            console.log('🔍 Final user data being set:', currentUser);
            console.log('🔍 Final user role:', currentUser.role);
            console.log('🔍 Final user role type:', typeof currentUser.role);
            console.log('🔍 Final user role === "superadmin":', currentUser.role === 'superadmin');
            console.log('🔍 Final user role === "judge":', currentUser.role === 'judge');
            setUser(currentUser);
          } else {
            // User no longer exists, clear session
            console.log('❌ User no longer exists in database, clearing session');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  const signIn = async (userData) => {
    try {
      console.log('🔍 signIn called with userData:', userData);
      console.log('🔍 User role being stored:', userData.role);
      
      // Validate user data
      if (!userData || !userData.id || !userData.email || !userData.name) {
        console.error('❌ Invalid user data provided:', userData);
        return { success: false, error: 'Invalid user data' };
      }
      
      // Ensure role is set
      if (!userData.role) {
        console.warn('⚠️ No role provided, setting default role to judge');
        userData.role = 'judge';
      }
      
      // Validate role
      if (!['judge', 'superadmin'].includes(userData.role)) {
        console.error('❌ Invalid role provided:', userData.role);
        return { success: false, error: 'Invalid user role' };
      }
      
      console.log('🔍 Validated user data:', userData);
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('🔍 User data stored in localStorage');
      
      setUser(userData);
      console.log('🔍 User state updated');
      console.log('🔍 Final user state:', userData);
      console.log('🔍 Final user role in state:', userData.role);
      
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Failed to sign in' };
    }
  };

  const signOut = async () => {
    try {
      // Clear user data from localStorage
      localStorage.removeItem('user');
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: 'Failed to sign out' };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
