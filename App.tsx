import React, { useState, useRef } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { Navbar } from './components/Navbar';
import { ResultCard } from './components/ResultCard';
import { UploadedImage } from './types';
import { translateMangaPage } from './services/geminiService';
import { Upload, Image as ImageIcon, Sparkles, Copy, Play, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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
              const imageFile = new File([fileData], filename, { type: 'image/png' }); // Defaulting type to png/blob type
              newImages.push(processFile(imageFile));
            }
          } catch (e) {
            console.error("Error unzipping", e);
            alert(`Failed to unzip ${file.name}`);
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

  const handleProcess = async (id: string) => {
    const imageToProcess = images.find((img) => img.id === id);
    if (!imageToProcess) return;

    // Update status to processing
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status: 'processing', error: undefined } : img))
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

      // Call Gemini API
      const result = await translateMangaPage(base64, imageToProcess.file.type);

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
            ? { ...img, status: 'error', error: 'Failed to translate image. Please try again.' }
            : img
        )
      );
    }
  };

  const handleProcessAll = async () => {
    setIsBulkProcessing(true);
    const idleImages = images.filter(img => img.status === 'idle');
    
    // Process sequentially to be safe with rate limits and state updates
    for (const img of idleImages) {
      await handleProcess(img.id);
    }
    setIsBulkProcessing(false);
  };

  const handleCopyAll = async () => {
    const successImages = images.filter(img => img.status === 'success' && img.result);
    if (successImages.length === 0) return;

    const allText = successImages.map(img => 
      `--- Page: ${img.file.name} ---\n\n${img.result?.translated}\n`
    ).join('\n====================\n\n');

    try {
      await navigator.clipboard.writeText(allText);
      alert(`Copied ${successImages.length} pages to clipboard!`);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const clearAll = () => {
    if(window.confirm("Are you sure you want to clear all images?")) {
      setImages([]);
    }
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Manga<span className="text-brand-500">Lens</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Upload raw Manga/Manhwa pages (or a ZIP file). <br/>
              AI extracts text and translates it using strict Scanlation formatting.
            </p>
          </div>

          {/* Action Toolbar */}
          {images.length > 0 && (
            <div className="sticky top-20 z-40 mb-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center space-x-2">
                <ImageIcon size={20} className="text-brand-500" />
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {images.length} Page{images.length !== 1 ? 's' : ''} Loaded
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={clearAll}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors font-medium text-sm"
                >
                  <Trash2 size={16} />
                  <span>Clear</span>
                </button>

                <button
                  onClick={handleCopyAll}
                  disabled={!images.some(i => i.status === 'success')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy size={16} />
                  <span>Copy All Translations</span>
                </button>

                <button
                  onClick={handleProcessAll}
                  disabled={isBulkProcessing || !images.some(i => i.status === 'idle')}
                  className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-md hover:shadow-lg transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkProcessing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                  <span>Translate All Pending</span>
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
                  Click to upload Images or ZIP
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  JPG, PNG, WEBP, or ZIP archive containing images
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
                 {/* Provide a dedicated translate button if it hasn't started yet and not bulk processing */}
                 {img.status === 'idle' && !isBulkProcessing && (
                   <div className="absolute top-4 right-4 z-10">
                      <button
                        onClick={() => handleProcess(img.id)}
                        className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all font-medium"
                      >
                        <Sparkles size={16} />
                        <span>Translate</span>
                      </button>
                   </div>
                 )}
                <ResultCard item={img} />
              </div>
            ))}

            {images.length === 0 && (
              <div className="text-center py-20 opacity-50">
                <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
                  <Sparkles size={48} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No images uploaded yet.</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;