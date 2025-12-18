import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Search, Calendar, Clock, CreditCard, Coins, User, Loader2, Shield, Lock, History, Hourglass, PlusCircle } from 'lucide-react';
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
}

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessingPoints, setIsProcessingPoints] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // STRICT ADMIN CHECK
  const ADMIN_EMAIL = 'admin@example.com';
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Use RPC to bypass RLS and get all users
      // Fallback to select if RPC is not defined yet (for backward compatibility if SQL not run)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_users');

      if (!rpcError && rpcData) {
        setProfiles(rpcData);
      } else {
        // Fallback to standard select (subject to RLS)
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProfiles(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddPointsForFreeUsers = async () => {
    const amountStr = window.prompt(t('enterPointsAmount'));
    if (!amountStr) return;

    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessingPoints(true);
    try {
      // جلب كل المستخدمين المجانيين من DB مباشرة (لتجنب مشاكل RLS)
      const { data: freeUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, email, balance, subscription')
        .or('subscription.is.null,subscription.eq.'); // subscription null أو empty string
        ;

      if (fetchError) throw fetchError;
      if (!freeUsers || freeUsers.length === 0) {
        alert(t('noFreeUsers'));
        return;
      }

      let successCount = 0;

      for (const u of freeUsers) {
        // استخدام RPC لو موجود
        const { error: rpcError } = await supabase.rpc('admin_add_credits', {
          target_user_id: u.id,
          amount: amount
        });

        if (!rpcError) {
          successCount++;
        } else {
          // Fallback: direct update مع تجاوز الـ balance القديم
          const { error: updateError } = await supabase
            .from('users')
            .update({ balance: supabase.raw('balance + ?', [amount]) }) // balance الحالي + amount
            .eq('id', u.id);

          if (updateError) {
            console.error(`Failed to add points to ${u.email}`, updateError);
          } else {
            successCount++;
          }
        }
      }

      await fetchUsers(); // refresh UI
      alert(`${t('pointsAddedSuccess')} (${successCount}/${freeUsers.length})`);
    } catch (err) {
      console.error('Bulk add for free users failed:', err);
    } finally {
      setIsProcessingPoints(false);
    }
  };

  const categorizeUsers = (targetPlan: string) => {
    return profiles.filter(p => {
        // Treat null, undefined, or empty string subscription as 'free'
        let pPlan = p.subscription;
        if (!pPlan || pPlan.trim() === '') {
            pPlan = 'free';
        }
        return pPlan.toLowerCase() === targetPlan;
    });
  };

  const freeUsers = categorizeUsers('free');
  const proUsers = categorizeUsers('pro');
  const proMaxUsers = categorizeUsers('pro-max');
  const masterUsers = categorizeUsers('master');

  const searchResults = searchTerm.trim()
    ? profiles.filter(p => p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('noSubscription');
    // Format using Egypt Time (Africa/Cairo)
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-full mb-6">
          <Lock size={64} className="text-red-500 dark:text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('accessDenied')}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
          {t('accessDeniedDesc')}
        </p>
        <Link
          to="/"
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
        >
          {t('returnHome')}
        </Link>
      </div>
    );
  }

  const UserListCard = ({
    title,
    users,
    colorClass,
    iconColorClass,
    allowBulkAdd,
    onBulkAddClick // تم استقبال الدالة هنا
  }: {
    title: string,
    users: UserData[],
    colorClass: string,
    iconColorClass: string,
    allowBulkAdd?: boolean,
    onBulkAddClick?: () => void // تعريف نوع الدالة
  }) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 flex flex-col h-96 overflow-hidden">
      <div className={`p-4 border-b border-gray-100 dark:border-slate-800 ${colorClass}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            {allowBulkAdd && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBulkAddClick?.(); // نفذ الدالة الجديدة
                }}
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
          users.map(u => (
            <button
              key={u.id}
              onClick={() => {
                setSearchTerm(u.email);
                setSelectedUser(u);
              }}
              className="w-full text-start p-3 bg-gray-50 hover:bg-gray-100 dark:bg-slate-950 dark:hover:bg-slate-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 truncate transition-colors cursor-pointer"
            >
              {u.email}
            </button>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
            {t('noUsers')}
          </div>
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
          {/* Top Section: Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <UserListCard
              title={t('adminFreeAccounts')}
              users={freeUsers}
              colorClass="bg-gray-100 dark:bg-slate-800"
              iconColorClass="text-gray-600"
              allowBulkAdd={true}
              onBulkAddClick={handleBulkAddPointsForFreeUsers}
            />
            <UserListCard
              title={t('adminProAccounts')}
              users={proUsers}
              colorClass="bg-blue-50 dark:bg-blue-900/10"
              iconColorClass="text-blue-600"
            />
            <UserListCard
              title={t('adminProMaxAccounts')}
              users={proMaxUsers}
              colorClass="bg-purple-50 dark:bg-purple-900/10"
              iconColorClass="text-purple-600"
            />
            <UserListCard
              title={t('adminMasterAccounts')}
              users={masterUsers}
              colorClass="bg-amber-50 dark:bg-amber-900/10"
              iconColorClass="text-amber-600"
            />
          </div>

          {/* Search Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('userLookup')}</h2>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 ltr:pl-3 rtl:pr-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full ltr:pl-10 rtl:pr-10 ltr:pr-3 rtl:pl-3 py-4 border border-gray-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent sm:text-sm shadow-sm transition-all"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedUser(null);
                }}
              />
            </div>

            {/* Search Results Dropdown/List */}
            {searchTerm && !selectedUser && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-800 overflow-hidden mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                {searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchTerm(user.email);
                      }}
                      className="w-full text-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800 last:border-0 transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-200">{user.email}</span>
                      <span className="text-xs text-gray-500 uppercase">{user.subscription || 'Free'}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">{t('noUsersFound')}</div>
                )}
              </div>
            )}

            {/* Selected User Details */}
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
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('registered')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('lastSeen')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.last_seen)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-xl flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                      <CreditCard className="w-6 h-6" />
                    </div>
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
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-lg">
                      <Coins className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('creditsBalance')}</p>
                      <p className="font-medium text-gray-900 dark:text-white mb-1">{selectedUser.balance || 0}</p>

                      {/* SPENT COINS DISPLAY */}
                      <div className="flex items-center text-xs text-red-500/80 dark:text-red-400/80 mt-1 pt-1 border-t border-gray-200 dark:border-slate-800">
                        <History size={10} className="me-1" />
                        <span className="font-medium">{t('spentCoins')}: {selectedUser.spent_coins || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};