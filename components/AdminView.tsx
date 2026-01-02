
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { Search, Calendar, Clock, CreditCard, Coins, User, Loader2, Shield, Lock, History, Hourglass, PlusCircle, MinusCircle, Crown, Trash2, X, Check, Activity, TrendingUp, RotateCcw, MessageSquare, Save, Receipt, Banknote, CheckCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';

interface UserData {
  id: string;
  email: string;
  subscription: string | null;
  balance: number;
  spent_coins: number | null;
  created_at: string;
  last_seen: string | null;
  subscription_expires_at: string | null;
  subscription_start_at?: string | null;
}

interface SystemStats {
  id: number;
  daily_usage: number;
  monthly_usage: number;
  yearly_usage: number;
  discord: string;
}

interface PaymentRequest {
  id: number;
  user_email: string;
  plan_name: string;
  payment_method: string;
  receipt_url: string;
  price: string;
  created_at: string;
  status: string;
}

// تعريف الـ Interface للمكون الفرعي
interface UserListCardProps {
  title: string;
  users: UserData[];
  colorClass: string;
  iconColorClass: string;
  allowBulkAdd?: boolean;
  onBulkAddClick?: () => void;
  isProcessingPoints?: boolean;
}

type ActionModalType = 'addPoints' | 'deductPoints' | 'addSub' | null;

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [profiles, setProfiles] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingPoints, setIsProcessingPoints] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Stats States
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [isUpdatingDiscord, setIsUpdatingDiscord] = useState(false);

  // Payment Requests States
  const [pendingPayments, setPendingPayments] = useState<PaymentRequest[]>([]);
  const [passedPaymentsCount, setPassedPaymentsCount] = useState<number>(0);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null);

  // States for Action Modals
  const [actionModal, setActionModal] = useState<ActionModalType>(null);
  const [actionValue, setActionValue] = useState<string>('');
  const [actionPlan, setActionPlan] = useState<string>('pro');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setRoleLoading(false);
      }
    };
    fetchRole();
  }, [user]);

  // التحقق من صلاحية الادمن مع التأكد من وجود مستخدم
  const isAdmin = user && (userRole === 'admin' || user.email === 'admin@example.com');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSystemStats();
      fetchPaymentsData();
    } else if (!roleLoading) {
      setLoading(false);
    }
  }, [isAdmin, roleLoading]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProfiles(data as UserData[]);
        if (selectedUser) {
          const updated = data.find((u: UserData) => u.id === selectedUser.id);
          if (updated) setSelectedUser(updated);
        }
      } else {
        console.error('Error fetching users:', error?.message);
        try {
           const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_users');
           if (!rpcError && rpcData) {
             setProfiles(rpcData);
           } else {
             setProfiles([]);
           }
        } catch (e) {
           setProfiles([]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const { data, error } = await supabase
        .from('system_stats')
        .select('*')
        .maybeSingle();

      if (data) {
        setSystemStats(data as SystemStats);
        setDiscordInput(data.discord || '');
      } else if (error) {
        console.error('Error fetching system stats:', error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPaymentsData = async () => {
    try {
      // Fetch Pending Payments
      const { data: pending, error: pendingError } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pending) {
        setPendingPayments(pending);
      }

      // Fetch Passed Payments Count
      const { count, error: countError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pass');
      
      if (count !== null) {
        setPassedPaymentsCount(count);
      }
    } catch (e) {
      console.error('Error fetching payments:', e);
    }
  };

  const handleApprovePayment = async (id: number) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من تغيير الحالة إلى "تم"؟' : 'Are you sure you want to approve this?')) return;
    
    setProcessingPaymentId(id);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'pass' })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setPendingPayments(prev => prev.filter(p => p.id !== id));
      setPassedPaymentsCount(prev => prev + 1);
      
      // Close modal if no more pending
      if (pendingPayments.length <= 1) {
        setShowPaymentsModal(false);
      }
      
    } catch (e) {
      console.error("Failed to approve payment", e);
      alert(t('adminError'));
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleResetDailyUsage = async () => {
    if (!systemStats || !confirm(t('adminConfirm'))) return;
    try {
      const { error } = await supabase
        .from('system_stats')
        .update({ daily_usage: 0 })
        .eq('id', systemStats.id);
      
      if (error) throw error;
      
      setSystemStats({ ...systemStats, daily_usage: 0 });
      alert(t('resetSuccess'));
    } catch (e) {
      console.error("Failed to reset daily usage", e);
      alert(t('adminError'));
    }
  };

  const handleUpdateDiscord = async () => {
    if (!systemStats || !discordInput) return;
    setIsUpdatingDiscord(true);
    try {
      const { error } = await supabase
        .from('system_stats')
        .update({ discord: discordInput })
        .eq('id', systemStats.id);
      
      if (error) throw error;
      alert(t('linkUpdated'));
    } catch (e) {
      console.error("Failed to update discord", e);
      alert(t('adminError'));
    } finally {
      setIsUpdatingDiscord(false);
    }
  };

  const handleBulkAddPointsForFreeUsers = async () => {
    const amountStr = window.prompt(t('enterPointsAmount'));
    if (!amountStr) return;

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    const targetUsers = profiles.filter(p => 
      !p.subscription || p.subscription.trim() === '' || p.subscription.toLowerCase() === 'free'
    );

    if (targetUsers.length === 0) {
      alert(t('noFreeUsers') || "No free users found");
      return;
    }

    setIsProcessingPoints(true);
    let successCount = 0;

    try {
      const results = await Promise.allSettled(
        targetUsers.map(async (u) => {
         const { data: rpcData, error: rpcError } = await supabase.rpc('admin_add_points', {
           target_user_id: u.id,
           points_to_add: amount
         });
          if (rpcError) throw rpcError;
          if (!rpcError) return true;

          const { data, error } = await supabase
            .from('users')
            .update({ balance: (u.balance || 0) + amount })
            .eq('id', u.id)
            .select();
            
          if (error) throw error;
          if (!data || data.length === 0) throw new Error("RLS blocked update");
          return true;
        })
      );

      successCount = results.filter(r => r.status === 'fulfilled').length;
      await fetchUsers(); 
      
      if (successCount === 0) {
        alert("Failed to add points.");
      } else {
        alert(`${t('pointsAddedSuccess')} (${successCount}/${targetUsers.length})`);
      }
    } catch (err) {
      console.error('Bulk add failed:', err);
      alert('An unexpected error occurred.');
    } finally {
      setIsProcessingPoints(false);
    }
  };

  // --- Handlers for Individual Actions ---
  const handleUpdatePoints = async (isAddition: boolean) => {
    if (!selectedUser) return;
    const amount = parseInt(actionValue);
    if (isNaN(amount) || amount <= 0) return;

    setActionLoading(true);
    try {
       const pointsChange = isAddition ? amount : -amount;
       const { error: rpcError } = await supabase.rpc('admin_add_points', {
           target_user_id: selectedUser.id,
           points_to_add: pointsChange
       });

       if (rpcError) {
          const newBalance = Math.max(0, (selectedUser.balance || 0) + pointsChange);
          const { error: directError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', selectedUser.id);
          if (directError) throw directError;
       }

       await fetchUsers();
       closeModal();
    } catch (error) {
       console.error("Failed to update points", error);
       alert(t('adminError'));
    } finally {
       setActionLoading(false);
    }
  };

  const handleAddSubscription = async () => {
    if (!selectedUser || !actionPlan) return; 
    setActionLoading(true);
    try {
        const expiresAt = new Date();
        if (actionPlan === 'pro') expiresAt.setMonth(expiresAt.getMonth() + 1);
        else if (actionPlan === 'pro-max') expiresAt.setMonth(expiresAt.getMonth() + 2);
        else if (actionPlan === 'master') expiresAt.setMonth(expiresAt.getMonth() + 3);

        const { error } = await supabase
          .from('users') 
          .update({
            subscription: actionPlan, 
            subscription_start_at: new Date().toISOString(),
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        await fetchUsers(); 
        closeModal();
        alert(t('adminSuccess')); 
    } catch (error: any) {
        console.error("Failed to add subscription", error);
        alert(t('adminError') + ": " + error.message);
    } finally {
        setActionLoading(false);
    }
  };

  const handleRemoveSubscription = async () => {
    if (!selectedUser) return;
    if (!window.confirm(t('adminConfirm'))) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          subscription: 'free',
          subscription_expires_at: null,
          subscription_start_at: null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;
      await fetchUsers();
      alert(t('adminSuccess'));
    } catch (error: any) {
      alert("Error canceling subscription: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (type: ActionModalType) => {
      setActionModal(type);
      setActionValue('');
      setActionPlan('pro');
  };

  const closeModal = () => {
      setActionModal(null);
  };

  // --- End Handlers ---

  const categorizeUsers = (targetPlan: string) => {
    return profiles.filter(p => {
      let pPlan = p.subscription;
      if (!pPlan || pPlan.trim() === '') pPlan = 'free';
      return pPlan.toLowerCase() === targetPlan;
    });
  };

  const freeUsers = useMemo(() => categorizeUsers('free'), [profiles]);
  const proUsers = useMemo(() => categorizeUsers('pro'), [profiles]);
  const proMaxUsers = useMemo(() => categorizeUsers('pro-max'), [profiles]);
  const masterUsers = useMemo(() => categorizeUsers('master'), [profiles]);

  const searchResults = useMemo(() => 
    searchTerm.trim()
      ? profiles.filter(p => p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      : [], 
    [searchTerm, profiles]
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('noSubscription');
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const formatCairoDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  if (roleLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6">
          <Lock size={64} className="text-red-500 dark:text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('accessDenied')}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">{t('accessDeniedDesc')}</p>
        <Link to="/" className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
          {t('returnHome')}
        </Link>
      </div>
    );
  }

  const UserListCard: React.FC<UserListCardProps> = ({ title, users, colorClass, iconColorClass, allowBulkAdd, onBulkAddClick }) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 flex flex-col h-96 overflow-hidden">
      <div className={`p-4 border-b border-gray-100 dark:border-slate-800 ${colorClass}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            {allowBulkAdd && (
              <button
                onClick={(e) => { e.stopPropagation(); onBulkAddClick?.(); }}
                disabled={isProcessingPoints || users.length === 0}
                className="p-1 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('addPoints')}
              >
                {isProcessingPoints ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              </button>
            )}
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/50 dark:bg-black/20 ${iconColorClass}`}>
            {users.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {users.length > 0 ? (
          users.map((u) => (
            <button
              key={u.id}
              onClick={() => { setSearchTerm(u.email); setSelectedUser(u); }}
              className="w-full text-start p-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 truncate transition-colors cursor-pointer"
            >
              {u.email}
            </button>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">{t('noUsers')}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-in fade-in duration-500 min-h-screen">
      <div className="flex items-center space-x-3 rtl:space-x-reverse mb-8">
        <Shield className="w-8 h-8 text-brand-600 dark:text-brand-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('adminTitle')}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <UserListCard title={t('adminFreeAccounts')} users={freeUsers} colorClass="bg-gray-100 dark:bg-slate-800" iconColorClass="text-gray-600" allowBulkAdd={true} onBulkAddClick={handleBulkAddPointsForFreeUsers} />
            <UserListCard title={t('adminProAccounts')} users={proUsers} colorClass="bg-blue-50 dark:bg-blue-900/10" iconColorClass="text-blue-600" />
            <UserListCard title={t('adminProMaxAccounts')} users={proMaxUsers} colorClass="bg-purple-50 dark:bg-purple-900/10" iconColorClass="text-purple-600" />
            <UserListCard title={t('adminMasterAccounts')} users={masterUsers} colorClass="bg-amber-50 dark:bg-amber-900/10" iconColorClass="text-amber-600" />
          </div>

          <div className="max-w-3xl mx-auto mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('userLookup')}</h2>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 ltr:pl-3 rtl:pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full ltr:pl-10 rtl:pr-10 ltr:pr-3 rtl:pl-3 py-4 border border-gray-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedUser(null); }}
              />
            </div>

            {searchTerm && !selectedUser && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 overflow-hidden mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                {searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setSearchTerm(u.email); }}
                      className="w-full text-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800 last:border-0 transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-200">{u.email}</span>
                      <span className="text-xs text-gray-500 uppercase">{u.subscription || 'Free'}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t('noUsersFound')}</div>
                )}
              </div>
            )}

            {selectedUser && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-brand-600 p-6 text-white">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{selectedUser.email}</h3>
                      <p className="text-brand-100 text-sm opacity-90">ID: {selectedUser.id}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* ... Existing Stat Cards ... */}
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Calendar className="w-6 h-6" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('registered')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"><Clock className="w-6 h-6" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('lastSeen')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.last_seen)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg"><CreditCard className="w-6 h-6" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('plan')}</p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize mb-1">{selectedUser.subscription || 'Free'}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 pt-1 border-t border-gray-200 dark:border-slate-800">
                        <Hourglass size={10} className="me-1" />
                        <span className="font-medium">{formatDate(selectedUser.subscription_expires_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg"><Coins className="w-6 h-6" /></div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('creditsBalance')}</p>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">{selectedUser.balance || 0}</p>
                      <div className="flex items-center text-xs text-red-500/80 dark:text-red-400/80 mt-1 pt-1 border-t border-gray-200 dark:border-slate-800">
                        <History size={10} className="me-1" />
                        <span className="font-medium">{t('spentCoins')}: {selectedUser.spent_coins || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* --- Actions Buttons --- */}
                <div className="p-6 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Account Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button 
                      onClick={() => openModal('addPoints')}
                      className="flex items-center justify-center gap-2 p-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl transition-all font-medium text-sm"
                    >
                      <PlusCircle size={18} />
                      {t('adminAddPoints')}
                    </button>
                    <button 
                      onClick={() => openModal('deductPoints')}
                      className="flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl transition-all font-medium text-sm"
                    >
                      <MinusCircle size={18} />
                      {t('adminDeductPoints')}
                    </button>
                    <button 
                      onClick={() => openModal('addSub')}
                      className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl transition-all font-medium text-sm"
                    >
                      <Crown size={18} />
                      {t('adminAddSub')}
                    </button>
                    <button 
                      onClick={handleRemoveSubscription}
                      className="flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium text-sm border border-gray-200 dark:border-slate-700"
                    >
                      <Trash2 size={18} />
                      {t('adminRemoveSub')}
                    </button>
                  </div>

                  {/* Inline Action Modal */}
                  {actionModal && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                       <div className="flex justify-between items-center mb-4">
                         <h4 className="font-bold text-gray-900 dark:text-white">
                           {actionModal === 'addPoints' ? t('adminAddPoints') : 
                            actionModal === 'deductPoints' ? t('adminDeductPoints') : t('adminAddSub')}
                         </h4>
                         <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                       </div>
                       
                       {(actionModal === 'addPoints' || actionModal === 'deductPoints') && (
                         <div className="space-y-4">
                           <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminPointsAmount')}</label>
                             <input 
                                type="number" 
                                value={actionValue} 
                                onChange={(e) => setActionValue(e.target.value)}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="0"
                                autoFocus
                             />
                           </div>
                           <div className="flex justify-end gap-2">
                             <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors">{t('cancel')}</button>
                             <button 
                               onClick={() => handleUpdatePoints(actionModal === 'addPoints')}
                               disabled={actionLoading || !actionValue}
                               className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
                             >
                               {actionLoading && <Loader2 size={14} className="animate-spin" />}
                               {t('adminConfirm')}
                             </button>
                           </div>
                         </div>
                       )}

                       {actionModal === 'addSub' && (
                         <div className="space-y-4">
                           <div>
                             <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminSelectPlan')}</label>
                             <select
                               value={actionPlan}
                               onChange={(e) => setActionPlan(e.target.value)}
                               className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
                             >
                               <option value="pro">{t('adminSubPro')}</option>
                               <option value="pro-max">{t('adminSubProMax')}</option>
                               <option value="master">{t('adminSubMaster')}</option>
                             </select>
                           </div>
                           <div className="flex justify-end gap-2">
                             <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors">{t('cancel')}</button>
                             <button 
                               onClick={handleAddSubscription}
                               disabled={actionLoading}
                               className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
                             >
                               {actionLoading && <Loader2 size={14} className="animate-spin" />}
                               {t('adminConfirm')}
                             </button>
                           </div>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* === PENDING PAYMENTS NOTIFICATION BAR === */}
          <div className="max-w-3xl mx-auto mb-16">
            <button
              onClick={() => setShowPaymentsModal(true)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg p-4 flex items-center justify-between transition-all duration-300 transform hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Receipt size={24} className="text-white" />
                </div>
                <div className="text-start">
                  <h3 className="font-bold text-lg">
                    {language === 'ar' ? 'طلبات الدفع المعلقة' : 'Pending Payment Requests'}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {language === 'ar' ? 'انقر للمراجعة والموافقة' : 'Click to review and approve'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black">{pendingPayments.length}</span>
                <span className="text-xs font-medium uppercase bg-white/20 px-2 py-1 rounded">Pending</span>
              </div>
            </button>
          </div>

          {/* === PENDING PAYMENTS MODAL === */}
          {showPaymentsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentsModal(false)}>
              <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-gray-100 dark:border-slate-800"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950 rounded-t-2xl">
                   <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <Banknote className="text-amber-500" />
                     {language === 'ar' ? 'طلبات الدفع المعلقة' : 'Pending Requests'}
                   </h3>
                   <button onClick={() => setShowPaymentsModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                  {pendingPayments.length > 0 ? (
                    pendingPayments.map((payment) => (
                      <div key={payment.id} className="bg-gray-50 dark:bg-slate-950/50 rounded-xl p-4 border border-gray-200 dark:border-slate-800 flex flex-col gap-4">
                        {/* Receipt Image */}
                        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-black/20 group">
                           <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                             <img src={payment.receipt_url} alt="Receipt" className="w-full h-auto max-h-64 object-contain mx-auto" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <span className="text-white text-sm font-bold">View Full Size</span>
                             </div>
                           </a>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="col-span-2">
                             <p className="text-xs text-gray-500 dark:text-gray-400">User Email</p>
                             <p className="font-semibold text-gray-900 dark:text-white break-all">{payment.user_email}</p>
                          </div>
                          <div>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
                             <p className="font-semibold text-brand-600 dark:text-brand-400">{t(payment.plan_name) || payment.plan_name}</p>
                          </div>
                          <div>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                             <p className="font-semibold text-green-600 dark:text-green-400">{payment.price}</p>
                          </div>
                          <div>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Method</p>
                             <p className="font-medium text-gray-900 dark:text-white capitalize">{payment.payment_method}</p>
                          </div>
                          <div>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Date (Cairo)</p>
                             <p className="font-medium text-gray-900 dark:text-white">{formatCairoDate(payment.created_at)}</p>
                          </div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => handleApprovePayment(payment.id)}
                          disabled={processingPaymentId === payment.id}
                          className="w-full py-3 mt-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {processingPaymentId === payment.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <CheckCircle size={18} />
                          )}
                          {language === 'ar' ? 'تم (موافقة)' : 'Done (Approve)'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-400">
                      <CheckCircle size={48} className="mx-auto mb-2 opacity-20" />
                      <p>{language === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === SYSTEM STATISTICS SECTION === */}
          {systemStats && (
            <div className="mt-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="text-brand-600" />
                {t('statsTitle')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Daily Usage */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                      <Activity size={24} />
                    </div>
                    <button 
                      onClick={handleResetDailyUsage}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t('resetDaily')}
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('dailyUsage')}</p>
                  <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{systemStats.daily_usage}</p>
                </div>

                {/* Monthly Usage */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                      <Calendar size={24} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('monthlyUsage')}</p>
                  <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{systemStats.monthly_usage}</p>
                </div>

                {/* Yearly Usage */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-violet-100 dark:border-violet-900/30 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-violet-100 dark:bg-violet-900/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-xl">
                      <TrendingUp size={24} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('yearlyUsage')}</p>
                  <p className="text-4xl font-bold text-violet-600 dark:text-violet-400">{systemStats.yearly_usage}</p>
                </div>

                {/* Passed Payments Stat */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg border border-green-100 dark:border-green-900/30 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl">
                      <Banknote size={24} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {language === 'ar' ? 'طلبات مكتملة (Pass)' : 'Passed Payments'}
                  </p>
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">{passedPaymentsCount}</p>
                </div>
              </div>

              {/* Discord Settings */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="p-3 bg-[#5865F2]/10 text-[#5865F2] rounded-xl">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{t('discordSettings')}</h3>
                    <p className="text-xs text-gray-500">{t('discordLinkPlaceholder')}</p>
                  </div>
                </div>
                
                <div className="flex-1 w-full flex gap-3">
                  <input 
                    type="text" 
                    value={discordInput}
                    onChange={(e) => setDiscordInput(e.target.value)}
                    placeholder="https://discord.gg/..."
                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 focus:ring-2 focus:ring-[#5865F2] outline-none text-sm"
                  />
                  <button 
                    onClick={handleUpdateDiscord}
                    disabled={isUpdatingDiscord}
                    className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-[#5865F2]/20 whitespace-nowrap"
                  >
                    {isUpdatingDiscord ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {t('updateLink')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
