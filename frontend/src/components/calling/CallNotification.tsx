import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useCall } from '../../hooks/useCall';
import { IncomingCallModal } from './IncomingCallModal';
import { OutgoingCallModal } from './OutgoingCallModal';
import { VoiceCallScreen } from './VoiceCallScreen';
import { VideoCallScreen } from './VideoCallScreen';

/**
 * Global Call UI & Notification Orchestrator.
 * Renders IncomingCallModal, OutgoingCallModal, VoiceCallScreen, VideoCallScreen,
 * and Media Permission Error Alerts anywhere in the authenticated application.
 */
export const CallNotification: React.FC = () => {
  const {
    callState,
    callType,
    isOutgoing,
    remotePeer,
    statusMessage,
    permissionError,
    callDuration,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    remoteMuted,
    remoteCameraOff,
    localStream,
    remoteStream,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall,
    endActiveCall,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    clearPermissionError,
  } = useCall();

  return (
    <>
      {/* Media Permission Error Modal / Toast */}
      {permissionError && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-[#0b2a5b]/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#f3c4ca] text-center">
            <div className="w-14 h-14 rounded-full bg-[#fde8ee] text-[#e0102f] flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0b2a5b] mb-2">
              Permission Required
            </h3>
            <p className="text-sm text-[#6b7a99] leading-relaxed mb-6">
              {permissionError}
            </p>
            <button
              type="button"
              onClick={clearPermissionError}
              className="w-full py-2.5 px-6 rounded-full bg-gradient-to-r from-[#0a56e0] to-[#0a3fc0] text-white font-bold text-sm shadow-lg shadow-[#0a56e0]/25 hover:opacity-95 transition-opacity inline-flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. Incoming Call Modal */}
      {callState === 'INCOMING' && remotePeer && (
        <IncomingCallModal
          peer={remotePeer}
          callType={callType}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      )}

      {/* 2. Outgoing / Ringing / Connecting / Ended / Busy / Offline Status Modal */}
      {remotePeer &&
        (isOutgoing || ['CONNECTING', 'ENDED', 'REJECTED', 'BUSY', 'OFFLINE', 'TIMEOUT', 'FAILED', 'CANCELLED'].includes(callState)) &&
        [
          'INITIATING',
          'RINGING',
          'CONNECTING',
          'REJECTED',
          'BUSY',
          'OFFLINE',
          'TIMEOUT',
          'FAILED',
          'CANCELLED',
          'ENDED',
        ].includes(callState) && (
          <OutgoingCallModal
            peer={remotePeer}
            callType={callType}
            callState={callState}
            statusMessage={statusMessage}
            localStream={localStream}
            onCancel={
              ['INITIATING', 'RINGING'].includes(callState)
                ? cancelOutgoingCall
                : endActiveCall
            }
          />
        )}

      {/* 3. Connected Voice Call Screen */}
      {callState === 'CONNECTED' && remotePeer && callType === 'VOICE' && (
        <VoiceCallScreen
          peer={remotePeer}
          statusMessage={statusMessage}
          callDuration={callDuration}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          remoteMuted={remoteMuted}
          remoteStream={remoteStream}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={endActiveCall}
        />
      )}

      {/* 4. Connected Video Call Screen */}
      {callState === 'CONNECTED' && remotePeer && callType === 'VIDEO' && (
        <VideoCallScreen
          peer={remotePeer}
          statusMessage={statusMessage}
          callDuration={callDuration}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isSpeakerOn={isSpeakerOn}
          remoteMuted={remoteMuted}
          remoteCameraOff={remoteCameraOff}
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleSpeaker={toggleSpeaker}
          onEndCall={endActiveCall}
        />
      )}
    </>
  );
};
