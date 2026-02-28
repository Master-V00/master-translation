
import React, { useState } from 'react';
import { Gift, ExternalLink, Loader2, PlayCircle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext'; // Added useAuth to get user ID
import { supabase } from '../services/supabaseClient';

export const EarnCoinsView: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth(); // Get current user
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const handleEarn = async () => {
    if (!user) {
      setError(t('pleaseLogin') || "Please login first");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const now = new Date().toISOString();

      // 1. جلب كل العروض النشطة
      const { data: offers, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .eq('active', true)
        .gt('expires_at', now);

      if (fetchError) throw fetchError;

      // 2. جلب سجل المستخدم (كل اللي عداه)
      const { data: history, error: historyError } = await supabase
        .from('claim_history')
        .select('offer_id')
        .eq('user_id', user.id);

      if (historyError) throw historyError;

      // 3. الفلترة الذكية (تحويل كل الـ IDs لنصوص لضمان المطابقة)
      const claimedOfferIds = new Set(history?.map(h => String(h.offer_id)) || []);
      
      // استخراج العروض اللي المستخدم "لم" يتمها بعد
      const availableOffers = offers?.filter(offer => !claimedOfferIds.has(String(offer.id))) || [];

      // 4. التحقق إذا كانت القائمة فارغة
      if (availableOffers.length === 0) {
        setError("لقد أتممت جميع الروابط المتاحة حالياً، عد لاحقاً!");
        setLoading(false);
        return;
      }

      // 5. اختيار رابط عشوائي من المتاحين فقط لضمان التجديد
      const nextOffer = availableOffers[Math.floor(Math.random() * availableOffers.length)];

      console.log("الرابط المختار:", nextOffer.slug);

      // 6. طلب التوكن والتوجه للرابط
      const response = await fetch('/.netlify/functions/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: nextOffer.slug, userId: user.id })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('pending_token', data.token);
        localStorage.setItem('pending_slug', nextOffer.slug);
        window.open(nextOffer.short_link, '_blank');
      } else {
        throw new Error(data.body || 'Failed to generate token');
      }

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || t('unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800 relative overflow-hidden">
        
        {/* Background Gradient */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
        
        <div className="mb-8">
          <div className="w-24 h-24 bg-pink-50 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Gift size={48} className="text-pink-500" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('earnCoinsTitle')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('earnCoinsDesc')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <button
          onClick={handleEarn}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-black text-xl rounded-2xl shadow-lg shadow-purple-500/30 transform hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <PlayCircle size={24} fill="currentColor" />
          )}
          {loading ? t('loading') : t('watchAndEarn')}
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ExternalLink size={12} />
          <span>{t('opensNewTab')}</span>
        </div>
      </div>
    </div>
  );
};
