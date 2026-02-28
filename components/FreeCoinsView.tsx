
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { Loader2, Gift, CheckCircle, AlertTriangle, LogIn } from 'lucide-react';

export const FreeCoinsView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, updateBalance, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'validating' | 'ready' | 'claiming' | 'success' | 'error'>('validating');
  const [token, setToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [coinsAdded, setCoinsAdded] = useState<number>(0);

  // Function to map raw backend errors to friendly translated messages
  const getFriendlyErrorMessage = (rawError: string) => {
    const errorLower = rawError.toLowerCase();
    
    if (errorLower.includes('auth_required')) return 'auth_required'; // Special case handled in UI
    if (errorLower.includes('offer not found')) return t('errorOfferNotFound');
    if (errorLower.includes('invalid or expired token')) return t('errorTokenInvalid');
    
    return t('unknownError');
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setErrorMsg('auth_required');
      setStatus('error');
      return;
    }

    const generateToken = async () => {
      try {
        const response = await fetch('/.netlify/functions/generate-token', {
          method: 'POST',
          body: JSON.stringify({ slug, userId: user.id }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to generate token');
        }

        const data = await response.json();
        setToken(data.token);
        setStatus('ready');
      } catch (err: any) {
        console.error('Token generation error:', err);
        // Extract useful message from potential JSON string or raw text
        let message = err.message;
        try {
            const parsed = JSON.parse(message);
            if (parsed.body) message = parsed.body;
        } catch(e) {}
        
        setErrorMsg(getFriendlyErrorMessage(message));
        setStatus('error');
      }
    };

    generateToken();
  }, [slug, user, loading, t]);

  const handleClaim = async () => {
    if (!token || !user) return;

    setStatus('claiming');
    try {
      const response = await fetch('/.netlify/functions/claim-coins', {
        method: 'POST',
        body: JSON.stringify({ token, userId: user.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to claim coins');
      }

      const data = await response.json();
      setCoinsAdded(data.amount); // Changed from data.added to data.amount based on function response structure
      
      // Update balance globally
      updateBalance(data.newBalance);
      
      setStatus('success');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err: any) {
      console.error('Claim error:', err);
      // Clean up error message
      let message = err.message;
      try {
          const parsed = JSON.parse(message);
          if (parsed.body) message = parsed.body;
      } catch(e) {}

      setErrorMsg(getFriendlyErrorMessage(message));
      setStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (status === 'error' && errorMsg === 'auth_required') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-300">
        <div className="p-4 bg-brand-100 dark:bg-brand-900/30 rounded-full mb-6">
          <LogIn size={40} className="text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('errorAuthRequired')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('pleaseLogin')}</p>
        <button 
          onClick={() => navigate('/profile')}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors"
        >
          {t('navProfile')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 min-h-[70vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800 text-center relative overflow-hidden">
        
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
        
        {status === 'validating' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('validating')}</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="flex flex-col items-center py-4">
            <div className="w-24 h-24 bg-yellow-50 dark:bg-yellow-900/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <Gift size={48} className="text-yellow-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('freeCoinsTitle')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t('earnCoinsDesc')}</p>
            
            <button
              onClick={handleClaim}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 transform hover:scale-[1.02] transition-all active:scale-95"
            >
              {t('claimCoins')}
            </button>
          </div>
        )}

        {status === 'claiming' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('claiming')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('claimSuccess')}</h2>
            <p className="text-lg font-bold text-yellow-500">+{coinsAdded} Coins</p>
          </div>
        )}

        {status === 'error' && errorMsg !== 'auth_required' && (
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={40} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('error')}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              {errorMsg}
            </p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              {t('returnHome')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
