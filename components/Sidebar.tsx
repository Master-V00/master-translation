
import React, { useEffect, useState } from 'react';
import { Home, User, LogOut, ArrowLeftFromLine, LogIn, LayoutDashboard, MessageSquare, LifeBuoy, Gift, BookOpen, Scissors, History, Globe } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { t, dir } = useLanguage();
  const { user, signOut, last_seen } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [discordLink, setDiscordLink] = useState<string>('https://discord.gg/jNn6Rkf2uc');

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        const { data } = await supabase
          .from('system_stats')
          .select('discord')
          .maybeSingle();
        if (data?.discord) {
          setDiscordLink(data.discord);
        }
      } catch (err) {
        console.error('Error fetching system stats:', err);
      }
    };
    fetchSystemStats();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error updating last_seen:', err);
      }
    };

    const events = ['click', 'keydown', 'mousemove'];
    events.forEach(evt => window.addEventListener(evt, updateLastSeen));

    updateLastSeen();

    return () => events.forEach(evt => window.removeEventListener(evt, updateLastSeen));
  }, [user?.id]);

  const formatLastSeen = (dateString: string) => {
    return new Date(dateString + 'Z').toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const navItems = [
    { path: '/', icon: Home, label: t('navHome') },
    { path: '/profile', icon: User, label: t('navProfile') },
    { path: '/earn', icon: Gift, label: t('navEarn') },
    { path: '/viewer-manga', icon: BookOpen, label: t('navMangaReader') },
    { path: '/scraper', icon: Globe, label: t('navScraper') },
    { path: '/merger', icon: Scissors, label: t('navMerger') },
    { path: '/cover-design', icon: BookOpen, label: t('navCoverDesign') },
    { path: '/history', icon: History, label: t('navHistory') },
    { path: '/support', icon: LifeBuoy, label: t('navSupport') },
  ];

  if (user?.email === 'admin@example.com') {
    navItems.push({ path: '/admin', icon: LayoutDashboard, label: t('navAdmin') });
  }

  const handleItemClick = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) toggleSidebar();
  };

  const handleLogout = async () => {
    await signOut();
    if (window.innerWidth < 768) toggleSidebar();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity animate-in fade-in"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <div 
        className={`fixed md:sticky top-0 z-40 h-screen bg-white dark:bg-slate-900 border-e border-gray-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden
          ${isOpen ? 'w-64 translate-x-0 shadow-2xl md:shadow-none' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'}
          ${dir === 'rtl' ? 'right-0' : 'left-0'}
        `}
      >
        {/* Header */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-slate-800 justify-between`}>
           <div className="flex items-center gap-2">
             <img src={import.meta.env.BASE_URL + 'logo.png'} alt="MT" className="w-8 h-8 rounded-lg object-contain" />
             <span className="font-bold text-xl text-brand-600 dark:text-brand-400 font-[Cairo]">MT</span>
           </div>
           <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-400 transition-colors"
            title={t('toggleMenu')}
          >
            <ArrowLeftFromLine size={24} className="rtl:rotate-180" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto custom-scrollbar px-3">
          {navItems.map(item => {
            let isItemActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item.path)}
                className={`flex items-center h-12 px-4 rounded-xl transition-all duration-200 group w-full ${
                  isItemActive 
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 font-semibold' 
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon 
                  size={24} 
                  className={`flex-shrink-0 transition-colors ${isItemActive ? 'text-brand-600 dark:text-brand-400' : 'group-hover:text-gray-900 dark:group-hover:text-gray-200'}`} 
                />
                <span className={`ms-3 truncate font-medium`}>{item.label}</span>
              </button>
            );
          })}

          {/* Discord / Support Modern Card */}
          <div className="mt-8 px-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="relative overflow-hidden bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] p-5 border border-indigo-100 dark:border-indigo-900/20 group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
              
              <div className="flex items-center gap-3 mb-3">
                <img src={import.meta.env.BASE_URL + 'discord.png'} alt="Discord" className="w-10 h-10 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
                <h4 className="text-sm font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">{t('navSupport')}</h4>
              </div>
              
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4 whitespace-normal">
                {t('supportDesc')}
              </p>
              
              <button 
                onClick={() => handleItemClick('/support')}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
              >
                <MessageSquare size={14} fill="currentColor" />
                {t('joinDiscord')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
          {user ? (
            <>
              <div className="mb-2 text-sm text-gray-500 dark:text-slate-400 px-2 truncate">
                Last seen: {last_seen ? formatLastSeen(last_seen) : '—'}
              </div>
              <button 
                onClick={handleLogout}
                className={`flex items-center w-full h-12 px-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors`}
                title={t('logOut')}
              >
                <LogOut size={24} className="flex-shrink-0" />
                <span className={`ms-3 font-medium truncate`}>{t('logOut')}</span>
              </button>
            </>
          ) : (
             <button 
              onClick={() => handleItemClick('/profile')}
              className={`flex items-center w-full h-12 px-4 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 rounded-xl transition-colors`}
              title="Login"
            >
              <LogIn size={24} className="flex-shrink-0" />
              <span className={`ms-3 font-medium truncate`}>Login</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
