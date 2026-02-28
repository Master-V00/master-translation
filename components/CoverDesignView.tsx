
import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Wand2, Loader2, Download, AlertTriangle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { generateCoverDesign } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { TargetLanguage } from '../types';

export const CoverDesignView: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, balance, updateBalance, getAllowedLanguages } = useAuth();
  const navigate = useNavigate();

  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(getAllowedLanguages()[0] || 'Arabic');
  const [resultCount, setResultCount] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cost = resultCount === 1 ? 10 : 15;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage({
        file,
        preview: URL.createObjectURL(file)
      });
      setResults([]);
      setError(null);
    }
  };

  const handleProcess = async () => {
    if (!user) {
        navigate('/profile');
        return;
    }
    if (!image) return;

    if (balance < cost) {
      setError(`${t('insufficientBalance')} (${t('coverCostWarning')} ${cost})`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image.file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      // ملاحظة: لا نخصم النقاط هنا. ننتظر نجاح العملية.

      const generatedImages: string[] = [];

      // Generate 1st Image
      const img1 = await generateCoverDesign(base64, image.file.type, customTitle, targetLanguage);
      generatedImages.push(img1);

      // Generate 2nd Image if requested
      if (resultCount === 2) {
         const img2 = await generateCoverDesign(base64, image.file.type, customTitle, targetLanguage);
         generatedImages.push(img2);
      }

      // === نجحت العملية، الآن نخصم النقاط ===
      const newBalance = balance - cost;
      const { error: updateErr } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (updateErr) {
          // في حالة نادرة جداً فشل الخصم بعد نجاح التوليد، نسجل الخطأ ولكن نعرض النتيجة للمستخدم
          console.error("Failed to deduct coins after success:", updateErr);
      } else {
          updateBalance(newBalance);
      }

      setResults(generatedImages);

    } catch (err: any) {
      console.error(err);
      // عرض رسالة خطأ موحدة ولطيفة للمستخدم
      const errorMessage = language === 'ar' 
        ? "عذراً، الخدمة متوقفة مؤقتاً بسبب ضغط شديد أو مشكلة تقنية. يرجى المحاولة لاحقاً."
        : "Sorry, the service is temporarily unavailable due to high traffic or a technical issue. Please try again later.";
      
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-in fade-in duration-300">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 font-[Cairo]">{t('coverDesignTitle')}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">{t('coverDesignDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Upload & Settings */}
        <div className="space-y-6">
          
          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all h-80 flex flex-col items-center justify-center overflow-hidden
              ${image ? 'border-brand-500 bg-brand-50/10' : 'border-gray-300 dark:border-slate-700 hover:border-brand-400 dark:hover:border-brand-500 bg-white dark:bg-slate-900'}
            `}
          >
            {image ? (
              <img src={image.preview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <>
                <div className="p-4 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400 mb-4">
                  <Upload size={32} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">{t('uploadTitle')}</h3>
              </>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 space-y-5">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('customTitle')}</label>
              <input 
                type="text" 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={t('customTitlePlaceholder')}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('targetLang')}</label>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as TargetLanguage)}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
              >
                {getAllowedLanguages().map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('resultsCount')}</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setResultCount(1)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${resultCount === 1 ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-slate-700 text-gray-500'}`}
                >
                  {t('oneResult')}
                </button>
                <button 
                  onClick={() => setResultCount(2)}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${resultCount === 2 ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-200 dark:border-slate-700 text-gray-500'}`}
                >
                  {t('twoResults')}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={!image || isProcessing}
              className="w-full py-4 bg-gradient-to-r from-brand-600 to-purple-600 text-white font-black rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
              {isProcessing ? t('designing') : `${t('startDesign')} (-${cost})`}
            </button>

          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          <div className="h-full bg-gray-50 dark:bg-slate-950/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center min-h-[500px]">
            {results.length > 0 ? (
              <div className="w-full space-y-6">
                <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-center font-bold mb-4 animate-in zoom-in">
                  {t('coverGenerated')}
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {results.map((res, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 150}ms` }}>
                      <img src={res} alt={`Result ${idx + 1}`} className="w-full h-auto rounded-lg mb-4" />
                      <a 
                        href={res} 
                        download={`Cover-Design-${idx + 1}.png`}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl font-bold transition-colors"
                      >
                        <Download size={18} />
                        {t('download')}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <ImageIcon size={64} className="mx-auto mb-4 opacity-20" />
                <p>{t('noImagesMerged')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
