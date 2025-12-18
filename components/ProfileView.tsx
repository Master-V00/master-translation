import React, { useState, useEffect } from 'react';
import { User as UserIcon, Shield, CreditCard, Sparkles, Coins, Code, Plus, Trash2, Edit2, AlertCircle, Save, X, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { LoginView } from './LoginView';
import { supabase } from '../services/supabaseClient';
import { SymbolSet } from '../types';

interface ProfileViewProps {
  onUpgrade: () => void;
  onBuyCredits: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onUpgrade, onBuyCredits }) => {
  const { t } = useLanguage();
  const { user, loading, balance, subscription, custom_sets, refreshUserData, getMaxSymbolSets } = useAuth();
  
  // Symbol Sets State
  const [isEditing, setIsEditing] = useState(false);
  const [currentSet, setCurrentSet] = useState<Partial<SymbolSet>>({ name: '', symbols: {} });
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateNew = () => {
    setCurrentSet({ name: '', symbols: {} });
    setJsonInput('{\n  "": "Normal",\n  "()": "Thoughts"\n}');
    setIsEditing(true);
    setJsonError(null);
  };

  const handleEdit = (set: SymbolSet) => {
    setCurrentSet(set);
    setJsonInput(JSON.stringify(set.symbols, null, 2));
    setIsEditing(true);
    setJsonError(null);
  };

  // حذف من Supabase
  const handleDelete = async (id: string) => {
    if (window.confirm(t('confirmDelete'))) {
      try {
        // فلترة المصفوفة لحذف المجموعة المختارة فقط
        const updatedSets = (custom_sets || []).filter(s => s.id !== id);
        
        const { error } = await supabase
          .from('users')
          .update({ custom_sets: updatedSets })
          .eq('id', user?.id);
        
        if (error) throw error;
        await refreshUserData(); 
      } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to delete set");
      }
    }
  };

  // حفظ في Supabase (إضافة أو تحديث)
const handleSave = async () => {
    try {
      setIsSaving(true);
      setJsonError(null);
      
      // 1. فحص صحة الـ JSON والحماية من الهياكل الغريبة
      const parsedSymbols = JSON.parse(jsonInput);
      if (typeof parsedSymbols !== 'object' || parsedSymbols === null || Array.isArray(parsedSymbols)) {
        throw new Error("Invalid Format");
      }

      // 2. تنظيف البيانات (Sanitization) لمنع أي محاولة SQL Injection أو Buffer Overflow
      const sanitizedSymbols = {};
      Object.entries(parsedSymbols).forEach(([key, value]) => {
        // تنظيف المفتاح والقيمة وتحديد طولهم (حماية إضافية)
        const safeKey = String(key).trim().substring(0, 50);
        const safeValue = String(value).trim().substring(0, 500);
        if (safeKey) sanitizedSymbols[safeKey] = safeValue;
      });

      // 3. تجهيز بيانات المجموعة
      const setData = {
        id: currentSet.id || crypto.randomUUID(),
        name: (currentSet.name || 'Untitled Set').substring(0, 100),
        symbols: sanitizedSymbols,
        updated_at: new Date().toISOString()
      };

      // 4. تحديث المصفوفة (لو موجودة يعدلها، لو جديدة يضيفها)
      let updatedSets = [];
      if (currentSet.id) {
        updatedSets = (custom_sets || []).map(s => s.id === currentSet.id ? setData : s);
      } else {
        updatedSets = [...(custom_sets || []), setData];
      }

      // 5. الحفظ في Supabase (استخدام Parameters يمنع الـ SQL Injection تلقائياً)
      const { error } = await supabase
        .from('users')
        .update({ custom_sets: updatedSets })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshUserData();
      setIsEditing(false);
    } catch (e) {
      console.error("Save error:", e);
      setJsonError(t('invalidJson') || "Invalid JSON format");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
     return <div className="p-10 text-center text-gray-500">{t('processing')}</div>;
  }

  if (!user) {
    return <LoginView />;
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || t('guestUser');
  const email = user.email || t('guestEmail');
  const maxSets = getMaxSymbolSets();
  const canCreate = (custom_sets?.length || 0) < maxSets;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('profileTitle')}</h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden mb-8">
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
                   <span className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{subscription || t('planFree')}</span>
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
                   <span className="text-3xl font-bold text-gray-900 dark:text-white">{balance}</span>
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

      {/* Symbol Sets Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Code size={24} className="text-brand-600" />
              {t('symbolSetsTitle')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t('symbolSetsDesc')}</p>
          </div>
          
          <div className="flex items-center gap-3">
             <span className="text-sm font-medium text-gray-500">
               {custom_sets?.length || 0} / {maxSets}
             </span>
             {maxSets === 0 ? (
               <button onClick={onUpgrade} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                 <Shield size={16} />
                 {t('upgradeToCreate')}
               </button>
             ) : (
                <button 
                  onClick={handleCreateNew}
                  disabled={!canCreate || isEditing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !canCreate || isEditing
                      ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  <Plus size={16} />
                  {t('createSet')}
                </button>
             )}
          </div>
        </div>

        {isEditing ? (
          <div className="bg-gray-50 dark:bg-slate-950 rounded-xl p-6 border border-gray-200 dark:border-slate-800 animate-in slide-in-from-right-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('setName')}</label>
              <input 
                type="text" 
                value={currentSet.name} 
                onChange={e => setCurrentSet({...currentSet, name: e.target.value})}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('symbolsJson')}</label>
              <textarea 
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder={t('symbolsJsonPlaceholder')}
                className="w-full h-48 p-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-brand-500 custom-scrollbar"
              />
              {jsonError && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14}/> {jsonError}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleSave}
                disabled={!currentSet.name || isSaving}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('saveSet')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {(custom_sets?.length || 0) === 0 ? (
               <div className="col-span-full py-10 text-center text-gray-400 bg-gray-50 dark:bg-slate-950 rounded-xl border border-dashed border-gray-300 dark:border-slate-800">
                 {t('noSymbolSets')}
               </div>
             ) : (
               custom_sets?.map(set => (
                 <div key={set.id} className="bg-gray-50 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-800 group relative">
                   <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2 truncate pr-16">{set.name}</h3>
                   <div className="text-xs text-gray-500 font-mono bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-800 h-24 overflow-hidden mb-3 opacity-70">
                     {JSON.stringify(set.symbols, null, 2)}
                   </div>
                   
                   <div className="flex justify-end gap-2">
                     <button 
                       onClick={() => handleEdit(set)}
                       className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                       title={t('editSet')}
                     >
                       <Edit2 size={16} />
                     </button>
                     <button 
                       onClick={() => handleDelete(set.id)}
                       className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
                       title={t('deleteSet')}
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))
             )}
          </div>
        )}
      </div>
    </div>
  );
};