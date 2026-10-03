import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, Film, AlertCircle } from 'lucide-react';

interface MuxPlayerProps {
  playbackId?: string;
  videoUrl?: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
}

export function MuxPlayer({
  playbackId,
  videoUrl,
  title = 'Video Lesson',
  className = '',
  autoPlay = false
}: MuxPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Construct stream URL
  const streamUrl = playbackId
    ? `https://stream.mux.com/${playbackId}.m3u8`
    : videoUrl;

  const posterUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.png?time=1`
    : undefined;

  const isEmbedVideo = !playbackId && (videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be') || videoUrl?.includes('vimeo.com') || videoUrl?.includes('/embed/'));

  const getEmbedIframeUrl = (url?: string) => {
    if (!url) return '';
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
      if (url.includes('vimeo.com/')) {
        const v = url.split('vimeo.com/')[1]?.split('?')[0];
        return `https://player.vimeo.com/video/${v}`;
      }
    } catch (e) {}
    return url || '';
  };

  useEffect(() => {
    if (isEmbedVideo) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setHasError(false);

    // Standard HTML5 video or HLS setup
    const handleCanPlay = () => setIsLoading(false);
    const handleTimeUpdate = () => {
      if (video.duration) {
        setCurrentTime(video.currentTime);
        setDuration(video.duration);
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const handleError = () => {
      console.warn("Video playback notice (checking format):", video.error);
      setIsLoading(false);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
    };
  }, [streamUrl, isEmbedVideo]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !duration) return;
    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    videoRef.current.currentTime = seekTime;
    setProgress(parseFloat(e.target.value));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!streamUrl) {
    return (
      <div className={`aspect-video w-full bg-neutral-900 rounded-2xl flex flex-col items-center justify-center text-neutral-500 border border-neutral-800 ${className}`}>
        <Film className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-xs font-mono">No video uploaded for this lesson</p>
      </div>
    );
  }

  if (isEmbedVideo) {
    const embedSrc = getEmbedIframeUrl(videoUrl);
    return (
      <div className={`relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 ${className}`}>
        <iframe
          src={embedSrc}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl group border border-neutral-800 flex items-center justify-center ${className}`}
    >
      <video
        ref={videoRef}
        src={streamUrl}
        poster={posterUrl}
        autoPlay={autoPlay}
        playsInline
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Loading Spinner Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center pointer-events-none">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      )}

      {/* Center Big Play Button when paused */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all scale-95 hover:scale-105 border border-white/20 shadow-lg"
          aria-label="Play Video"
        >
          <Play className="h-8 w-8 fill-current ml-1" />
        </button>
      )}

      {/* Video Control Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 flex flex-col gap-2">
        {/* Progress Slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={progress || 0}
          onChange={handleSeek}
          className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:h-1.5 transition-all"
        />

        <div className="flex items-center justify-between text-white text-xs font-mono">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-1 hover:text-neutral-300 transition-colors">
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <button onClick={toggleMute} className="p-1 hover:text-neutral-300 transition-colors">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-300 font-bold uppercase tracking-wider">
              {playbackId ? 'Mux Stream' : 'Video'}
            </span>
            <button onClick={toggleFullscreen} className="p-1 hover:text-neutral-300 transition-colors">
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
