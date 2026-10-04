import React from 'react';
import { Phone, Video, PhoneOff, ShieldCheck } from 'lucide-react';
import { ProtectedPhoto } from '../security/ProtectedPhoto';
import type { CallPeerInfo, CallType } from '../../context/CallContext';

interface IncomingCallModalProps {
  peer: CallPeerInfo;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  peer,
  callType,
  onAccept,
  onReject,
}) => {
  const isVideo = callType === 'VIDEO';

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-[#071936]/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#0b2a5b] via-[#0e3573] to-[#132247] text-white shadow-2xl border border-white/15 p-7 text-center">
        {/* Decorative top glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 bg-[#e0102f]/25 blur-3xl pointer-events-none" />

        {/* Privacy badge */}
        <div className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-white/85 font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-[#ff4d6d]" />
          <span>BorKonya Private Call • Number Hidden</span>
        </div>

        {/* Profile Photo with pulsing rings */}
        <div className="relative w-28 h-28 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full bg-[#e0102f]/35 animate-ping" />
          <div className="absolute -inset-2 rounded-full border-2 border-[#ff4d6d]/40 animate-pulse" />
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

        {/* Caller Name & Call Type */}
        <h2 className="text-2xl font-extrabold tracking-tight text-white truncate px-2">
          {peer.full_name}
        </h2>
        <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-semibold text-[#ffd1da]">
          {isVideo ? (
            <>
              <Video className="w-4 h-4 text-[#ff4d6d] animate-bounce" />
              <span>Incoming Video Call</span>
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 text-[#ff4d6d] animate-bounce" />
              <span>Incoming Voice Call</span>
            </>
          )}
        </p>

        {/* Action Buttons: Reject & Accept */}
        <div className="mt-9 flex items-center justify-around gap-6 px-2">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f0213f] to-[#c70a27] hover:from-[#e0102f] hover:to-[#a80720] text-white flex items-center justify-center shadow-lg shadow-[#e0102f]/40 hover:scale-105 active:scale-95 transition-all"
              title="Reject call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-white/80">Reject</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-[#22c55e] to-[#15803d] hover:from-[#16a34a] hover:to-[#14532d] text-white flex items-center justify-center shadow-lg shadow-[#16a34a]/40 hover:scale-105 active:scale-95 transition-all animate-pulse"
              title="Accept call"
            >
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
            <span className="text-xs font-semibold text-white/80">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
