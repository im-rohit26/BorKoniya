import React, { useEffect, useRef } from 'react';
import { ShieldCheck, MicOff, VideoOff } from 'lucide-react';
import { ProtectedPhoto } from '../security/ProtectedPhoto';
import { CallControls } from './CallControls';
import { formatCallTimer, type CallPeerInfo } from '../../context/CallContext';

interface VideoCallScreenProps {
  peer: CallPeerInfo;
  statusMessage: string | null;
  callDuration: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  remoteMuted: boolean;
  remoteCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  peer,
  statusMessage,
  callDuration,
  isMuted,
  isCameraOff,
  isSpeakerOn,
  remoteMuted,
  remoteCameraOff,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onEndCall,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = !isSpeakerOn;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, isSpeakerOn]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isCameraOff]);

  const hasRemoteVideo =
    !!remoteStream &&
    remoteStream.getVideoTracks().length > 0 &&
    !remoteCameraOff;

  return (
    <div className="fixed inset-0 z-[10050] bg-[#061326] text-white overflow-hidden select-none flex flex-col justify-between animate-in fade-in duration-200">
      {/* FULL SCREEN REMOTE VIDEO */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-[#071936] via-[#0b2a5b] to-[#1e1136]">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasRemoteVideo ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Fallback Avatar when Remote Camera is Off or Stream Connecting */}
        {!hasRemoteVideo && (
          <div className="flex flex-col items-center text-center p-6 z-10">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-white/90 shadow-2xl mb-4 bg-[#163366]">
              <ProtectedPhoto
                photoUrl={peer.photo_url || undefined}
                gender={peer.gender}
                altText={peer.full_name}
                profileId={peer.profile_id}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">{peer.full_name}</h3>
            <p className="text-xs sm:text-sm text-white/75 mt-1 flex items-center gap-1.5">
              {remoteCameraOff ? (
                <>
                  <VideoOff className="w-4 h-4 text-[#ff4d6d]" />
                  <span>Camera is turned off</span>
                </>
              ) : (
                <span>{statusMessage || 'Connected'}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* TOP BAR: Peer Info + Call Timer + Privacy Shield */}
      <div className="relative z-20 px-4 pt-4 sm:px-8 sm:pt-6 flex items-center justify-between gap-3 bg-gradient-to-b from-black/65 via-black/30 to-transparent pb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-[#163366]">
            <ProtectedPhoto
              photoUrl={peer.photo_url || undefined}
              gender={peer.gender}
              altText={peer.full_name}
              profileId={peer.profile_id}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white truncate drop-shadow">
              {peer.full_name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="font-mono font-bold tracking-wider">
                {formatCallTimer(callDuration)}
              </span>
              {remoteMuted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e0102f]/80 text-[10px] font-semibold">
                  <MicOff className="w-3 h-3" />
                  Muted
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs text-white/90 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#ff4d6d]" />
          <span>BorKonya Private Video • Number Hidden</span>
        </div>
      </div>

      {/* FLOATING LOCAL VIDEO (YOU) */}
      <div className="relative z-20 flex-1 pointer-events-none">
        <div className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-6 sm:right-8 w-28 h-40 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/85 shadow-2xl bg-[#0b2a5b] transition-all">
          {localStream && !isCameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0b2a5b] to-[#1a3668] p-2 text-center">
              <VideoOff className="w-6 h-6 text-[#ff4d6d] mb-1" />
              <span className="text-[11px] font-semibold text-white/80">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold tracking-wide text-white flex items-center gap-1">
            <span>YOU</span>
            {isMuted && <MicOff className="w-3 h-3 text-[#ff4d6d]" />}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR */}
      <div className="relative z-20 pb-6 sm:pb-8 pt-4 px-4 flex justify-center bg-gradient-to-t from-black/75 via-black/30 to-transparent">
        <CallControls
          callType="VIDEO"
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={onToggleMute}
          onToggleCamera={onToggleCamera}
          onToggleSpeaker={onToggleSpeaker}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
};
