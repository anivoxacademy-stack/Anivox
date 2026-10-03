import React, { useRef, useState, useEffect } from 'react';
import { UploadTask } from 'firebase/storage';
import { uploadFileToStorage } from '../../lib/storageService';
import { auth } from '../../lib/firebase';
import { Upload, Link as LinkIcon, X, AlertCircle, Loader2, FileText, Check, ExternalLink, Play } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  folder?: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  helperText?: string;
  allowLink?: boolean;
  placeholder?: string;
}

export function FileUpload({
  label,
  accept = 'image/*',
  folder = 'uploads',
  currentUrl,
  onUploadComplete,
  onRemove,
  className = '',
  helperText,
  allowLink = true,
  placeholder
}: FileUploadProps) {
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [linkInput, setLinkInput] = useState<string>(currentUrl || '');
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTaskRef = useRef<UploadTask | null>(null);

  useEffect(() => {
    setPreviewUrl(currentUrl || null);
    setLinkInput(currentUrl || '');
  }, [currentUrl]);

  // Media classification helpers
  const isYouTubeUrl = (url?: string | null) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      if (url.includes('youtube.com/watch')) {
        const v = new URL(url).searchParams.get('v');
        return `https://www.youtube-nocookie.com/embed/${v}?autoplay=0&rel=0`;
      }
      if (url.includes('youtu.be/')) {
        const v = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube-nocookie.com/embed/${v}?autoplay=0&rel=0`;
      }
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
    } catch (e) {}
    return url;
  };

  const isVimeoUrl = (url?: string | null) => {
    if (!url) return false;
    return url.includes('vimeo.com');
  };

  const getVimeoEmbedUrl = (url: string) => {
    try {
      const v = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${v}`;
    } catch (e) {}
    return url;
  };

  const isVideo = accept.includes('video') || isYouTubeUrl(previewUrl) || isVimeoUrl(previewUrl) || (previewUrl?.includes('.mp4') || previewUrl?.includes('.webm') || previewUrl?.includes('.mov'));
  const isPdfOrDoc = previewUrl?.includes('.pdf') || previewUrl?.includes('.doc') || previewUrl?.includes('.docx') || previewUrl?.includes('.txt') || previewUrl?.includes('.ppt');

  const cancelUpload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeTaskRef.current) {
      try {
        activeTaskRef.current.cancel();
      } catch (err) {
        console.warn('Notice canceling upload:', err);
      }
      activeTaskRef.current = null;
    }
    setUploading(false);
    setProgress(null);
    setError('Upload canceled.');
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file type if strict accept pattern is specified
    if (accept === 'image/*' && !file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, GIF, SVG, etc.)');
      return;
    }
    if (accept === 'video/*' && !file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, etc.)');
      return;
    }

    // Max size: 25MB for images/PDFs/documents, 500MB for videos
    const isVideoFile = accept.includes('video') || file.type.startsWith('video/');
    const maxSizeBytes = isVideoFile ? 500 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const maxMB = isVideoFile ? '500MB' : '25MB';
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${maxMB}.`);
      return;
    }

    // Authenticate user before initiating upload
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Upload failed: User is not authenticated in Firebase. Please sign in with your Google account.');
      setUploading(false);
      setProgress(null);
      return;
    }

    try {
      await currentUser.getIdToken(true);
    } catch (tokenErr: any) {
      console.warn('Notice refreshing Firebase Auth token before storage upload:', tokenErr?.message || tokenErr);
    }

    setUploading(true);
    setProgress(0);

    try {
      const { uploadTask } = await uploadFileToStorage({
        file,
        folder,
        onProgress: (pct) => {
          setProgress(pct);
        },
        onError: (errorMsg) => {
          activeTaskRef.current = null;
          setError(errorMsg);
          setUploading(false);
          setProgress(null);
        },
        onComplete: (result) => {
          activeTaskRef.current = null;
          setPreviewUrl(result.downloadUrl);
          onUploadComplete(result.downloadUrl);
          setProgress(100);
          setTimeout(() => {
            setProgress(null);
            setUploading(false);
          }, 500);
        }
      });
      activeTaskRef.current = uploadTask;
    } catch (initErr: any) {
      activeTaskRef.current = null;
      setError(initErr?.message || 'Upload initialization failed.');
      setUploading(false);
      setProgress(null);
    }
  };

  const handleApplyLink = () => {
    setError(null);
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setPreviewUrl(null);
      onUploadComplete('');
      return;
    }

    setPreviewUrl(trimmed);
    onUploadComplete(trimmed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (mode === 'upload' && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploading) {
      cancelUpload();
      return;
    }
    setPreviewUrl(null);
    setLinkInput('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onRemove) onRemove();
    else onUploadComplete('');
  };

  const defaultPlaceholder = accept.includes('video')
    ? 'e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...'
    : accept.includes('pdf') || accept.includes('document')
    ? 'e.g. https://domain.com/notes.pdf'
    : 'e.g. https://images.unsplash.com/photo-... or https://domain.com/image.png';

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-neutral-800">{label}</label>}

        {allowLink && (
          <div className="flex rounded-lg bg-neutral-100 p-0.5 border border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('upload'); setError(null); }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                mode === 'upload'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Upload className="h-3 w-3" /> Upload File
            </button>
            <button
              type="button"
              onClick={() => { setMode('link'); setError(null); }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                mode === 'link'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <LinkIcon className="h-3 w-3" /> Use Link
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* MODE 1: FILE UPLOAD */}
      {mode === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
            isDragOver
              ? 'border-brand-500 bg-brand-50/50'
              : previewUrl
              ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50'
              : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white'
          }`}
        >
          {uploading ? (
            <div className="w-full max-w-xs space-y-3 text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto" />
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-700">
                  <span>Uploading {progress !== null ? `${progress}%` : ''}</span>
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="text-[10px] text-red-500 hover:underline font-bold"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress || 0}%` }}
                  />
                </div>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="relative w-full flex flex-col items-center">
              {isYouTubeUrl(previewUrl) ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-black max-h-48">
                  <iframe
                    src={getYouTubeEmbedUrl(previewUrl!)}
                    title="YouTube Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isVimeoUrl(previewUrl) ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-black max-h-48">
                  <iframe
                    src={getVimeoEmbedUrl(previewUrl!)}
                    title="Vimeo Preview"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isVideo ? (
                <div className="w-full max-h-48 rounded-lg overflow-hidden bg-black flex items-center justify-center relative">
                  <video src={previewUrl} controls className="max-h-48 w-full object-contain" />
                </div>
              ) : isPdfOrDoc ? (
                <div className="p-4 bg-white border border-neutral-200 rounded-xl flex items-center gap-3">
                  <FileText className="h-8 w-8 text-brand-600 shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-bold text-neutral-900 truncate">Document Attached</p>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-600 hover:underline truncate block flex items-center gap-1">
                      View File <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="max-h-40 max-w-full rounded-lg overflow-hidden border border-neutral-200 bg-white">
                  <img
                    src={previewUrl}
                    alt={label || 'Uploaded file'}
                    className="max-h-40 w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mt-3">
                <p className="text-[11px] text-neutral-400">Click or drag to replace file</p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-red-500 font-medium hover:underline flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-2">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-neutral-200 shadow-xs mx-auto text-neutral-500">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-800">
                  Click to upload or drag & drop file
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {accept.includes('video') ? 'MP4, WebM (up to 500MB)' : 'PNG, JPG, WebP, PDF (up to 25MB)'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: USE LINK */
        <div className="space-y-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              placeholder={placeholder || defaultPlaceholder}
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                setPreviewUrl(e.target.value.trim() || null);
                onUploadComplete(e.target.value.trim());
              }}
            />
            <button
              type="button"
              onClick={handleApplyLink}
              className="px-3 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" /> Apply
            </button>
          </div>

          <p className="text-[11px] text-neutral-400">
            Paste any YouTube video link, Google Drive view link, image URL, or PDF link.
          </p>

          {/* Link Live Preview */}
          {previewUrl && (
            <div className="pt-2 border-t border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Live Media Preview</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-red-500 font-medium hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear Link
                </button>
              </div>

              {isYouTubeUrl(previewUrl) ? (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-200 shadow-sm max-h-56">
                  <iframe
                    src={getYouTubeEmbedUrl(previewUrl)}
                    title="YouTube Video Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isVimeoUrl(previewUrl) ? (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-200 shadow-sm max-h-56">
                  <iframe
                    src={getVimeoEmbedUrl(previewUrl)}
                    title="Vimeo Video Preview"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isVideo ? (
                <div className="w-full rounded-xl overflow-hidden bg-black border border-neutral-200 shadow-sm max-h-56 flex items-center justify-center">
                  <video src={previewUrl} controls className="max-h-56 w-full object-contain" />
                </div>
              ) : isPdfOrDoc ? (
                <div className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-6 w-6 text-brand-600 shrink-0" />
                    <span className="text-xs font-semibold text-neutral-800 truncate">{previewUrl}</span>
                  </div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline shrink-0 font-medium flex items-center gap-1"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-neutral-200 bg-white p-2 flex justify-center">
                  <img
                    src={previewUrl}
                    alt="Pasted Link Preview"
                    className="max-h-48 w-auto object-contain rounded-lg"
                    onError={() => setError('Could not load image from link. Please check the URL.')}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {helperText && !error && (
        <p className="text-[11px] text-neutral-400">{helperText}</p>
      )}
    </div>
  );
}

