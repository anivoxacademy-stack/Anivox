import React, { useRef, useState, useEffect } from 'react';
import * as UpChunk from '@mux/upchunk';
import { Video, Loader2, CheckCircle2, AlertCircle, Upload, Link as LinkIcon, Check, ExternalLink, X } from 'lucide-react';
import { auth } from '../../lib/firebase';

export interface MuxUploadResult {
  videoUrl: string;
  muxAssetId: string;
  muxPlaybackId: string;
  muxStatus: 'ready' | 'preparing' | 'errored';
  duration?: string;
}

interface MuxVideoUploadProps {
  label?: string;
  currentVideoUrl?: string;
  currentMuxPlaybackId?: string;
  currentMuxAssetId?: string;
  currentMuxStatus?: string;
  onUploadComplete: (result: MuxUploadResult) => void;
  helperText?: string;
  className?: string;
}

type UploadState = 
  | 'IDLE' 
  | 'SELECTED' 
  | 'PREPARING' 
  | 'UPLOADING' 
  | 'UPLOADED' 
  | 'PROCESSING' 
  | 'READY' 
  | 'ERROR' 
  | 'CANCELLED';

export function MuxVideoUpload({
  label = 'Lesson Video',
  currentVideoUrl,
  currentMuxPlaybackId,
  currentMuxAssetId,
  currentMuxStatus,
  onUploadComplete,
  helperText = 'Upload video file directly or paste a YouTube / Unlisted YouTube / Vimeo video link.',
  className = ''
}: MuxVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upchunkUploadRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [linkInput, setLinkInput] = useState<string>(currentVideoUrl || '');

  const [uploadState, setUploadState] = useState<UploadState>('IDLE');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [playbackId, setPlaybackId] = useState<string | null>(currentMuxPlaybackId || null);
  const [assetId, setAssetId] = useState<string | null>(currentMuxAssetId || null);
  const [videoUrl, setVideoUrl] = useState<string | null>(currentVideoUrl || null);

  useEffect(() => {
    setPlaybackId(currentMuxPlaybackId || null);
    setAssetId(currentMuxAssetId || null);
    setVideoUrl(currentVideoUrl || null);
    setLinkInput(currentVideoUrl || '');
  }, [currentMuxPlaybackId, currentMuxAssetId, currentVideoUrl]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

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
      if (url.includes('youtube.com/embed/')) return url;
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

  const cancelUpload = () => {
    if (upchunkUploadRef.current) {
      try {
        upchunkUploadRef.current.abort();
      } catch (e) {
        console.warn('Notice aborting UpChunk upload:', e);
      }
      upchunkUploadRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setUploadState('CANCELLED');
    setProgress(0);
    setStatusMessage(null);
  };

  const handleApplyLink = () => {
    setErrorMessage(null);
    const trimmed = linkInput.trim();
    setVideoUrl(trimmed || null);
    setPlaybackId(null);
    setAssetId(null);
    onUploadComplete({
      videoUrl: trimmed,
      muxAssetId: '',
      muxPlaybackId: '',
      muxStatus: 'ready'
    });
  };

  const handleFileSelected = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (MP4, MOV, WebM, etc.)');
      return;
    }

    setErrorMessage(null);
    setUploadState('PREPARING');
    setStatusMessage('Requesting secure Mux direct upload URL from server...');
    setProgress(0);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in as an administrator to upload course videos.');
      }

      const idToken = await currentUser.getIdToken(true);
      const adminSessionToken = sessionStorage.getItem('admin_session');

      const response = await fetch('/api/video/create-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSessionToken || idToken}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.uploadUrl) {
        throw new Error(data.error || 'Failed to initialize Mux upload endpoint');
      }

      const { uploadUrl, uploadId } = data;

      setUploadState('UPLOADING');
      setStatusMessage('Uploading video directly to Mux...');

      const upload = UpChunk.createUpload({
        endpoint: uploadUrl,
        file: file,
        chunkSize: 5120,
      });

      upchunkUploadRef.current = upload;

      upload.on('progress', (ev: any) => {
        const pct = Math.round(ev.detail);
        setProgress(pct);
      });

      upload.on('error', (err: any) => {
        console.error('[MUX UPCHUNK ERROR]', err);
        setUploadState('ERROR');
        setErrorMessage(err.detail?.message || 'Direct upload to Mux was interrupted. Please retry.');
      });

      upload.on('success', () => {
        upchunkUploadRef.current = null;
        setUploadState('PROCESSING');
        setStatusMessage('Upload complete. Mux is encoding and processing video...');
        setProgress(100);

        pollUploadStatus(uploadId);
      });

    } catch (err: any) {
      console.error('[MUX UPLOAD INIT ERROR]', err);
      setUploadState('ERROR');
      setErrorMessage(err.message || 'Failed to initiate Mux upload.');
    }
  };

  const pollUploadStatus = (uploadId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(pollIntervalRef.current);
        setUploadState('ERROR');
        setErrorMessage('Mux processing timed out. Please refresh or retry.');
        return;
      }

      try {
        const res = await fetch(`/api/video/upload-status/${uploadId}`);
        const data = await res.json();

        if (res.ok && data.success) {
          if (data.playbackId) {
            clearInterval(pollIntervalRef.current);
            const newPlaybackId = data.playbackId;
            const newAssetId = data.assetId || '';
            const newVideoUrl = `https://stream.mux.com/${newPlaybackId}.m3u8`;

            setPlaybackId(newPlaybackId);
            setAssetId(newAssetId);
            setVideoUrl(newVideoUrl);
            setUploadState('READY');
            setStatusMessage('Video processed and ready for playback!');

            onUploadComplete({
              videoUrl: newVideoUrl,
              muxAssetId: newAssetId,
              muxPlaybackId: newPlaybackId,
              muxStatus: 'ready'
            });
          }
        }
      } catch (pollErr) {
        console.warn('[MUX POLL NOTICE]', pollErr);
      }
    }, 3000);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {label && <label className="text-xs font-bold uppercase tracking-wider text-neutral-800">{label}</label>}

        <div className="flex rounded-lg bg-neutral-100 p-0.5 border border-neutral-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('upload'); setErrorMessage(null); }}
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
            onClick={() => { setMode('link'); setErrorMessage(null); }}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
              mode === 'link'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <LinkIcon className="h-3 w-3" /> Use Link
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />

      {mode === 'upload' ? (
        /* OPTION 1: UPLOAD FILE */
        <div 
          onClick={() => uploadState !== 'PREPARING' && uploadState !== 'UPLOADING' && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] bg-neutral-50 hover:bg-neutral-100/60 ${
            uploadState === 'READY' || playbackId || videoUrl ? 'border-emerald-300 bg-emerald-50/20' : 'border-neutral-200 hover:border-neutral-400'
          }`}
        >
          {uploadState === 'PREPARING' || uploadState === 'UPLOADING' || uploadState === 'PROCESSING' ? (
            <div className="w-full max-w-sm text-center space-y-3 py-2">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mx-auto" />
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-800">
                  <span>{uploadState === 'PROCESSING' ? 'Processing Video' : `Uploading ${progress}%`}</span>
                  {(uploadState === 'UPLOADING' || uploadState === 'PREPARING') && (
                    <button type="button" onClick={cancelUpload} className="text-red-600 hover:underline text-[10px]">
                      Cancel
                    </button>
                  )}
                </div>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-neutral-900 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadState === 'PROCESSING' ? 100 : progress}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">{statusMessage}</p>
            </div>
          ) : uploadState === 'READY' || playbackId ? (
            <div className="w-full text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">Mux Stream Video Ready</p>
                <p className="text-[11px] text-neutral-500 font-mono">Playback ID: {playbackId}</p>
              </div>
              <p className="text-[10px] text-neutral-400">Click to replace with a new video file</p>
            </div>
          ) : videoUrl ? (
            <div className="w-full text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-900">Lesson Video Configured</p>
                <p className="text-[11px] text-neutral-500 font-mono truncate max-w-md mx-auto">{videoUrl}</p>
              </div>
              <p className="text-[10px] text-neutral-400">Click to replace video file</p>
            </div>
          ) : (
            <div className="text-center space-y-2 py-2">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-neutral-200 shadow-xs mx-auto text-neutral-600">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-800">Select Video File to Upload</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">MP4, MOV, WebM</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* OPTION 2: USE LINK */
        <div className="space-y-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                const trimmed = e.target.value.trim();
                setVideoUrl(trimmed || null);
                setPlaybackId(null);
                setAssetId(null);
                onUploadComplete({
                  videoUrl: trimmed,
                  muxAssetId: '',
                  muxPlaybackId: '',
                  muxStatus: 'ready'
                });
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
            Paste any YouTube URL, Unlisted YouTube video URL, Vimeo URL, or direct MP4 stream link.
          </p>

          {videoUrl && (
            <div className="pt-2 border-t border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Live Video Player Preview</span>
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl(null);
                    setLinkInput('');
                    onUploadComplete({ videoUrl: '', muxAssetId: '', muxPlaybackId: '', muxStatus: 'ready' });
                  }}
                  className="text-xs text-red-500 font-medium hover:underline flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear Link
                </button>
              </div>

              {isYouTubeUrl(videoUrl) ? (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-200 shadow-sm max-h-56">
                  <iframe
                    src={getYouTubeEmbedUrl(videoUrl)}
                    title="YouTube Lesson Preview"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : isVimeoUrl(videoUrl) ? (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-200 shadow-sm max-h-56">
                  <iframe
                    src={getVimeoEmbedUrl(videoUrl)}
                    title="Vimeo Lesson Preview"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="w-full rounded-xl overflow-hidden bg-black border border-neutral-200 shadow-sm max-h-56 flex items-center justify-center">
                  <video src={videoUrl} controls className="max-h-56 w-full object-contain" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => { setErrorMessage(null); setUploadState('IDLE'); }} 
            className="text-[10px] font-bold text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {helperText && !errorMessage && (
        <p className="text-[11px] text-neutral-400">{helperText}</p>
      )}
    </div>
  );
}

