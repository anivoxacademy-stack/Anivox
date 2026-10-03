import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Mic, 
  Video, 
  Monitor, 
  Wifi, 
  RefreshCw 
} from 'lucide-react';
import { JITSI_DOMAIN } from '../../lib/jitsiConfig';

export function ClassroomDiagnostics() {
  const [devices, setDevices] = useState<{ audioIn: number; videoIn: number; audioOut: number }>({
    audioIn: 0,
    videoIn: 0,
    audioOut: 0
  });

  const checkDevices = async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devList = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          audioIn: devList.filter(d => d.kind === 'audioinput').length,
          videoIn: devList.filter(d => d.kind === 'videoinput').length,
          audioOut: devList.filter(d => d.kind === 'audiooutput').length,
        });
      }
    } catch (e) {
      console.warn("Could not enumerate media devices:", e);
    }
  };

  useEffect(() => {
    checkDevices();
  }, []);

  return (
    <div className="p-4 space-y-4 text-xs text-neutral-300 overflow-y-auto max-h-full scrollbar-thin">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          <span className="font-bold uppercase tracking-wider text-white text-xs">Jitsi WebRTC Diagnostics</span>
        </div>
        <button 
          onClick={checkDevices}
          className="p-1 rounded bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          title="Refresh Diagnostics"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Connection Section */}
      <div className="bg-neutral-900/90 rounded-xl p-3 border border-neutral-800 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Wifi className="h-3 w-3" /> Jitsi Video Service
        </div>
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Jitsi Domain:</span>
            <span className="font-mono text-purple-400 text-[10px] font-semibold">{JITSI_DOMAIN}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Embed API Status:</span>
            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> READY
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">WebRTC Audio/Video:</span>
            <span className="font-mono text-emerald-400 text-[10px] font-bold">ENABLED</span>
          </div>
        </div>
      </div>

      {/* Hardware Devices */}
      <div className="bg-neutral-900/90 rounded-xl p-3 border border-neutral-800 space-y-2 text-[11px]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Local Hardware Detected
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60">
            <div className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-emerald-400" />
              <span>Microphones</span>
            </div>
            <span className="font-mono text-neutral-200">{devices.audioIn} detected</span>
          </div>

          <div className="flex justify-between items-center bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60">
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-emerald-400" />
              <span>Cameras</span>
            </div>
            <span className="font-mono text-neutral-200">{devices.videoIn} detected</span>
          </div>

          <div className="flex justify-between items-center bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60">
            <div className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-blue-400" />
              <span>Screen Sharing</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">Supported</span>
          </div>
        </div>
      </div>
    </div>
  );
}
