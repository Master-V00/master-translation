
import React, { useState } from 'react';
import { 
  Upload, 
  Trash2, 
  ExternalLink, 
  AlertCircle,
  Loader2,
  ChevronUp,
  BookOpen,
  Lock,
  FolderOpen
} from 'lucide-react';
import JSZip from 'jszip';
import { MangaImage } from '../types';
import { useLanguage } from './LanguageContext';

export const MangaReaderView: React.FC = () => {
  const { t, language } = useLanguage();
  const [images, setImages] = useState<MangaImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const naturalSortImages = (imgs: MangaImage[]) => {
    return [...imgs].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  const parseDriveLink = (url: string) => {
    const fileMatch = url.match(/\/file\/d\/([-\w]{25,})/);
    const folderMatch = url.match(/\/folders\/([-\w]{25,})/);
    const idMatch = url.match(/id=([-\w]{25,})/);
    const plainIdMatch = url.match(/^([-\w]{25,})$/);

    if (fileMatch) return { id: fileMatch[1], type: 'file' };
    if (folderMatch) return { id: folderMatch[1], type: 'folder' };
    if (idMatch) return { id: idMatch[1], type: 'file' };
    if (plainIdMatch) return { id: plainIdMatch[1], type: 'file' };
    
    return null;
  };

  const getDirectFileLink = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

  const processFiles = async (files: FileList | File[]) => {
    setLoading(true);
    setError(null);
    const newImages: MangaImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
          const zip = new JSZip();
          const contents = await zip.loadAsync(file);
          const zipFiles = Object.values(contents.files);

          for (const zipFile of zipFiles as any[]) {
            if (!zipFile.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(zipFile.name)) {
              const blob = await zipFile.async('blob');
              newImages.push({
                id: crypto.randomUUID(),
                name: zipFile.name.split('/').pop() || zipFile.name,
                url: URL.createObjectURL(blob),
                size: blob.size,
              });
            }
          }
        } 
        else if (file.type.startsWith('image/')) {
          newImages.push({
            id: crypto.randomUUID(),
            name: file.name,
            url: URL.createObjectURL(file),
            size: file.size,
          });
        }
      }

      if (newImages.length === 0) {
        throw new Error(language === 'ar' ? 'لم يتم العثور على صور صالحة.' : 'No valid images found.');
      }

      setImages(prev => naturalSortImages([...prev, ...newImages]));
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === 'ar' ? 'حدث خطأ أثناء معالجة الملفات.' : 'Error processing files.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const clearImages = () => {
    images.forEach(img => {
      if (img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });
    setImages([]);
    setFailedImages(new Set());
    setError(null);
  };

  const handleDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const driveInfo = parseDriveLink(driveUrl);
    
    if (!driveInfo) {
      setError(language === 'ar' ? 'رابط جوجل درايف غير صالح.' : 'Invalid Google Drive link.');
      return;
    }

    setLoading(true);
    setError(null);

    if (driveInfo.type === 'folder') {
      try {
        // Attempt to fetch folder contents by downloading it as a ZIP
        // Note: This often hits CORS issues unless a proxy is used or it's a very specific public direct link.
        // We attempt it as requested.
        const zipUrl = `https://drive.google.com/uc?id=${driveInfo.id}&export=download`;
        const response = await fetch(zipUrl);
        
        if (!response.ok) throw new Error("CORS_OR_PRIVATE");

        const blob = await response.blob();
        const zipFile = new File([blob], "drive_folder.zip", { type: "application/zip" });
        await processFiles([zipFile]);
        setDriveUrl('');
      } catch (err) {
        setError(language === 'ar' 
          ? 'لا يمكن تحميل المجلد مباشرة بسبب قيود جوجل (CORS) أو لأن المجلد خاص. يرجى رفع ملف ZIP يدوياً أو استخدام روابط الصور المنفردة.' 
          : 'Cannot download folder directly due to Google restrictions (CORS) or the folder is private. Please upload a ZIP file manually or use individual image links.');
      } finally {
        setLoading(false);
      }
    } else {
      // It's a file
      const directUrl = getDirectFileLink(driveInfo.id);
      const newImage: MangaImage = {
        id: crypto.randomUUID(),
        name: `Google Drive Image - ${driveUrl.substring(0, 20)}...`,
        url: directUrl,
        size: 0,
      };

      setImages(prev => [...prev, newImage]);
      setDriveUrl('');
      setLoading(false);
    }
  };

  const handleImageError = (id: string) => {
    setFailedImages(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-2xl text-brand-600 dark:text-brand-400">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white font-[Cairo]">{t('navMangaReader')}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t('mangaReaderSubtitle')}</p>
          </div>
        </div>
        {images.length > 0 && (
          <button 
            onClick={clearImages}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg shadow-red-500/20 font-bold"
          >
            <Trash2 size={18} />
            <span>{t('clear')}</span>
          </button>
        )}
      </div>

      {images.length === 0 && !loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-12">
          <div className="text-center space-y-4 max-w-2xl">
            <div className="w-32 h-32 mx-auto mb-6 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400">
                <BookOpen size={64} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white font-[Cairo]">{t('mangaReaderWelcome')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
              {t('mangaReaderDesc')}
            </p>
          </div>

          <div className="w-full grid md:grid-cols-2 gap-8">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="group relative border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-brand-500 dark:hover:border-brand-500"
            >
              <input 
                type="file" 
                multiple 
                accept="image/*,.zip" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="bg-brand-500/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <Upload className="text-brand-500" size={48} />
              </div>
              <h3 className="text-2xl font-black mb-2 text-slate-800 dark:text-slate-100">{t('uploadPrompt')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center font-medium">
                {t('uploadDesc')}
              </p>
            </div>

            <div className="p-12 border border-gray-200 dark:border-slate-800 rounded-[2.5rem] bg-white dark:bg-slate-900/20 shadow-sm flex flex-col justify-center">
              <div className="bg-green-500/10 p-6 rounded-full w-fit mb-6 mx-auto">
                <FolderOpen className="text-green-500" size={48} />
              </div>
              <h3 className="text-2xl font-black mb-6 text-center text-slate-800 dark:text-slate-100">{t('importDrive')}</h3>
              <form onSubmit={handleDriveSubmit} className="space-y-4">
                <input 
                  type="url" 
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder={language === 'ar' ? 'رابط ملف أو مجلد درايف...' : 'Drive folder or file link...'}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-slate-900 dark:white outline-none transition-all focus:ring-2 focus:ring-green-500/50"
                />
                <button 
                  type="submit"
                  className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-green-500/20 active:scale-95"
                >
                  {t('importNow')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-24 gap-6">
          <div className="relative">
             <Loader2 className="animate-spin text-brand-500" size={64} />
             <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen size={24} className="text-brand-500" />
             </div>
          </div>
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200 animate-pulse font-[Cairo]">
            {language === 'ar' ? 'جاري معالجة الصور...' : 'Processing images...'}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-4 p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 mb-8 animate-in slide-in-from-top-2">
          <AlertCircle size={24} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {images.length > 0 && !loading && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white font-[Cairo]">{language === 'ar' ? 'المعاينة' : 'Preview'}</h2>
              <p className="text-slate-500 font-medium">{images.length} {t('pagesLoaded')}</p>
            </div>
            <div className="flex gap-3">
               <label className="cursor-pointer flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-brand-500/20 active:scale-95">
                <Upload size={18} />
                <span>{language === 'ar' ? 'إضافة صور' : 'Add Images'}</span>
                <input type="file" multiple accept="image/*,.zip" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-slate-100/50 dark:bg-black/40 rounded-[3rem] overflow-hidden p-4 sm:p-8 min-h-[500px] border border-gray-200 dark:border-slate-800 shadow-inner">
            <div className="w-full max-w-[1000px] flex flex-col space-y-0 shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {images.map((img, index) => (
                <div key={img.id} className="relative group w-full bg-slate-200 dark:bg-slate-900 min-h-[200px]">
                  {failedImages.has(img.id) ? (
                    <div className="w-full p-12 flex flex-col items-center justify-center text-center gap-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                      <Lock size={48} />
                      <div>
                        <p className="text-lg font-black font-[Cairo]">
                          {language === 'ar' ? 'هذا الملف خاص (Private)' : 'This file is Private'}
                        </p>
                        <p className="text-sm font-medium opacity-80 mt-1 max-w-md">
                          {language === 'ar' 
                            ? 'يرجى تغيير إعدادات الخصوصية في جوجل درايف إلى "أي شخص لديه الرابط" (Anyone with the link).' 
                            : 'Please change the sharing settings in Google Drive to "Anyone with the link".'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={img.url} 
                      alt={img.name} 
                      loading="lazy"
                      className="w-full h-auto block transition-opacity duration-300"
                      onError={() => handleImageError(img.id)}
                      style={{ display: 'block' }}
                    />
                  )}
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                    {index + 1} / {images.length}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pb-12">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl shadow-2xl shadow-brand-500/30 transition-all hover:-translate-y-1 active:scale-95"
            >
              <ChevronUp size={20} />
              {language === 'ar' ? 'العودة للأعلى' : 'Back to top'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
