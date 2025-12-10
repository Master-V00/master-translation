import React from 'react';
import { UploadedImage } from '../types';
import { Loader2, AlertCircle, Copy, Check, RotateCcw, Clock } from 'lucide-react';

interface ResultCardProps {
  item: UploadedImage;
  onRetranslate?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, onRetranslate }) => {
  const [copiedRaw, setCopiedRaw] = React.useState(false);
  const [copiedTrans, setCopiedTrans] = React.useState(false);

  const copyToClipboard = async (text: string, isTrans: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isTrans) {
        setCopiedTrans(true);
        setTimeout(() => setCopiedTrans(false), 2000);
      } else {
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800 transition-all duration-300 hover:shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-gray-200 dark:divide-slate-800">
        
        {/* Image Section */}
        <div className="lg:col-span-4 bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 min-h-[400px]">
          <img 
            src={item.previewUrl} 
            alt="Uploaded Manga" 
            className="max-h-[600px] w-auto object-contain rounded-lg shadow-sm"
          />
        </div>

        {/* Content Section */}
        <div className="lg:col-span-8 p-6 flex flex-col h-full">
          
          {/* Status Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate w-2/3">
              {item.file.name}
            </h3>
            <div className="flex items-center space-x-2">
              {item.status === 'queued' && (
                <span className="flex items-center text-amber-600 dark:text-amber-400 text-sm font-medium bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                  <Clock className="mr-2 h-4 w-4 animate-pulse" />
                  Queued
                </span>
              )}
              {item.status === 'processing' && (
                <span className="flex items-center text-brand-600 dark:text-brand-400 text-sm font-medium bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Translating...
                </span>
              )}
              {item.status === 'error' && (
                <span className="flex items-center text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Error
                </span>
              )}
              {item.status === 'success' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onRetranslate}
                    className="flex items-center text-gray-600 dark:text-gray-300 text-xs font-medium bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                    title="Retranslate this page (Priority)"
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    Retranslate
                  </button>
                  <span className="flex items-center text-green-600 dark:text-green-400 text-sm font-medium bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                    <Check className="mr-2 h-4 w-4" />
                    Done
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {(item.status === 'success' || (item.status === 'queued' && item.result)) && item.result ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 h-full ${item.status === 'queued' ? 'opacity-50 grayscale' : ''}`}>
              
              {/* Extracted Text Column */}
              <div className="flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Extracted Text
                  </span>
                  <button 
                    onClick={() => copyToClipboard(item.result!.extracted, false)}
                    className="p-1.5 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                  >
                    {copiedRaw ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="flex-1 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <textarea 
                    readOnly
                    value={item.result.extracted}
                    className="w-full h-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed text-gray-800 dark:text-gray-200 custom-scrollbar font-mono"
                  />
                </div>
              </div>

              {/* Translated Text Column */}
              <div className="flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                    English Translation
                  </span>
                  <button 
                    onClick={() => copyToClipboard(item.result!.translated, true)}
                    className="p-1.5 text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
                  >
                    {copiedTrans ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="flex-1 p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/30 overflow-hidden">
                  <textarea 
                    readOnly
                    value={item.result.translated}
                    className="w-full h-full bg-transparent resize-none focus:outline-none text-sm leading-relaxed text-gray-800 dark:text-gray-200 custom-scrollbar font-mono"
                  />
                </div>
              </div>

            </div>
          ) : null}

          {item.status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
              <span>{item.error || "An unknown error occurred during translation."}</span>
              <button 
                onClick={onRetranslate}
                className="ml-4 flex items-center space-x-1 text-xs bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 px-3 py-1 rounded shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            </div>
          )}
          
          {item.status === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
              <div className="w-full max-w-md bg-gray-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-500 h-1.5 rounded-full animate-[loading_1.5s_ease-in-out_infinite] w-1/2"></div>
              </div>
              <p className="text-sm animate-pulse">Analyzing visuals and translating...</p>
            </div>
          )}
          
          {item.status === 'queued' && !item.result && (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
               <Clock size={48} className="text-amber-300 dark:text-amber-800/50 opacity-50" />
               <p className="text-sm">Queued for translation...</p>
             </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};