
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { SubscriptionTier, TargetLanguage } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  balance: number;
  subscription: SubscriptionTier;
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  getAllowedLanguages: () => TargetLanguage[];
  getMaxSymbolSets: () => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [subscription, setSubscription] = useState<SubscriptionTier>('free');

  const fetchUserData = async (userId: string, userEmail?: string) => {
    try {
      // Try to get existing user
      const { data, error } = await supabase
        .from('users')
        .select('balance, subscription')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setBalance(data.balance || 0);
        // Normalize subscription string to SubscriptionTier
        const sub = (data.subscription || 'free').toLowerCase();
        if (['pro', 'pro-max', 'master'].includes(sub)) {
           setSubscription(sub as SubscriptionTier);
        } else {
           setSubscription('free');
        }
      } else {
        // User does not exist in 'users' table (First time login)
        const initialBalance = 10;
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            { 
              id: userId, 
              email: userEmail, 
              balance: initialBalance,
              subscription: 'free'
            }
          ]);
        
        if (!insertError) {
          setBalance(initialBalance);
          setSubscription('free');
        } else {
           console.error('Error initializing new user:', insertError);
           setBalance(0);
           setSubscription('free');
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    const clearHash = () => {
      if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setSession(session);
          setUser(session.user);
          clearHash();
          if (session.user) {
            fetchUserData(session.user.id, session.user.email);
          }
        } else {
          setSession(null);
          setUser(null);
          setBalance(0);
          setSubscription('free');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email);
      } else {
        setBalance(0);
        setSubscription('free');
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         clearHash();
      }

      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const signInWithDiscord = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Discord:", error);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setBalance(0);
      setSubscription('free');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateBalance = (newBalance: number) => {
    setBalance(newBalance);
  };

  const getAllowedLanguages = (): TargetLanguage[] => {
    if (subscription === 'free') {
      return ['Arabic'];
    }
    return ['Arabic', 'English', 'French', 'German'];
  };

  const getMaxSymbolSets = (): number => {
    switch (subscription) {
      case 'master': return 3;
      case 'pro-max': return 2;
      case 'pro': return 1;
      case 'free': 
      default: return 0;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      balance, 
      subscription,
      signInWithGoogle, 
      signInWithDiscord, 
      signOut, 
      updateBalance,
      getAllowedLanguages,
      getMaxSymbolSets
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
