import React, { useState, useRef, useEffect } from 'react';
import { ResultCard } from './ResultCard';
import { UploadedImage, TargetLanguage } from '../types';
import { translateMangaPage } from '../services/geminiService';
import { useLanguage } from './LanguageContext';
import { Upload, Image as ImageIcon, Sparkles, Copy, Play, Trash2, Languages, FileText, Quote } from 'lucide-react';
import JSZip from 'jszip';

export const HomeView: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('English');
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { t } = useLanguage();
  
  // Queue management refs
  const imagesRef = useRef(images);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const requestTimestampsRef = useRef<number[]>([]);

  // Keep imagesRef in sync with state for the async processor
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsQueueRunning(true);

    while (queueRef.current.length > 0) {
      // RATE LIMIT LOGIC: Max 5 requests per minute
      const now = Date.now();
      // Keep only timestamps within the last 60 seconds
      requestTimestampsRef.current = requestTimestampsRef.current.filter(t => now - t < 60000);

      if (requestTimestampsRef.current.length >= 5) {
        // Find the oldest request in the current window
        const oldestRequestTime = requestTimestampsRef.current[0];
        const timeSinceOldest = now - oldestRequestTime;
        const waitTime = 60000 - timeSinceOldest + 1000; // Add 1s buffer

        if (waitTime > 0) {
          const nextId = queueRef.current[0]; // Peek at next image ID
          
          // Set status to waiting with cooldown
          setImages((prev) => 
            prev.map((img) => img.id === nextId ? { ...img, status: 'waiting', cooldownEndsAt: now + waitTime } : img)
          );

          // Wait for the cooldown
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // After waiting, loop continues and re-evaluates
          continue; 
        }
      }

      const nextId = queueRef.current.shift();
      if (nextId) {
        // Record timestamp of this new request
        requestTimestampsRef.current.push(Date.now());
        await processImage(nextId);
      }
    }

    isProcessingRef.current = false;
    setIsQueueRunning(false);
  };

  const processImage = async (id: string) => {
    const imageToProcess = imagesRef.current.find((img) => img.id === id);
    if (!imageToProcess) return;

    // Update status to processing (clearing any waiting status)
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status: 'processing', error: undefined, cooldownEndsAt: undefined } : img))
    );

    try {
      // Convert to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageToProcess.file);
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      // Call Gemini API with the selected Target Language and Symbol preference
      const result = await translateMangaPage(base64, imageToProcess.file.type, targetLanguage, useSymbols);

      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, status: 'success', result }
            : img
        )
      );
    } catch (error) {
      console.error(error);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, status: 'error', error: t('unknownError') }
            : img
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
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];
      const newImages: UploadedImage[] = [];

      for (const file of files) {
        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
          try {
            const zip = new JSZip();
            const zipContents = await zip.loadAsync(file);
            
            // Get all files, filter for images, and sort by name to ensure correct order
            const imageFiles = Object.keys(zipContents.files)
              .filter(filename => !zipContents.files[filename].dir && /\.(jpg|jpeg|png|webp)$/i.test(filename))
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

            for (const filename of imageFiles) {
              const fileData = await zipContents.files[filename].async('blob');
              // Detect mime type based on extension
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSingleTranslate = (id: string) => {
    // Add to queue (end) and process
    if (!queueRef.current.includes(id)) {
        queueRef.current.push(id);
        setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'queued' } : img));
        processQueue();
    }
  };

  const handleRetranslate = (id: string) => {
    // Logic: Add to FRONT of queue to prioritize after current one finishes
    queueRef.current = queueRef.current.filter(qid => qid !== id);
    queueRef.current.unshift(id);
    
    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'queued' } : img));
    processQueue();
  };

  const handleProcessAll = () => {
    const idleImages = images.filter(img => img.status === 'idle');
    const idleIds = idleImages.map(img => img.id);
    
    // Add all to queue
    queueRef.current.push(...idleIds);
    
    // Update status to queued
    setImages(prev => prev.map(img => idleIds.includes(img.id) ? { ...img, status: 'queued' } : img));
    
    processQueue();
  };

  const handleCopyAll = async () => {
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
      
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight font-[Cairo]">
          {t('appTitle')}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto whitespace-pre-line">
          {t('subtitle')}
        </p>
      </div>

      {/* Action Toolbar */}
      {images.length > 0 && (
        <div className="sticky top-20 z-40 mb-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <ImageIcon size={20} className="text-brand-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {images.length} {t('pagesLoaded')}
            </span>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={clearAll}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors font-medium text-sm"
            >
              <Trash2 size={16} />
              <span>{t('clear')}</span>
            </button>

            <button
              onClick={() => setUseSymbols(!useSymbols)}
              className={`flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 rounded-lg transition-colors font-medium text-sm border ${
                useSymbols 
                  ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/40' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              <Quote size={16} className={useSymbols ? 'fill-current' : ''} />
              <span>{t('useSymbols')}</span>
            </button>

            <div className="flex items-center space-x-2 rtl:space-x-reverse bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border-2 border-brand-100 dark:border-slate-700 shadow-sm transition-all hover:border-brand-300 dark:hover:border-slate-600 group">
              <Languages size={18} className="text-brand-600 dark:text-brand-400" />
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value as TargetLanguage)}
                className="bg-transparent border-none text-base font-semibold text-gray-800 dark:text-gray-100 focus:ring-0 cursor-pointer min-w-[100px] [&>option]:text-gray-900 [&>option]:bg-white dark:[&>option]:bg-slate-800 dark:[&>option]:text-gray-100"
              >
                <option value="English">English</option>
                <option value="Arabic">Arabic</option>
                <option value="French">French</option>
                <option value="German">German</option>
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
        </div>
      )}

      {/* Upload Area */}
      <div className="mb-12">
        <div 
          className="relative group border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-3xl p-10 bg-white dark:bg-slate-900/50 hover:border-brand-500 dark:hover:border-brand-500 transition-all cursor-pointer text-center"
          onClick={() => fileInputRef.current?.click()}
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

      {/* Image List */}
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