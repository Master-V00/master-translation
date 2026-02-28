import React, { useEffect } from 'react';
import { Check, Star, Zap, Crown, Coins, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { StoreProduct } from '../types';

interface StoreViewProps {
  onSubscribe: (product: StoreProduct) => void;
  scrollToPacks?: boolean;
}

export const StoreView: React.FC<StoreViewProps> = ({ onSubscribe, scrollToPacks }) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (scrollToPacks) {
      const element = document.getElementById('credit-packs');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [scrollToPacks]);

  const plans: StoreProduct[] = [
    {
      id: 'pro',
      type: 'subscription',
      nameKey: 'planPro',
      price: '20$',
      durationKey: 'duration1Month',
      features: ['featureUnlimited', 'featureMoreLangs', 'featureSymbols1']
    },
    {
      id: 'pro-max',
      type: 'subscription',
      nameKey: 'planProMax',
      price: '30$',
      durationKey: 'duration2Months',
      features: ['featureUnlimited', 'featureMoreLangs', 'featureSymbols2']
    },
    {
      id: 'master',
      type: 'subscription',
      nameKey: 'planMaster',
      price: '40$',
      durationKey: 'duration3Months',
      features: ['featureUnlimited', 'featureMoreLangs', 'featureSymbols3']
    }
  ];

  const packs: StoreProduct[] = [
    {
      id: 'pack-25',
      type: 'pack',
      nameKey: 'pack25',
      price: '1$',
      credits: 50,
      features: ['featurePack25', 'featureNoExpiry']
    },
    {
      id: 'pack-50',
      type: 'pack',
      nameKey: 'pack50',
      price: '2$',
      credits: 100,
      features: ['featurePack50', 'featureNoExpiry']
    },
    {
      id: 'pack-100',
      type: 'pack',
      nameKey: 'pack100',
      price: '5$',
      credits: 300,
      features: ['featurePack100', 'featureNoExpiry']
    }
  ];

  const getPlanIcon = (id: string) => {
    switch(id) {
      case 'pro': return <Star size={32} className="text-blue-500" />;
      case 'pro-max': return <Zap size={32} className="text-purple-500" />;
      case 'master': return <Crown size={32} className="text-amber-500" />;
      default: return <Star />;
    }
  };

  const getPlanGradient = (id: string) => {
    switch(id) {
      case 'pro': return 'from-blue-500 to-cyan-500';
      case 'pro-max': return 'from-purple-500 to-pink-500';
      case 'master': return 'from-amber-400 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">{t('storeTitle')}</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400">{t('storeSubtitle')}</p>
      </div>

      {/* Subscriptions Section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
          <Crown className="me-2 text-brand-600" />
          {t('sectionSubscriptions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className="relative group hover:-translate-y-2 transition-transform duration-300">
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${getPlanGradient(plan.id)} rounded-2xl opacity-20 group-hover:opacity-60 blur transition duration-300`} />
              
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-xl bg-gray-50 dark:bg-slate-800 shadow-sm`}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <div className="text-right">
                    <span className="block text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t(plan.durationKey!)}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t(plan.nameKey)}</h3>

                <div className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="ms-3 text-gray-600 dark:text-gray-300 text-sm font-medium">{t(feature)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onSubscribe(plan)}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r ${getPlanGradient(plan.id)} hover:shadow-xl hover:brightness-110 transition-all active:scale-95`}
                >
                  {t('subscribe')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coin Packs Section */}
      <div id="credit-packs" className="scroll-mt-24">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
          <Coins className="me-2 text-yellow-500" />
          {t('sectionPacks')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packs.map((pack) => (
            <div key={pack.id} className="relative group hover:-translate-y-1 transition-transform duration-300">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-10 group-hover:opacity-40 blur transition duration-300" />
              
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t(pack.nameKey)}</h3>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-bold border border-yellow-200 dark:border-yellow-800">
                    {pack.credits} {t('credits')}
                  </div>
                </div>

                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{pack.price}</span>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  {pack.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <ImageIcon size={16} className="text-gray-400 me-2" />
                      <span className="text-gray-600 dark:text-gray-300 text-sm">{t(feature)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onSubscribe(pack)}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-brand-600 dark:text-white border-2 border-brand-100 dark:border-brand-900 hover:bg-brand-50 dark:hover:bg-brand-900/50 transition-colors"
                >
                  {t('buyNow')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};