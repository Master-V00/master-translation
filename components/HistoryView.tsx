
import React, { useState, useEffect } from 'react';
import { History, Trash2, Edit3, ChevronRight, ChevronLeft, ArrowLeft, Copy, Check, FileText } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { HistoryEntry } from '../types';

export const HistoryView: React.FC = () => {
  const { t, dir, language } = useLanguage();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<HistoryEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('translation_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  const saveHistory = (newHistory: HistoryEntry[]) => {
    setHistory(newHistory);
    localStorage.setItem('translation_history', JSON.stringify(newHistory));
  };

  const deleteEntry = (id: string) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المجموعة؟' : 'Are you sure you want to delete this batch?')) {
      const newHistory = history.filter(h => h.id !== id);
      saveHistory(newHistory);
      if (selectedBatch?.id === id) setSelectedBatch(null);
    }
  };

  const startEditing = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditValue(entry.title);
  };

  const saveTitle = (id: string) => {
    const newHistory = history.map(h => h.id === id ? { ...h, title: editValue } : h);
    saveHistory(newHistory);
    setEditingId(null);
    if (selectedBatch?.id === id) setSelectedBatch({ ...selectedBatch, title: editValue });
  };

  const copyText = async (text: string, uniqueId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(uniqueId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (selectedBatch) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setSelectedBatch(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors mb-8 font-bold"
        >
          {dir === 'rtl' ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          <span>{t('backToHistory')}</span>
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-[Cairo]">{selectedBatch.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{new Date(selectedBatch.date).toLocaleString()}</p>
          </div>
          <span className="px-4 py-1.5 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full font-bold text-sm">
            {selectedBatch.items.length} {t('pagesLoaded')}
          </span>
        </div>

        <div className="space-y-8">
          {selectedBatch.items.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-2xl">
              <div className="p-4 bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-brand-600 text-white rounded-lg font-black text-xs">{(idx + 1).toString().padStart(2, '0')}</span>
                  <h3 className="font-bold text-gray-700 dark:text-gray-200 truncate max-w-[200px] sm:max-w-md">{item.fileName}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x rtl:md:divide-x-reverse divide-gray-200 dark:divide-slate-800">
                {/* Extraction */}
                <div className="p-6 flex flex-col min-h-[250px]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">{t('extracted')}</span>
                    <button 
                      onClick={() => copyText(item.extracted, `ext-${idx}`)}
                      className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors"
                    >
                      {copiedId === `ext-${idx}` ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="flex-1 bg-gray-50/50 dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                    <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-300 whitespace-pre-wrap font-mono">
                      {item.extracted}
                    </p>
                  </div>
                </div>

                {/* Translation */}
                <div className="p-6 flex flex-col min-h-[250px]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black uppercase text-brand-600/60 tracking-widest">{t('translated')}</span>
                    <button 
                      onClick={() => copyText(item.translated, `tra-${idx}`)}
                      className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors"
                    >
                      {copiedId === `tra-${idx}` ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <div className="flex-1 bg-brand-50/20 dark:bg-brand-900/5 p-4 rounded-2xl border border-brand-100/50 dark:border-brand-900/20">
                    <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                      {item.translated}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl text-brand-600 dark:text-brand-400">
          <History size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white font-[Cairo]">{t('historyTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('historySubtitle')}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/30 dark:bg-slate-950/10">
          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-xl ring-8 ring-slate-50 dark:ring-slate-900/50">
            <History className="w-12 h-12" />
          </div>
          <div>
            <p className="text-lg font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">{t('noHistory')}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((entry, index) => (
            <div 
              key={entry.id} 
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all group"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded">
                    {t('batchPrefix')} #{(history.length - index).toString().padStart(2, '0')}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditing(entry); }}
                      className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {editingId === entry.id ? (
                  <div className="mb-4 flex gap-2">
                    <input 
                      type="text" 
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveTitle(entry.id)}
                      className="flex-1 bg-gray-50 dark:bg-slate-800 border border-brand-200 dark:border-brand-900 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button onClick={() => saveTitle(entry.id)} className="bg-brand-600 text-white p-1 rounded-lg">
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2 line-clamp-1">{entry.title}</h3>
                )}

                <p className="text-xs text-slate-400 mb-6 flex items-center gap-1">
                  <FileText size={12} />
                  {entry.items.length} {t('pagesLoaded')} • {new Date(entry.date).toLocaleDateString()}
                </p>

                <button 
                  onClick={() => setSelectedBatch(entry)}
                  className="w-full py-3 bg-gray-50 dark:bg-slate-800/50 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-brand-600 dark:text-brand-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  {t('viewDetails')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
