
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
  last_seen: string | null;
  custom_sets: any[]; 
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  getAllowedLanguages: () => TargetLanguage[];
  getMaxSymbolSets: () => number;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [subscription, setSubscription] = useState<SubscriptionTier>('free');
  const [last_seen, setLastSeen] = useState<string | null>(null);
  const [custom_sets, setCustomSets] = useState<any[]>([]);

  const fetchUserData = async (userId: string, userEmail?: string) => {
    try {
      // 1. جلب بيانات الرصيد والاشتراك من جدول users
      // @fix: Select 'last_seen' from the users table and update the state.
      const { data: userData } = await supabase
        .from('users')
        .select('balance, subscription, last_seen')
        .eq('id', userId)
        .maybeSingle();
      
      // 2. جلب مجموعات الرموز من الجدول الجديد custom_symbol_sets
      const { data: setsData } = await supabase
        .from('custom_symbol_sets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (userData) {
        setBalance(userData.balance || 0);
        setLastSeen(userData.last_seen || null);
        const sub = (userData.subscription || 'free').toLowerCase();
        if (['pro', 'pro-max', 'master'].includes(sub)) {
           setSubscription(sub as SubscriptionTier);
        } else {
           setSubscription('free');
        }
      } else {
        // إذا كان مستخدم جديد، نقوم بإنشاء سجل له في جدول users
        const initialBalance = 10;
        await supabase
          .from('users')
          .insert([{ id: userId, email: userEmail, balance: initialBalance, subscription: 'free' }]);
        
        setBalance(initialBalance);
        setSubscription('free');
        setLastSeen(null);
      }

      if (setsData) {
        setCustomSets(setsData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id, user.email);
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
        setLastSeen(null);
        setCustomSets([]);
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         clearHash();
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const signInWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBalance(0);
    setSubscription('free');
    setLastSeen(null);
    setCustomSets([]);
  };

  const updateBalance = (newBalance: number) => {
    setBalance(newBalance);
  };

  const getAllowedLanguages = (): TargetLanguage[] => {
    if (subscription === 'free') return ['Arabic'];
    return ['Arabic', 'English', 'French', 'German'];
  };

  const getMaxSymbolSets = (): number => {
    switch (subscription) {
      case 'master': return 3;
      case 'pro-max': return 2;
      case 'pro': return 1;
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
      last_seen,
      custom_sets,
      signInWithGoogle, 
      signInWithDiscord, 
      signOut, 
      updateBalance,
      getAllowedLanguages,
      getMaxSymbolSets,
      refreshUserData
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
