import React, { useEffect, useRef } from 'react';
import { ShieldCheck, MicOff } from 'lucide-react';
import { ProtectedPhoto } from '../security/ProtectedPhoto';
import { CallControls } from './CallControls';
import { formatCallTimer, type CallPeerInfo } from '../../context/CallContext';

interface VoiceCallScreenProps {
  peer: CallPeerInfo;
  statusMessage: string | null;
  callDuration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  remoteMuted: boolean;
  remoteStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({
  peer,
  statusMessage,
  callDuration,
  isMuted,
  isSpeakerOn,
  remoteMuted,
  remoteStream,
  onToggleMute,
  onToggleSpeaker,
  onEndCall,
}) => {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = !isSpeakerOn;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, isSpeakerOn]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  return (
    <div className="fixed inset-0 z-[10050] flex flex-col items-center justify-between bg-gradient-to-br from-[#071936] via-[#0b2a5b] to-[#1e1136] text-white p-6 sm:p-10 select-none animate-in fade-in duration-200">
      {/* Hidden Audio Element for WebRTC Remote Audio Stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Encrypted Matrimonial Header */}
      <div className="w-full max-w-md flex flex-col items-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-white/90 font-medium shadow-sm">
          <ShieldCheck className="w-4 h-4 text-[#ff4d6d]" />
          <span>BorKonya Private Voice Call • End-to-End Protected</span>
        </div>
      </div>

      {/* Center Avatar, Name, Status & Timer */}
      <div className="flex flex-col items-center text-center my-auto max-w-sm w-full">
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 mb-6">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-[#0a56e0]/40 to-[#e0102f]/40 blur-md animate-pulse" />
          <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-2xl bg-[#163366]">
            <ProtectedPhoto
              photoUrl={peer.photo_url || undefined}
              gender={peer.gender}
              altText={peer.full_name}
              profileId={peer.profile_id}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white truncate max-w-full px-2">
          {peer.full_name}
        </h2>

        <div className="mt-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-sm font-semibold text-[#bbf7d0]">
            {statusMessage || 'Connected'}
          </span>
        </div>

        {/* Call Duration Timer */}
        <div className="mt-4 px-5 py-1.5 rounded-full bg-white/10 border border-white/15 font-mono text-2xl sm:text-3xl font-bold tracking-wider text-white shadow-inner">
          {formatCallTimer(callDuration)}
        </div>

        {remoteMuted && (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e0102f]/25 border border-[#ff4d6d]/40 text-xs text-[#ffd1da]">
            <MicOff className="w-3.5 h-3.5 text-[#ff4d6d]" />
            <span>{peer.first_name} is muted</span>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full flex flex-col items-center pb-4">
        <CallControls
          callType="VOICE"
          isMuted={isMuted}
          isCameraOff={true}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={onToggleMute}
          onToggleCamera={() => {}}
          onToggleSpeaker={onToggleSpeaker}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
};
