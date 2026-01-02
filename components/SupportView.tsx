
import React, { useEffect, useState } from 'react';
import { MessageSquare, ShieldCheck, HeartHandshake, ExternalLink, LifeBuoy } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { supabase } from '../services/supabaseClient';

export const SupportView: React.FC = () => {
  /* Added 'language' to destructuring from useLanguage to fix undefined variable errors */
  const { t, dir, language } = useLanguage();
  const [discordLink, setDiscordLink] = useState<string>('#');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const { data } = await supabase
          .from('system_stats')
          .select('discord')
          .maybeSingle();
        if (data?.discord) {
          setDiscordLink(data.discord);
        }
      } catch (err) {
        console.error('Error fetching discord link:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLink();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-6 duration-700" dir={dir}>
      <div className="text-center mb-12">
        <div className="inline-flex p-4 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6 shadow-xl shadow-indigo-500/10">
          <LifeBuoy size={48} className="animate-[spin_10s_linear_infinite]" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          {t('navSupport')}
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('supportDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Support Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700"></div>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="flex -space-x-3 rtl:space-x-reverse">
              <img src="/logo.png" alt="Logo" className="w-14 h-14 rounded-2xl object-contain bg-white dark:bg-slate-900 p-1 shadow-lg z-10 border-2 border-white dark:border-slate-900" />
              <img src="/discord.png" alt="Discord" className="w-14 h-14 rounded-2xl object-contain bg-[#5865F2] p-2 shadow-lg z-0 border-2 border-white dark:border-slate-900" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
            {language === 'ar' ? 'مجتمع ديسكورد الرسمي' : 'Official Discord Community'}
          </h2>
          
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {language === 'ar' 
              ? 'انضم إلينا للحصول على حلول للمشاكل التقنية، طلب ميزات جديدة، أو الدردشة مع المترجمين الآخرين.' 
              : 'Join us to get solutions for technical issues, request new features, or chat with other translators.'}
          </p>

          <a 
            href={discordLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] group/btn"
          >
            <MessageSquare size={20} fill="currentColor" />
            {t('joinDiscord')}
            <ExternalLink size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
          </a>
        </div>

        {/* Info Cards */}
        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 flex gap-4 items-start">
            <div className="p-3 bg-white dark:bg-emerald-900/40 rounded-2xl text-emerald-600 shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-black text-emerald-900 dark:text-emerald-300 mb-1">{language === 'ar' ? 'دعم سريع' : 'Fast Support'}</h3>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-400/60 leading-relaxed">
                {language === 'ar' ? 'نحن نهتم بخصوصيتك ونقدم الدعم مباشرة من فريق التطوير.' : 'We care about your privacy and provide support directly from the dev team.'}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/20 flex gap-4 items-start">
            <div className="p-3 bg-white dark:bg-amber-900/40 rounded-2xl text-amber-600 shadow-sm">
              <HeartHandshake size={24} />
            </div>
            <div>
              <h3 className="font-black text-amber-900 dark:text-amber-300 mb-1">{language === 'ar' ? 'مجتمع متفاعل' : 'Active Community'}</h3>
              <p className="text-sm text-amber-700/70 dark:text-amber-400/60 leading-relaxed">
                {language === 'ar' ? 'نهتم برأيك ونسعى للتطور من اجلك.' : 'We value your opinion and strive to improve for your benefit.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-slate-400 font-medium">
          {language === 'ar' ? 'ساعات العمل: 24/10 عبر تذاكر العم في ديسكورد' : 'Working hours: 24/10 via support tickets on Discord'}
        </p>
      </div>
    </div>
  );
};
