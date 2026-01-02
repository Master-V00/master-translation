import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { UploadedFile, MergeMode, CropSubMode, OutputFormat, TranslationKey } from '../types';
import { useLanguage } from './LanguageContext'; 
import JSZip from 'jszip';
import { useTheme } from './ThemeContext';
import { UploadIcon, TrashIcon, DownloadIcon, XCircleIcon, ScissorIcon } from './icons';
import { Loader2, Layers, Maximize2, Scissors, Image as ImageIcon, Settings2, Palette, Ruler, Play, RotateCcw } from 'lucide-react';


const EditorApp: React.FC = () => {
    const { t, dir, language } = useLanguage();
    const { isDark } = useTheme();

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState(0);
    const [mergedImages, setMergedImages] = useState<string[]>([]);
    const [mergeMode, setMergeMode] = useState<MergeMode>(MergeMode.PAGES);
    const [cropSubMode, setCropSubMode] = useState<CropSubMode>(CropSubMode.SEPARATE);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>(OutputFormat.PNG);
    
    const [pagesPerImage, setPagesPerImage] = useState(2);
    const [separatorColor, setSeparatorColor] = useState('#FFFFFF');
    const [separatorHeight, setSeparatorHeight] = useState(10);
    const [maxHeightPixels, setMaxHeightPixels] = useState(8000);

    const [allCropPoints, setAllCropPoints] = useState<Record<string, number[]>>({});
    const cropImageRef = useRef<HTMLImageElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const isRtl = useMemo(() => dir === 'rtl', [dir]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(Array.from(e.target.files));
    };

    // هذا هو المنطق المأخوذ من الكود الشغال (HomeView)
const processFiles = async (files: File[]) => {
    setIsLoading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
        // التحقق من ملف الـ ZIP
        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
            try {
                const zip = new JSZip();
                const content = await zip.loadAsync(file);
                
                // ترتيب الملفات عشان الصفحات تيجي ورا بعضها صح
                const fileNames = Object.keys(content.files)
                    .filter(name => /\.(jpe?g|png|webp)$/i.test(name))
                    .sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));

                for (const fileName of fileNames) {
                    const zipEntry = content.files[fileName];
                    if (!zipEntry.dir) {
                        const blob = await zipEntry.async('blob');
                        const imgFile = new File([blob], fileName, { type: `image/${fileName.split('.').pop()}` });
                        newFiles.push({
                            id: `${fileName}-${Date.now()}-${Math.random()}`,
                            file: imgFile,
                            previewUrl: URL.createObjectURL(imgFile),
                        });
                    }
                }
            } catch (err) {
                console.error("ZIP Error:", err);
                alert("حدث خطأ أثناء فك ضغط الملف");
            }
        } 
        // الصور العادية
        else if (file.type.startsWith('image/')) {
            newFiles.push({
                id: `${file.name}-${file.lastModified}-${Math.random()}`,
                file,
                previewUrl: URL.createObjectURL(file),
            });
        }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsLoading(false);
};

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        setDragOver(false);
        if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
    };
    
    const removeFile = (id: string, index: number) => {
        const fileToRemove = uploadedFiles.find(f => f.id === id);
        if (fileToRemove) URL.revokeObjectURL(fileToRemove.previewUrl);
        setUploadedFiles(files => files.filter(file => file.id !== id));
        
        const newPoints = { ...allCropPoints };
        delete newPoints[id];
        setAllCropPoints(newPoints);

        if (activeFileIndex >= index && activeFileIndex > 0) {
            setActiveFileIndex(activeFileIndex - 1);
        }
    };

    const clearAll = () => {
        uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
        setUploadedFiles([]);
        setMergedImages([]);
        setAllCropPoints({});
        setActiveFileIndex(0);
        setError(null);
    };

    const handleCropImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (!cropImageRef.current || uploadedFiles.length === 0) return;
        const activeFileId = uploadedFiles[activeFileIndex].id;
        const rect = cropImageRef.current.getBoundingClientRect();
        const y = ((e.clientY - rect.top) / rect.height) * cropImageRef.current.naturalHeight;
        
        setAllCropPoints(prev => {
            const currentPoints = prev[activeFileId] || [];
            return {
                ...prev,
                [activeFileId]: [...currentPoints, Math.round(y)].sort((a, b) => a - b)
            };
        });
    };

    const getFormatExtension = () => {
        switch(outputFormat) {
            case OutputFormat.JPEG: return 'jpg';
            case OutputFormat.WEBP: return 'webp';
            default: return 'png';
        }
    };

    const handleProcess = async () => {
        if (uploadedFiles.length === 0) return;
        setIsLoading(true);
        setError(null);
        setMergedImages([]);

        try {
            const loadedImages = await Promise.all(
                uploadedFiles.map(uploadedFile => 
                    new Promise<{img: HTMLImageElement, id: string}>((resolve, reject) => {
                        const img = new Image();
                        img.src = uploadedFile.previewUrl;
                        img.onload = () => resolve({img, id: uploadedFile.id});
                        img.onerror = () => reject(new Error(`Failed to load: ${uploadedFile.file.name}`));
                    })
                )
            );

            const generatedImages: string[] = [];

            if (mergeMode === MergeMode.CROP) {
                for (const item of loadedImages) {
                    const points = allCropPoints[item.id];
                    if (!points || points.length === 0) continue;
                    const img = item.img;

                    if (cropSubMode === CropSubMode.SEPARATE) {
                        const sortedPoints = [0, ...points, img.height];
                        for (let i = 0; i < sortedPoints.length - 1; i++) {
                            const h = sortedPoints[i+1] - sortedPoints[i];
                            if (h <= 0) continue;
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d')!;
                            ctx.drawImage(img, 0, sortedPoints[i], img.width, h, 0, 0, img.width, h);
                            generatedImages.push(canvas.toDataURL(outputFormat));
                        }
                    } else {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        const segments: {y: number, h: number}[] = [];
                        let currentY = 0;
                        for (let i = 0; i < points.length; i += 2) {
                            const delStart = points[i];
                            const delEnd = points[i+1] || img.height;
                            if (delStart > currentY) {
                                segments.push({y: currentY, h: delStart - currentY});
                            }
                            currentY = delEnd;
                        }
                        if (currentY < img.height) {
                            segments.push({y: currentY, h: img.height - currentY});
                        }
                        const totalHeight = segments.reduce((acc, s) => acc + s.h, 0);
                        canvas.height = totalHeight;
                        const ctx = canvas.getContext('2d')!;
                        let drawY = 0;
                        segments.forEach(s => {
                            ctx.drawImage(img, 0, s.y, img.width, s.h, 0, drawY, img.width, s.h);
                            drawY += s.h;
                        });
                        generatedImages.push(canvas.toDataURL(outputFormat));
                    }
                }
            } else if (mergeMode === MergeMode.PAGES) {
                const chunks = [];
                for (let i = 0; i < loadedImages.length; i += pagesPerImage) {
                    chunks.push(loadedImages.slice(i, i + pagesPerImage).map(l => l.img));
                }
                for (const chunk of chunks) {
                    const canvas = document.createElement('canvas');
                    const maxWidth = Math.max(...chunk.map(img => img.width));
                    const totalHeight = chunk.reduce((sum, img) => sum + img.height, 0) + (Math.max(0, chunk.length - 1) * separatorHeight);
                    canvas.width = maxWidth;
                    canvas.height = totalHeight;
                    const ctx = canvas.getContext('2d')!;
                    ctx.fillStyle = separatorColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    let y = 0;
                    chunk.forEach((img, idx) => {
                        ctx.drawImage(img, (maxWidth - img.width) / 2, y);
                        y += img.height + (idx < chunk.length - 1 ? separatorHeight : 0);
                    });
                    generatedImages.push(canvas.toDataURL(outputFormat));
                }
            } else if (mergeMode === MergeMode.PIXELS) {
                const maxWidth = Math.max(...loadedImages.map(l => l.img.width));
                let canvas = document.createElement('canvas');
                canvas.width = maxWidth;
                canvas.height = maxHeightPixels;
                let ctx = canvas.getContext('2d')!;
                ctx.fillStyle = separatorColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                let currentY = 0;
                for (const item of loadedImages) {
                    const img = item.img;
                    let srcY = 0;
                    while (srcY < img.height) {
                        const h = Math.min(maxHeightPixels - currentY, img.height - srcY);
                        ctx.drawImage(img, 0, srcY, img.width, h, (maxWidth - img.width) / 2, currentY, img.width, h);
                        currentY += h; srcY += h;
                        if (currentY >= maxHeightPixels) {
                            generatedImages.push(canvas.toDataURL(outputFormat));
                            currentY = 0;
                            canvas = document.createElement('canvas');
                            canvas.width = maxWidth; canvas.height = maxHeightPixels;
                            ctx = canvas.getContext('2d')!;
                            ctx.fillStyle = separatorColor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    }
                }
                if (currentY > 0) {
                    const final = document.createElement('canvas');
                    final.width = maxWidth; final.height = currentY;
                    final.getContext('2d')!.drawImage(canvas, 0, 0, maxWidth, currentY, 0, 0, maxWidth, currentY);
                    generatedImages.push(final.toDataURL(outputFormat));
                }
            }
            setMergedImages(generatedImages);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errorLoadingImages' as TranslationKey));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadAll = async () => {
        if (mergedImages.length === 0) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const ext = getFormatExtension();
            mergedImages.forEach((imgSrc, index) => {
                const base64Data = imgSrc.split(',')[1];
                zip.file(`output-${index + 1}.${ext}`, base64Data, { base64: true });
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `manga-export-${Date.now()}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (err) {
            setError(t('errorZipping' as TranslationKey));
        } finally {
            setIsZipping(false);
        }
    };

    const activeCropPoints = useMemo(() => {
        if (!uploadedFiles[activeFileIndex]) return [];
        return allCropPoints[uploadedFiles[activeFileIndex].id] || [];
    }, [allCropPoints, activeFileIndex, uploadedFiles]);

    const resetPointsForActive = () => {
        if (!uploadedFiles[activeFileIndex]) return;
        const newPoints = { ...allCropPoints };
        delete newPoints[uploadedFiles[activeFileIndex].id];
        setAllCropPoints(newPoints);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-500" dir={dir}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Aside Panel: Settings */}
                <aside className={`lg:col-span-4 space-y-6 ${isRtl ? 'lg:order-last' : 'lg:order-first'}`}>
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 p-8">
                        
                        {/* Mode Selection Tabs */}
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-8">
                            <button 
                                onClick={() => { setMergeMode(MergeMode.PAGES); setMergedImages([]); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${mergeMode === MergeMode.PAGES ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <Layers size={14} />
                                {t('mergeByPages' as TranslationKey)}
                            </button>
                            <button 
                                onClick={() => { setMergeMode(MergeMode.PIXELS); setMergedImages([]); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${mergeMode === MergeMode.PIXELS ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <Maximize2 size={14} />
                                {t('mergeByPixels' as TranslationKey)}
                            </button>
                            <button 
                                onClick={() => { setMergeMode(MergeMode.CROP); setMergedImages([]); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${mergeMode === MergeMode.CROP ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                <Scissors size={14} />
                                {t('crop' as TranslationKey)}
                            </button>
                        </div>

                        {/* Options Section */}
                        <div className="space-y-6 text-start">
                            {/* Sub-mode for Crop */}
                            {mergeMode === MergeMode.CROP && (
                                <div className="flex bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-4 animate-in slide-in-from-top-2 duration-300">
                                    <button onClick={() => setCropSubMode(CropSubMode.SEPARATE)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${cropSubMode === CropSubMode.SEPARATE ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md' : 'text-gray-500'}`}>{t('separateCrop' as TranslationKey)}</button>
                                    <button onClick={() => setCropSubMode(CropSubMode.DELETE)} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${cropSubMode === CropSubMode.DELETE ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-md' : 'text-gray-500'}`}>{t('cropAndDelete' as TranslationKey)}</button>
                                </div>
                            )}

                            {/* Image Format */}
                            <div className="group">
                                <label className="block text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 mb-2 tracking-widest">{t('outputFormat' as TranslationKey)}</label>
                                <div className="relative">
                                    <select 
                                        value={outputFormat} 
                                        onChange={e => setOutputFormat(e.target.value as OutputFormat)} 
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-brand-500/20 transition-all"
                                    >
                                        <option value={OutputFormat.PNG}>PNG</option>
                                        <option value={OutputFormat.JPEG}>JPEG</option>
                                        <option value={OutputFormat.WEBP}>WEBP</option>
                                    </select>
                                    <div className="absolute inset-y-0 ltr:right-4 rtl:left-4 flex items-center pointer-events-none text-gray-400">
                                        <Settings2 size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Specific Controls for Pages Mode */}
                            {mergeMode === MergeMode.PAGES && (
                                <div className="animate-in slide-in-from-top-2 duration-300 space-y-6">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 mb-2 tracking-widest">{t('pagesPerImage' as TranslationKey)}</label>
                                        <input 
                                            type="number" 
                                            value={pagesPerImage} 
                                            onChange={e => setPagesPerImage(Math.max(1, parseInt(e.target.value) || 1))} 
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-center text-brand-600 dark:text-brand-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 mb-2 tracking-widest">{t('separatorColor' as TranslationKey)}</label>
                                        <div className="flex gap-3 items-center">
                                            <div className="relative flex-1">
                                                <input 
                                                    type="text" 
                                                    value={separatorColor} 
                                                    onChange={e => setSeparatorColor(e.target.value)} 
                                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-xs font-mono uppercase font-bold"
                                                />
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="color" 
                                                    value={separatorColor} 
                                                    onChange={e => setSeparatorColor(e.target.value)} 
                                                    className="w-12 h-12 p-1.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 cursor-pointer shadow-sm overflow-hidden"
                                                />
                                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white mix-blend-difference opacity-50">
                                                    <Palette size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest">
                                                {language === 'ar' ? 'سمك الخط الفاصل' : 'Separator Thickness'}
                                            </label>
                                            <span className="text-[11px] font-black text-brand-500">{separatorHeight}PX</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Ruler size={14} className="text-slate-400" />
                                            <input 
                                                type="range" 
                                                min="0" max="100" 
                                                value={separatorHeight} 
                                                onChange={e => setSeparatorHeight(parseInt(e.target.value))} 
                                                className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Specific Controls for Pixels Mode */}
                            {mergeMode === MergeMode.PIXELS && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[11px] font-black uppercase text-gray-400 dark:text-slate-500 mb-2 tracking-widest">{t('maxHeightPixels' as TranslationKey)}</label>
                                    <input 
                                        type="number" 
                                        value={maxHeightPixels} 
                                        onChange={e => setMaxHeightPixels(Math.max(100, parseInt(e.target.value) || 100))} 
                                        step="500" 
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-center text-brand-600 dark:text-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>
                            )}

                            {/* Main Action Button */}
                            <div className="pt-4 space-y-4">
                                <button 
                                    onClick={handleProcess} 
                                    disabled={isLoading || uploadedFiles.length === 0} 
                                    className="w-full py-5 bg-brand-600 text-white font-black rounded-3xl hover:bg-brand-700 shadow-2xl shadow-brand-500/30 disabled:opacity-40 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                                >
                                    {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                                    {isLoading ? t('merging' as TranslationKey) : mergeMode === MergeMode.CROP ? t('startCropping' as TranslationKey) : t('mergeImages' as TranslationKey)}
                                </button>
                                
                                {uploadedFiles.length > 0 && (
                                    <button onClick={clearAll} className="w-full py-3 flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all text-xs uppercase tracking-widest">
                                        <XCircleIcon className="w-4 h-4" />
                                        {t('clearAll' as TranslationKey)}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Drag and Drop Zone */}
                    <section
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        className={`relative group border-2 border-dashed rounded-[2.5rem] p-10 text-center transition-all duration-300 overflow-hidden ${dragOver ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-900/10 scale-[1.02]' : 'border-gray-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/20'}`}
                    >
                        <input type="file" multiple accept="image/*,.zip" onChange={handleFileChange} className="hidden" id="file-upload" />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center relative z-10">
                           <div className={`p-5 rounded-full mb-4 transition-all duration-300 ${dragOver ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:text-brand-600 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20'}`}>
                             <UploadIcon className="w-10 h-10"/>
                           </div>
                           <h3 className="text-slate-700 dark:text-slate-200 font-bold mb-1">{t('uploadPrompt' as TranslationKey)}</h3>
                           <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                               {t('orDragAndDrop' as TranslationKey)}
                           </p>
                        </label>
                    </section>
                </aside>

                {/* Main Content Column */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Visual Preview / Crop Editor */}
                    {mergeMode === MergeMode.CROP && uploadedFiles.length > 0 && (
                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-black uppercase text-brand-600 dark:text-brand-400 tracking-tight flex items-center gap-2">
                                        <Scissors size={18} />
                                        {t('crop' as TranslationKey)}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium">{t('clickToCrop' as TranslationKey)}</p>
                                </div>
                                {activeCropPoints.length > 0 && (
                                    <button 
                                        onClick={resetPointsForActive} 
                                        className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-2xl font-black text-xs transition-all shadow-sm active:scale-95"
                                    >
                                        <RotateCcw size={14} />
                                        {t('resetPoints' as TranslationKey)} ({activeCropPoints.length})
                                    </button>
                                )}
                            </div>
                            <div className="relative cursor-crosshair bg-gray-50 dark:bg-slate-950 rounded-[1.5rem] overflow-hidden border border-gray-100 dark:border-slate-800 shadow-inner group/editor">
                                <img
                                    ref={cropImageRef}
                                    src={uploadedFiles[activeFileIndex]?.previewUrl}
                                    onClick={handleCropImageClick}
                                    className="max-w-full h-auto mx-auto select-none"
                                    alt="Editor View"
                                />
                                {activeCropPoints.map((point, i) => {
                                    if (!cropImageRef.current) return null;
                                    const topPercent = (point / cropImageRef.current.naturalHeight) * 100;
                                    
                                    let deleteOverlay = null;
                                    if (cropSubMode === CropSubMode.DELETE && i % 2 === 0 && activeCropPoints[i+1]) {
                                        const endPercent = (activeCropPoints[i+1] / cropImageRef.current.naturalHeight) * 100;
                                        deleteOverlay = (
                                            <div 
                                                className="absolute left-0 right-0 bg-red-500/40 backdrop-blur-[2px] pointer-events-none flex items-center justify-center border-y-2 border-red-600/50 z-10"
                                                style={{ top: `${topPercent}%`, height: `${endPercent - topPercent}%` }}
                                            >
                                                <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg animate-pulse tracking-widest">
                                                    {language === 'ar' ? 'منطقة محذوفة' : 'DELETING AREA'}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <React.Fragment key={i}>
                                            <div 
                                                className={`absolute left-0 right-0 border-t-2 border-dashed ${cropSubMode === CropSubMode.DELETE ? 'border-red-600' : 'border-brand-600'} pointer-events-none z-20`}
                                                style={{ top: `${topPercent}%` }}
                                            >
                                                <div className="absolute ltr:left-4 rtl:right-4 -top-2.5 bg-white dark:bg-brand-600 text-brand-600 dark:text-white px-2 py-0.5 rounded text-[8px] font-bold shadow-sm">#{i+1}</div>
                                            </div>
                                            {deleteOverlay}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Image Gallery Panel */}
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-sm font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest">
                                <ImageIcon size={18} className="text-brand-500" />
                                {t('uploadedImages' as TranslationKey)}
                            </h2>
                            <span className="bg-brand-100 dark:bg-brand-900/50 px-4 py-1.5 rounded-full text-brand-600 dark:text-brand-400 text-xs font-black shadow-inner">
                                {uploadedFiles.length}
                            </span>
                        </div>

                        {uploadedFiles.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-6 max-h-[400px] overflow-y-auto p-2 custom-scrollbar pr-4">
                                {uploadedFiles.map((f, idx) => (
                                    <div 
                                        key={f.id} 
                                        onClick={() => setActiveFileIndex(idx)} 
                                        className={`relative cursor-pointer group rounded-2xl overflow-hidden aspect-[3/4.5] border-4 transition-all duration-300 hover:scale-105 shadow-md ${activeFileIndex === idx ? 'border-brand-600 shadow-brand-500/20' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                    >
                                        <img src={f.previewUrl} className="w-full h-full object-cover" alt="thumb" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeFile(f.id, idx); }} 
                                                className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all shadow-xl scale-90 group-hover:scale-100"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {activeFileIndex === idx && (
                                            <div className="absolute top-2 ltr:left-2 rtl:right-2">
                                                <span className="bg-brand-600 text-white text-[9px] px-2 py-1 rounded-lg font-black shadow-lg uppercase tracking-wider">ACTIVE</span>
                                            </div>
                                        )}
                                        {allCropPoints[f.id]?.length > 0 && (
                                            <div className="absolute bottom-2 ltr:left-2 rtl:right-2 bg-emerald-500 text-white text-[9px] px-2 py-1 rounded-lg font-black shadow-lg">
                                                {allCropPoints[f.id].length} PTS
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <ImageIcon size={48} className="opacity-20" />
                                <p className="italic text-sm font-medium">{t('noImagesUploaded' as TranslationKey)}</p>
                            </div>
                        )}
                    </div>

                    {/* Results Panel */}
                    <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                            <h2 className="text-lg font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/30">
                                    <Maximize2 size={18} />
                                </span>
                                {t('mergedImages' as TranslationKey)}
                            </h2>
                            {mergedImages.length > 0 && (
                                <button 
                                    onClick={handleDownloadAll} 
                                    disabled={isZipping} 
                                    className="flex items-center gap-3 bg-emerald-500 text-white font-black py-4 px-8 rounded-2xl hover:bg-emerald-600 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 text-xs uppercase tracking-widest animate-in zoom-in duration-300"
                                >
                                    {isZipping ? <Loader2 size={18} className="animate-spin" /> : <DownloadIcon className="w-5 h-5"/>}
                                    {isZipping ? t('zipping' as TranslationKey) : t('downloadAll' as TranslationKey)}
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-2xl mb-8 text-red-600 text-sm font-bold flex items-center gap-4 animate-in slide-in-from-left-4">
                                <XCircleIcon className="w-6 h-6 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center py-32 gap-6 bg-slate-50/30 dark:bg-slate-950/20 rounded-[2rem]">
                                <div className="relative">
                                    <div className="w-20 h-20 border-[6px] border-brand-100 dark:border-slate-800 border-t-brand-600 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-brand-600">
                                        <Layers size={24} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-black text-brand-600 dark:text-brand-400 animate-pulse tracking-widest uppercase">{t('merging' as TranslationKey)}</p>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">{language === 'ar' ? 'يرجى الانتظار قليلاً...' : 'Please wait a moment...'}</p>
                                </div>
                            </div>
                        ) : mergedImages.length > 0 ? (
                            <div className="max-h-[1000px] overflow-y-auto space-y-10 pr-4 custom-scrollbar">
                                {mergedImages.map((imgSrc, index) => (
                                    <div key={index} className="bg-gray-50/50 dark:bg-slate-950/40 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 group transition-all hover:shadow-2xl hover:border-brand-500/20">
                                        <div className="relative overflow-hidden rounded-2xl mb-8 shadow-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 group-hover:ring-brand-500/30 transition-all">
                                            <img src={imgSrc} className="max-w-full h-auto mx-auto block" alt={`Result ${index}`} />
                                            <div className="absolute top-4 ltr:left-4 rtl:right-4">
                                                <span className="bg-brand-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[11px] font-black shadow-xl ring-1 ring-white/20">
                                                    #{index + 1}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                                            <a 
                                                href={imgSrc} 
                                                download={`result-${index + 1}.${getFormatExtension()}`} 
                                                className="flex-1 w-full flex items-center justify-center gap-3 bg-brand-600 text-white font-black py-4.5 px-10 rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 text-sm uppercase tracking-widest"
                                            >
                                                <DownloadIcon className="w-5 h-5"/>
                                                {t('download' as TranslationKey)} #{index + 1}
                                            </a>
                                            <button 
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = imgSrc;
                                                    link.download = `manga-page-${index+1}.${getFormatExtension()}`;
                                                    link.click();
                                                }}
                                                className="w-14 h-14 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-400 hover:text-brand-500 hover:border-brand-500 transition-all shadow-md group/btn"
                                            >
                                                <ImageIcon size={20} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center text-slate-400 flex flex-col items-center gap-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/30 dark:bg-slate-950/10">
                                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-xl ring-8 ring-slate-50 dark:ring-slate-900/50">
                                    <ImageIcon className="w-12 h-12" />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">{t('noImagesMerged' as TranslationKey)}</p>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">{language === 'ar' ? 'ابدأ بإضافة الصور واختيار وضع الدمج من القائمة الجانبية' : 'Start by adding images and choosing a merge mode from the side menu'}</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EditorApp;