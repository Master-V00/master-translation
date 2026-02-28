
import React, { useState, useRef, useEffect } from 'react';
import { ResultCard } from './ResultCard';
import { UploadedImage, TargetLanguage, TermReplacement, HistoryEntry } from '../types';
import { translateMangaPage } from '../services/geminiService';
import { useLanguage } from './LanguageContext';
import { Upload, Image as ImageIcon, Sparkles, Copy, Play, Trash2, Languages, FileText, Quote, ChevronUp, ChevronDown, Repeat2, Plus, X } from 'lucide-react';
import JSZip from 'jszip';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export const HomeView: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  
  // 1. استخراج كل شيء من الـ Hooks أولاً
  const { t } = useLanguage();
  const { user, balance, updateBalance, getAllowedLanguages, subscription, custom_sets } = useAuth();
  const navigate = useNavigate();

  // 2. الآن يمكنك استخدام getAllowedLanguages لأنها أصبحت معرفة
  const allowedLangs = getAllowedLanguages();
  
  // 3. تعريف الـ States التي تعتمد على القيم السابقة
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(allowedLangs[0] || 'Arabic');
  
  // Initialize Symbol Set from LocalStorage or default to 'none'
  const [selectedSymbolSet, setSelectedSymbolSet] = useState<string>(() => {
    return localStorage.getItem('symbol_set_pref') || 'none';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toolbar visibility state
  const [showToolbar, setShowToolbar] = useState(true);

  // Custom Terms State - Initialize from LocalStorage
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [customTerms, setCustomTerms] = useState<TermReplacement[]>(() => {
    try {
        const saved = localStorage.getItem('custom_terms_pref');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });
  
  const [newOriginal, setNewOriginal] = useState('');
  const [newReplacement, setNewReplacement] = useState('');

  // Save Preferences when changed
  useEffect(() => {
    localStorage.setItem('symbol_set_pref', selectedSymbolSet);
  }, [selectedSymbolSet]);

  useEffect(() => {
    localStorage.setItem('custom_terms_pref', JSON.stringify(customTerms));
  }, [customTerms]);

  // Queue management refs
  const imagesRef = useRef(images);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const requestTimestampsRef = useRef<number[]>([]);
  const balanceRef = useRef(balance);

  // Keep refs in sync with state
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  const handleAddTerm = () => {
    if (newOriginal.trim() && newReplacement.trim()) {
        const newTerm: TermReplacement = {
            id: Math.random().toString(36).substring(7),
            original: newOriginal.trim(),
            replacement: newReplacement.trim()
        };
        setCustomTerms([...customTerms, newTerm]);
        setNewOriginal('');
        setNewReplacement('');
    }
  };

  const handleRemoveTerm = (id: string) => {
      setCustomTerms(customTerms.filter(t => t.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddTerm();
      }
  };

  // دالة حفظ السجل في LocalStorage
  const saveToHistory = () => {
    const successfulImages = imagesRef.current.filter(img => img.status === 'success' && img.result);
    if (successfulImages.length === 0) return;

    const savedHistoryStr = localStorage.getItem('translation_history');
    let history: HistoryEntry[] = [];
    if (savedHistoryStr) {
      try { history = JSON.parse(savedHistoryStr); } catch (e) {}
    }

    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      title: `${t('batchPrefix')} #${(history.length + 1).toString().padStart(2, '0')}`,
      date: new Date().toISOString(),
      items: successfulImages.map(img => ({
        fileName: img.file.name,
        extracted: img.result?.extracted || '',
        translated: img.result?.translated || ''
      }))
    };

    history.unshift(newEntry);
    localStorage.setItem('translation_history', JSON.stringify(history));
    console.log("Translation batch saved to history.");
  };

  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsQueueRunning(true);

    while (queueRef.current.length > 0) {
      // RATE LIMIT LOGIC: Max 5 requests per minute
      const now = Date.now();
      requestTimestampsRef.current = requestTimestampsRef.current.filter(t => now - t < 60000);

      if (requestTimestampsRef.current.length >= 5) {
        const oldestRequestTime = requestTimestampsRef.current[0];
        const timeSinceOldest = now - oldestRequestTime;
        const waitTime = 60000 - timeSinceOldest + 1000; 

        if (waitTime > 0) {
          const nextId = queueRef.current[0]; 
          setImages((prev) => 
            prev.map((img) => img.id === nextId ? { ...img, status: 'waiting', cooldownEndsAt: now + waitTime } : img)
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; 
        }
      }

      const nextId = queueRef.current.shift();
      if (nextId) {
       // --- BALANCE CHECK START ---
      const isSubscriptionActive = subscription && subscription !== 'free';

      if (!isSubscriptionActive && balanceRef.current < 1) {
          setImages((prev) =>
              prev.map((img) =>
                  img.id === nextId
                      ? { ...img, status: 'error', error: 'ERR_NO_BALANCE' }
                      : img
              )
          );
          continue;
      }

        requestTimestampsRef.current.push(Date.now());
        await processImage(nextId);
      }
    }

    isProcessingRef.current = false;
    setIsQueueRunning(false);
    
    // حفظ في السجل بعد انتهاء الطابور
    saveToHistory();
  };

  const processImage = async (id: string) => {
    const imageToProcess = imagesRef.current.find((img) => img.id === id);
    if (!imageToProcess) return;

    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status: 'processing', error: undefined, cooldownEndsAt: undefined } : img))
    );

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageToProcess.file);
        reader.onload = () => {
          const resultData = reader.result as string;
          const base64Data = resultData.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      let finalSymbols: string | boolean = true;
      if (selectedSymbolSet === 'none') {
        finalSymbols = false;
      } else if (selectedSymbolSet === 'default') {
        finalSymbols = true;
      } else {
        const chosenSet = (custom_sets || []).find(s => s.id === selectedSymbolSet);
        finalSymbols = chosenSet ? chosenSet.symbols_text : true;
      }

      const result = await translateMangaPage(
        base64,
        imageToProcess.file.type,
        targetLanguage,
        finalSymbols,
        customTerms // Pass custom terms here
      );

      if (user) {
        const isSubscriptionActive = subscription && subscription !== 'free';

        if (!isSubscriptionActive) {
          // 1. خصم النقاط
          const { data: newBalance, error: deductError } = await supabase.rpc('deduct_credits');
          if (deductError) throw new Error('ERR_NO_BALANCE');
          
          if (typeof newBalance === 'number') {
            updateBalance(newBalance);
            balanceRef.current = newBalance;
          }

          // 2. إضافة إلى spent_coins (فقط عند الخصم)
          try {
            await supabase.rpc('increment_spent_coins');
          } catch (e) {
            console.warn('Spent coins update failed:', e);
          }
        }
        
        // 3. تحديث إحصائيات النظام (daily, monthly, yearly) لكل عملية ناجحة
        try {
          await supabase.rpc('increment_system_stats');
        } catch (e) {
          console.warn('System stats update failed:', e);
        }
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: 'success', result } : img
        )
      );

    } catch (error: any) {
      console.error('Processing error:', error);
      
      const msg = error.message?.toLowerCase() || "";
      if (error.status === 429 || msg.includes("quota") || msg.includes("exhausted")) {
        try {
          await supabase.rpc('increment_api_global_status');
        } catch (e) {
          console.error("Failed to update global status stat", e);
        }
      }

      const errorMsg = error.message === 'ERR_NO_BALANCE' ? 'ERR_NO_BALANCE' : t('unknownError');
      
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: 'error', error: errorMsg } : img
        )
      );
    }
  };

  const processFile = (file: File): UploadedImage => ({
    id: Math.random().toString(36).substring(7),
    file,
    previewUrl: URL.createObjectURL(file),
    status: 'idle',
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
        navigate('/profile');
        return;
    }

    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      const newImages: UploadedImage[] = [];

      for (const file of files) {
        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
          try {
            const zip = new JSZip();
            const zipContents = await zip.loadAsync(file);
            
            const imageFiles = Object.keys(zipContents.files)
              .filter(filename => !zipContents.files[filename].dir && /\.(jpg|jpeg|png|webp)$/i.test(filename))
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

            for (const filename of imageFiles) {
              const fileData = await zipContents.files[filename].async('blob');
              let mimeType = 'image/png';
              if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
              else if (filename.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
              
              const imageFile = new File([fileData], filename, { type: mimeType });
              newImages.push(processFile(imageFile));
            }
          } catch (e) {
            console.error("Error unzipping", e);
            alert(t('unzipError'));
          }
        } else if (file.type.startsWith('image/')) {
          newImages.push(processFile(file));
        }
      }

      setImages((prev) => [...prev, ...newImages]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSingleTranslate = (id: string) => {
    if (!user) {
        navigate('/profile');
        return;
    }

    if (!queueRef.current.includes(id)) {
        queueRef.current.push(id);
        setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'queued' } : img));
        processQueue();
    }
  };

  const handleRetranslate = (id: string) => {
    if (!user) {
        navigate('/profile');
        return;
    }

    queueRef.current = queueRef.current.filter(qid => qid !== id);
    queueRef.current.unshift(id);
    
    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'queued' } : img));
    processQueue();
  };

  const handleProcessAll = () => {
    if (!user) {
        navigate('/profile');
        return;
    }

    const idleImages = images.filter(img => img.status === 'idle');
    const idleIds = idleImages.map(img => img.id);
    
    queueRef.current.push(...idleIds);
    setImages(prev => prev.map(img => idleIds.includes(img.id) ? { ...img, status: 'queued' } : img));
    processQueue();
  };

  const handleCopyAll = async () => {
    if (!user) {
        navigate('/profile');
        return;
    }
    const successImages = images.filter(img => img.status === 'success' && img.result);
    if (successImages.length === 0) return;

    const allText = successImages.map(img => 
      `--- Page: ${img.file.name} ---\n\n${img.result?.translated}\n`
    ).join('\n====================\n\n');

    try {
      await navigator.clipboard.writeText(allText);
      alert(t('copySuccess'));
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCopyAllExtracted = async () => {
    if (!user) {
        navigate('/profile');
        return;
    }
    const successImages = images.filter(img => img.status === 'success' && img.result);
    if (successImages.length === 0) return;

    const allText = successImages.map(img => 
      `--- Page: ${img.file.name} ---\n\n${img.result?.extracted}\n`
    ).join('\n====================\n\n');

    try {
      await navigator.clipboard.writeText(allText);
      alert(t('copySuccess'));
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const clearAll = () => {
    queueRef.current = [];
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-300">
      
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight font-[Cairo]">
          {t('appTitle')}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto whitespace-pre-line">
          {t('subtitle')}
        </p>
      </div>

      {images.length > 0 && (
        <div className="sticky top-20 z-40 mb-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <ImageIcon size={20} className="text-brand-500" />
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {images.length} {t('pagesLoaded')}
              </span>
            </div>

            <button
              onClick={() => setShowToolbar(!showToolbar)}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              {showToolbar ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showToolbar && (
            <div className="flex gap-2 flex-wrap items-center">
              <button
                onClick={clearAll}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors font-medium text-sm"
              >
                <Trash2 size={16} />
                <span>{t('clear')}</span>
              </button>

            {/* Custom Terms Button */}
            <button
                onClick={() => setIsTermsModalOpen(true)}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors font-medium text-sm border border-amber-200 dark:border-amber-800"
            >
                <Repeat2 size={16} />
                <span>{t('customTerms')} ({customTerms.length})</span>
            </button>

            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border-2 border-purple-100 dark:border-slate-700 shadow-sm transition-all hover:border-purple-300 dark:hover:border-slate-600 group">
              <Quote size={18} className="text-purple-600 dark:text-purple-400" />
              <select
                value={selectedSymbolSet}
                onChange={(e) => setSelectedSymbolSet(e.target.value)}
                className="bg-transparent border-none text-base font-semibold text-gray-800 dark:text-gray-100 focus:ring-0 cursor-pointer min-w-[140px]"
              >
                 <option value="none" className="text-gray-900 bg-white dark:bg-slate-800 dark:text-gray-100">{t('noSymbols')}</option>
                 <option value="default" className="text-gray-900 bg-white dark:bg-slate-800 dark:text-gray-100">{t('defaultSymbols')}</option>
      
                 {subscription !== 'free' && custom_sets?.map((set) => (
                   <option key={set.id} value={set.id} className="text-gray-900 bg-white dark:bg-slate-800 dark:text-gray-100">
                     {set.name}
                   </option>
                 ))}
               </select>
             </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border-2 border-brand-100 dark:border-slate-700 shadow-sm transition-all hover:border-brand-300 dark:hover:border-slate-600 group">
                <Languages size={18} className="text-brand-600 dark:text-brand-400" />
                <select 
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as TargetLanguage)}
                  className="bg-transparent border-none text-base font-semibold text-gray-800 dark:text-gray-100 focus:ring-0 cursor-pointer min-w-[100px]"
                >
                  {getAllowedLanguages().map((lang) => (
                    <option key={lang} value={lang} className="text-gray-900 bg-white dark:bg-slate-800 dark:text-gray-100">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleCopyAllExtracted}
                disabled={!images.some(i => i.status === 'success')}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 dark:border-indigo-800"
              >
                <FileText size={16} />
                <span>{t('copyAllExtracted')}</span>
              </button>

              <button
                onClick={handleCopyAll}
                disabled={!images.some(i => i.status === 'success')}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-slate-700"
              >
                <Copy size={16} />
                <span>{t('copyAll')}</span>
              </button>

              <button
                onClick={handleProcessAll}
                disabled={isQueueRunning || !images.some(i => i.status === 'idle')}
                className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isQueueRunning ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                <span>{t('translateAll')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Terms Modal */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsTermsModalOpen(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Repeat2 className="text-amber-500" size={20}/>
                        {t('customTerms')}
                    </h3>
                    <button onClick={() => setIsTermsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder={t('originalWord')} 
                            value={newOriginal}
                            onChange={(e) => setNewOriginal(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                        />
                        <input 
                            type="text" 
                            placeholder={t('replacementWord')} 
                            value={newReplacement}
                            onChange={(e) => setNewReplacement(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                        />
                        <button 
                            onClick={handleAddTerm}
                            disabled={!newOriginal.trim() || !newReplacement.trim()}
                            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {customTerms.length === 0 ? (
                            <p className="text-center text-gray-400 py-4 text-sm">{t('noTermsAdded')}</p>
                        ) : (
                            customTerms.map(term => (
                                <div key={term.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-1">
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-red-500 font-medium">{term.original}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-500 font-bold">{term.replacement}</span>
                                    </div>
                                    <button onClick={() => handleRemoveTerm(term.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="mb-12">
        <div 
          className="relative group border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-3xl p-10 bg-white dark:bg-slate-900/50 hover:border-brand-500 dark:hover:border-brand-500 transition-all cursor-pointer text-center"
          onClick={() => {
             if (!user) {
                 navigate('/profile');
             } else {
                 fileInputRef.current?.click();
             }
          }}
        >
          <div className="absolute inset-0 bg-brand-50/50 dark:bg-brand-900/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-brand-100 dark:bg-brand-900/50 rounded-full text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform duration-300">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('uploadTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('uploadDesc')}
            </p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*,.zip,application/zip" 
            multiple 
          />
        </div>
      </div>

      <div className="space-y-8">
        {images.map((img) => (
          <div key={img.id} className="relative">
             {img.status === 'idle' && (
               <div className="absolute top-4 right-4 z-10 rtl:right-auto rtl:left-4">
                  <button
                    onClick={() => handleSingleTranslate(img.id)}
                    className="flex items-center space-x-2 rtl:space-x-reverse bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all font-medium"
                  >
                    <Sparkles size={16} />
                    <span>{t('translate')}</span>
                  </button>
               </div>
             )}
            <ResultCard item={img} onRetranslate={() => handleRetranslate(img.id)} />
          </div>
        ))}

        {images.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
              <Sparkles size={48} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">{t('noImages')}</p>
          </div>
        )}
      </div>

    </div>
  );
};
