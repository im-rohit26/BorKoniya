import React, { useEffect, useRef } from 'react';
import { PhoneOff, ShieldCheck, Video, Phone } from 'lucide-react';
import { ProtectedPhoto } from '../security/ProtectedPhoto';
import type { CallPeerInfo, CallState, CallType } from '../../context/CallContext';

interface OutgoingCallModalProps {
  peer: CallPeerInfo;
  callType: CallType;
  callState: CallState;
  statusMessage: string | null;
  localStream: MediaStream | null;
  onCancel: () => void;
}

export const OutgoingCallModal: React.FC<OutgoingCallModalProps> = ({
  peer,
  callType,
  callState,
  statusMessage,
  localStream,
  onCancel,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const isVideo = callType === 'VIDEO';

  useEffect(() => {
    if (localVideoRef.current && localStream && isVideo) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideo]);

  const displayStatus =
    statusMessage ||
    (callState === 'INITIATING'
      ? `Calling ${peer.first_name}...`
      : callState === 'RINGING'
      ? 'Ringing...'
      : callState === 'CONNECTING'
      ? 'Connecting...'
      : 'Calling...');

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-[#071936]/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b2a5b] via-[#0a3fc0]/90 to-[#081d42] text-white shadow-2xl border border-white/15 p-7 text-center">
        {/* Optional local camera background preview when initiating video call */}
        {isVideo && localStream && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none scale-x-[-1]"
          />
        )}

        <div className="relative z-10 flex flex-col items-center">
          {/* Privacy badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-white/85 font-medium mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-[#ff4d6d]" />
            <span>BorKonya Private Call • Number Protected</span>
          </div>

          {/* Profile Photo */}
          <div className="relative w-28 h-28 mx-auto mb-5">
            {['INITIATING', 'RINGING', 'CONNECTING'].includes(callState) && (
              <div className="absolute -inset-2 rounded-full border-2 border-[#ff4d6d]/50 animate-ping" />
            )}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-[#1a3668]">
              <ProtectedPhoto
                photoUrl={peer.photo_url || undefined}
                gender={peer.gender}
                altText={peer.full_name}
                profileId={peer.profile_id}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Name */}
          <h2 className="text-2xl font-extrabold tracking-tight text-white truncate max-w-full px-2">
            {peer.full_name}
          </h2>

          {/* Call Type Pill */}
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/75 font-medium">
            {isVideo ? <Video className="w-3.5 h-3.5 text-[#ff4d6d]" /> : <Phone className="w-3.5 h-3.5 text-[#ff4d6d]" />}
            <span>{isVideo ? 'Video Call' : 'Voice Call'}</span>
          </div>

          {/* Live Status Text */}
          <p className="mt-4 text-base font-semibold text-[#ffd1da] min-h-[24px] animate-pulse">
            {displayStatus}
          </p>

          {/* End Call Button */}
          <div className="mt-9 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f0213f] to-[#c70a27] hover:from-[#e0102f] hover:to-[#a80720] text-white flex items-center justify-center shadow-xl shadow-[#e0102f]/40 hover:scale-105 active:scale-95 transition-all"
              title="End Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-white/85">End Call</span>
          </div>
        </div>
      </div>
    </div>
  );
};
