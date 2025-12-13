import React, { useState } from 'react';
import { ArrowLeft, Check, UploadCloud } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { StoreProduct, ViewType } from '../types';

interface PaymentViewProps {
  plan: StoreProduct;
  onBack: () => void;
  onConfirm: () => void;
}

export const PaymentView: React.FC<PaymentViewProps> = ({ plan, onBack, onConfirm }) => {
  const { t } = useLanguage();
  const [method, setMethod] = useState<'binance' | 'vodafone' | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (receipt) {
      // Simulate submission
      setIsSubmitted(true);
      setTimeout(() => {
        onConfirm();
      }, 3000);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('paymentSubmitted')}</h2>
        <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-right-4 duration-300">
      <button 
        onClick={onBack}
        className="flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-6"
      >
        <ArrowLeft size={20} className="rtl:rotate-180" />
        <span className="ms-2 font-medium">{t('backToStore')}</span>
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('paymentTitle')}</h2>
          <div className="mt-2 flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {plan.type === 'subscription' ? 'Plan:' : 'Pack:'} <span className="font-semibold text-gray-800 dark:text-gray-200">{t(plan.nameKey)}</span>
            </span>
            <span className="text-brand-600 dark:text-brand-400 font-bold text-lg">{plan.price}</span>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('paymentMethod')}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setMethod('binance')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                method === 'binance' 
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400' 
                  : 'border-gray-200 dark:border-slate-700 hover:border-yellow-300 dark:hover:border-yellow-700'
              }`}
            >
              <div className="w-10 h-10 bg-[#F3BA2F] rounded-full flex items-center justify-center text-black font-bold text-xs">
                <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current"><path d="M16 0L20.8 4.8V9.6L16 4.8L11.2 9.6V4.8L16 0ZM4.8 11.2L9.6 16L4.8 20.8L0 16L4.8 11.2ZM16 32L11.2 27.2V22.4L16 27.2L20.8 22.4V27.2L16 32ZM27.2 20.8L22.4 16L27.2 11.2L32 16L27.2 20.8ZM16 11.2L20.8 16L16 20.8L11.2 16L16 11.2Z" /></svg>
              </div>
              <span className="font-semibold">{t('binance')}</span>
            </button>

            <button
              onClick={() => setMethod('vodafone')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                method === 'vodafone' 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400' 
                  : 'border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700'
              }`}
            >
              <div className="w-10 h-10 bg-[#E60000] rounded-full flex items-center justify-center text-white font-bold text-lg">V</div>
              <span className="font-semibold">{t('vodafoneCash')}</span>
            </button>
          </div>

          {method && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-gray-50 dark:bg-slate-950 rounded-xl p-6 mb-6 text-center border border-gray-200 dark:border-slate-800">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{t('sendTo')}</p>
                <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white select-all">
                  {method === 'binance' ? '982382490' : '01044101707'}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('uploadReceipt')}</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-900/50 hover:bg-gray-100 dark:hover:bg-slate-900 hover:border-brand-400 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {receipt ? (
                           <div className="flex flex-col items-center text-green-600 dark:text-green-400">
                             <Check size={32} className="mb-2" />
                             <p className="text-sm font-medium">{receipt.name}</p>
                           </div>
                        ) : (
                          <>
                            <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span></p>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!receipt}
                  className="w-full py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('confirmPayment')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};