import React, { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioAlarmProps {
  hasCriticalZone: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const AudioAlarm: React.FC<AudioAlarmProps> = ({
  hasCriticalZone,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    if (!hasCriticalZone || isMuted) return;

    let audioCtx: AudioContext | null = null;
    let intervalId: any = null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();

        const playBeep = () => {
          if (!audioCtx || audioCtx.state === 'closed') return;
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }

          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
          osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);

          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        };

        // Play double beep every 3 seconds for active critical alerts
        playBeep();
        intervalId = setInterval(playBeep, 3000);
      }
    } catch (err) {
      console.warn('AudioContext unavailable:', err);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [hasCriticalZone, isMuted]);

  if (!hasCriticalZone) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-red-950/90 border border-red-700/80 p-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs text-red-200 animate-bounce">
      <div className="flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        <span className="font-bold uppercase tracking-wider">CRITICAL HAZARD ALARM</span>
      </div>

      <button
        onClick={onToggleMute}
        className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg border border-red-600 flex items-center space-x-1 transition-colors"
      >
        {isMuted ? (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span>Unmute Sound</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5" />
            <span>Mute Sound</span>
          </>
        )}
      </button>
    </div>
  );
};
