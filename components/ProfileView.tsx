import React from 'react';
import { User as UserIcon, Shield, CreditCard, Sparkles, Coins } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { LoginView } from './LoginView';

interface ProfileViewProps {
  onUpgrade: () => void;
  onBuyCredits: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onUpgrade, onBuyCredits }) => {
  const { t } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) {
     return <div className="p-10 text-center text-gray-500">{t('processing')}</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || t('guestUser');
  const email = user.email || t('guestEmail');

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('profileTitle')}</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-brand-500 to-purple-600"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-8">
            <div className="flex items-end">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={48} />
                  )}
                </div>
              </div>
              <div className="ms-4 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{fullName}</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{email}</span>
              </div>
            </div>
            <div className="mb-2">
               <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-800">
                 {t('accountStatus')}
               </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Plan Card */}
            <div className="p-6 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                  <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
                    <Shield size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('currentPlan')}</h3>
                </div>
                <div className="mb-4">
                   <span className="text-2xl font-bold text-gray-900 dark:text-white">{t('planFree')}</span>
                </div>
              </div>
              <button 
                onClick={onUpgrade}
                className="w-full px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <Sparkles size={16} className="me-2" />
                {t('upgradeNow')}
              </button>
            </div>

            {/* Credit Balance Card */}
            <div className="p-6 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                  <div className="p-2 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg">
                    <Coins size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{t('creditsBalance')}</h3>
                </div>
                <div className="flex items-baseline mb-4">
                   <span className="text-3xl font-bold text-gray-900 dark:text-white">0</span>
                   <span className="ms-1 text-sm text-gray-500 dark:text-gray-400">{t('credits')}</span>
                </div>
              </div>
              <button 
                onClick={onBuyCredits}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                + {t('buyNow')}
              </button>
            </div>

            {/* Payment Method Card */}
            <div className="p-6 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 opacity-75 flex flex-col">
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('paymentMethod')}</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-auto">{t('noPaymentMethod')}.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};