import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthMode } from '../types';
import { CURRENT_USER } from '../mockData';
import { authService, isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  pulseCoins: number;
  authModalOpen: boolean;
  authMode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signupWithPassword: (email: string, pass: string, name: string, username: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deductCoins: (amount: number) => boolean;
  addCoins: (amount: number) => void;
  updateUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pulse_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return CURRENT_USER;
      }
    }
    return CURRENT_USER;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [pulseCoins, setPulseCoins] = useState<number>(() => {
    const saved = localStorage.getItem('pulse_coins');
    return saved ? parseInt(saved, 10) : 2450;
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  useEffect(() => {
    if (user) {
      localStorage.setItem('pulse_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pulse_current_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('pulse_coins', pulseCoins.toString());
  }, [pulseCoins]);

  // Check Supabase session if configured
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pulse Creator',
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0].toLowerCase() || 'pulsar',
              avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
              verified: true,
              bio: 'Pulse Creator on Supabase ⚡',
              followersCount: 120,
              followingCount: 45,
              likesCount: 1400,
            });
          }
        })
        .catch((err) => {
          console.warn('Supabase getSession notice:', err);
        });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pulse Creator',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0].toLowerCase() || 'pulsar',
            avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
            verified: true,
            bio: 'Pulse Creator on Supabase ⚡',
            followersCount: 120,
            followingCount: 45,
            likesCount: 1400,
          });
        } else if (_event === 'SIGNED_OUT') {
          // Keep demo state or null
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const openAuthModal = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const loginWithPassword = async (email: string, pass: string) => {
    setIsLoading(true);
    const res = await authService.signInWithPassword(email, pass);
    setIsLoading(false);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.user) {
      setUser({
        id: res.user.id,
        name: res.user.name,
        username: res.user.username,
        avatar: res.user.avatar,
        verified: true,
        bio: 'Pulse Creator | Exploring beats & reels ✨',
        followersCount: 14200,
        followingCount: 380,
        likesCount: 89000,
      });
      closeAuthModal();
      return { success: true };
    }
    return { success: false, error: 'Unknown login error' };
  };

  const signupWithPassword = async (email: string, pass: string, name: string, username: string) => {
    setIsLoading(true);
    const res = await authService.signUpWithPassword(email, pass, name, username);
    setIsLoading(false);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (res.user) {
      setUser({
        id: res.user.id,
        name: res.user.name,
        username: res.user.username,
        avatar: res.user.avatar,
        verified: false,
        bio: 'Just joined Pulse! 🚀 Excited for reels and live streams',
        followersCount: 0,
        followingCount: 12,
        likesCount: 0,
      });
      closeAuthModal();
      return { success: true };
    }
    return { success: false, error: 'Unknown signup error' };
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    const res = await authService.signInWithGoogle();
    setIsLoading(false);
    if (res.error) {
      return { success: false, error: res.error };
    }
    if (!isSupabaseConfigured) {
      // Demo simulated Google Auth
      setUser({
        id: 'usr_google_demo',
        name: 'Google Pulse User',
        username: 'google_pulsar',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
        verified: true,
        bio: 'Signed in via Google OAuth on Pulse ⚡',
        followersCount: 3400,
        followingCount: 120,
        likesCount: 45000,
      });
      closeAuthModal();
      return { success: true };
    }
    return { success: true };
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
  };

  const deductCoins = (amount: number): boolean => {
    if (pulseCoins >= amount) {
      setPulseCoins((prev) => prev - amount);
      return true;
    }
    return false;
  };

  const addCoins = (amount: number) => {
    setPulseCoins((prev) => prev + amount);
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseConfigured,
        pulseCoins,
        authModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        loginWithPassword,
        signupWithPassword,
        loginWithGoogle,
        logout,
        deductCoins,
        addCoins,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
