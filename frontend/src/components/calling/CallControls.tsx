import React from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';

interface CallControlsProps {
  callType: 'VOICE' | 'VIDEO';
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  callType,
  isMuted,
  isCameraOff,
  isSpeakerOn,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onEndCall,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 px-6 py-3.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 shadow-2xl">
      {/* Microphone Mute / Unmute */}
      <button
        type="button"
        onClick={onToggleMute}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg ${
          isMuted
            ? 'bg-[#e0102f] text-white ring-2 ring-white/40 scale-105'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
      >
        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      {/* Camera ON / OFF (Only for Video Call) */}
      {callType === 'VIDEO' && (
        <button
          type="button"
          onClick={onToggleCamera}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg ${
            isCameraOff
              ? 'bg-[#e0102f] text-white ring-2 ring-white/40 scale-105'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
      )}

      {/* Speaker / Audio Control */}
      <button
        type="button"
        onClick={onToggleSpeaker}
        title={isSpeakerOn ? 'Mute speaker audio' : 'Enable speaker audio'}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg ${
          !isSpeakerOn
            ? 'bg-amber-500 text-white ring-2 ring-white/40'
            : 'bg-white/20 hover:bg-white/30 text-white'
        }`}
      >
        {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
      </button>

      {/* End Call */}
      <button
        type="button"
        onClick={onEndCall}
        title="End Call"
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#f0213f] to-[#c70a27] hover:from-[#e0102f] hover:to-[#a80720] text-white flex items-center justify-center shadow-xl shadow-[#e0102f]/40 hover:scale-105 active:scale-95 transition-all"
      >
        <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>
    </div>
  );
};
