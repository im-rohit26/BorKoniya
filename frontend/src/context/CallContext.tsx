import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { websocketService, type CallSignalEvent } from '../services/websocketService';
import { webrtcService } from '../services/webrtcService';
import { callToneManager } from '../services/callService';

export type CallState =
  | 'IDLE'
  | 'INITIATING'
  | 'INCOMING'
  | 'RINGING'
  | 'ACCEPTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ENDED'
  | 'REJECTED'
  | 'MISSED'
  | 'BUSY'
  | 'CANCELLED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'OFFLINE';

export type CallType = 'VOICE' | 'VIDEO';

export interface CallPeerInfo {
  profile_id: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  photo_url?: string | null;
  gender?: string;
  conversation_id?: string;
}

export interface CallContextValue {
  callState: CallState;
  callId: string | null;
  callType: CallType;
  isOutgoing: boolean;
  remotePeer: CallPeerInfo | null;
  statusMessage: string | null;
  permissionError: string | null;
  callDuration: number;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  remoteMuted: boolean;
  remoteCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startVoiceCall: (peer: CallPeerInfo, conversationId?: string) => Promise<void>;
  startVideoCall: (peer: CallPeerInfo, conversationId?: string) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  cancelOutgoingCall: () => void;
  endActiveCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  clearPermissionError: () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function formatCallTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [callState, setCallState] = useState<CallState>('IDLE');
  const [callId, setCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<CallType>('VOICE');
  const [isOutgoing, setIsOutgoing] = useState<boolean>(true);
  const [remotePeer, setRemotePeer] = useState<CallPeerInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);
  const [remoteMuted, setRemoteMuted] = useState<boolean>(false);
  const [remoteCameraOff, setRemoteCameraOff] = useState<boolean>(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const callStateRef = useRef<CallState>('IDLE');
  const callIdRef = useRef<string | null>(null);
  const callTypeRef = useRef<CallType>('VOICE');
  const isOutgoingRef = useRef<boolean>(true);
  const remotePeerRef = useRef<CallPeerInfo | null>(null);
  const bufferedOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateCallState = useCallback((nextState: CallState) => {
    callStateRef.current = nextState;
    setCallState(nextState);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const clearClientRingTimeout = useCallback(() => {
    if (clientRingTimeoutRef.current) {
      clearTimeout(clientRingTimeoutRef.current);
      clientRingTimeoutRef.current = null;
    }
  }, []);

  const notifyChatRefresh = useCallback((convId?: string) => {
    window.dispatchEvent(
      new CustomEvent('borkonya:call-ended', {
        detail: { conversationId: convId || remotePeerRef.current?.conversation_id },
      })
    );
  }, []);

  const resetToIdle = useCallback(
    (delayMs = 0, convId?: string) => {
      callToneManager.stopAllTones();
      clearClientRingTimeout();
      stopDurationTimer();
      webrtcService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      bufferedOfferRef.current = null;

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      notifyChatRefresh(convId);

      if (delayMs <= 0) {
        updateCallState('IDLE');
        callIdRef.current = null;
        setCallId(null);
        setStatusMessage(null);
        setRemotePeer(null);
        remotePeerRef.current = null;
        setCallDuration(0);
        setIsMuted(false);
        setIsCameraOff(false);
        setRemoteMuted(false);
        setRemoteCameraOff(false);
      } else {
        resetTimerRef.current = setTimeout(() => {
          updateCallState('IDLE');
          callIdRef.current = null;
          setCallId(null);
          setStatusMessage(null);
          setRemotePeer(null);
          remotePeerRef.current = null;
          setCallDuration(0);
          setIsMuted(false);
          setIsCameraOff(false);
          setRemoteMuted(false);
          setRemoteCameraOff(false);
        }, delayMs);
      }
    },
    [clearClientRingTimeout, notifyChatRefresh, stopDurationTimer, updateCallState]
  );

  const setupPeerConnection = useCallback(
    async (activeCallId: string) => {
      await webrtcService.createPeerConnection({
        onIceCandidate: (candidate) => {
          websocketService.send({
            type: 'call.ice_candidate',
            call_id: activeCallId,
            candidate,
          });
        },
        onRemoteStream: (stream) => {
          setRemoteStream(new MediaStream(stream.getTracks()));
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            callToneManager.stopAllTones();
            clearClientRingTimeout();
            if (callStateRef.current !== 'CONNECTED') {
              updateCallState('CONNECTED');
              setStatusMessage('Connected');
              startDurationTimer();
              websocketService.send({
                type: 'call.connected',
                call_id: activeCallId,
              });
            }
          } else if (state === 'failed' || state === 'disconnected') {
            if (state === 'failed' && callStateRef.current !== 'IDLE') {
              websocketService.send({
                type: 'call.failed',
                call_id: activeCallId,
                reason: 'webrtc_connection_failed',
              });
              updateCallState('FAILED');
              setStatusMessage('Connection lost. Call ended.');
              resetToIdle(2200);
            }
          }
        },
      });
    },
    [clearClientRingTimeout, resetToIdle, startDurationTimer, updateCallState]
  );

  // Connect WebSocket when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      websocketService.disconnect();
      return;
    }

    websocketService.connect();

    const unsubscribe = websocketService.subscribe(async (event: CallSignalEvent) => {
      switch (event.type) {
        case 'call.initiate': {
          // Incoming call for Receiver (User B)
          if (callStateRef.current !== 'IDLE') {
            if (event.call_id) {
              websocketService.send({
                type: 'call.busy',
                call_id: event.call_id,
              });
            }
            return;
          }

          const incomingCallId = event.call_id || null;
          const incomingType: CallType = event.call_type === 'VIDEO' ? 'VIDEO' : 'VOICE';
          const callerFirst = event.caller_first_name || event.caller_name?.split(' ')[0] || 'Member';
          const callerFull = event.caller_name || callerFirst;

          const peer: CallPeerInfo = {
            profile_id: event.caller_id || '',
            first_name: callerFirst,
            full_name: callerFull,
            photo_url: event.caller_photo,
            gender: event.caller_gender,
            conversation_id: event.conversation_id,
          };

          callIdRef.current = incomingCallId;
          setCallId(incomingCallId);
          callTypeRef.current = incomingType;
          setCallType(incomingType);
          isOutgoingRef.current = false;
          setIsOutgoing(false);
          remotePeerRef.current = peer;
          setRemotePeer(peer);
          setIsMuted(false);
          setIsCameraOff(false);
          setRemoteMuted(false);
          setRemoteCameraOff(false);
          setStatusMessage(
            incomingType === 'VIDEO' ? 'Incoming Video Call' : 'Incoming Voice Call'
          );
          updateCallState('INCOMING');
          callToneManager.startIncomingRingtone();

          // Acknowledge ringing to caller
          if (incomingCallId) {
            websocketService.send({
              type: 'call.ringing',
              call_id: incomingCallId,
            });
          }
          break;
        }

        case 'call.ringing': {
          if (isOutgoingRef.current && ['INITIATING', 'RINGING'].includes(callStateRef.current)) {
            if (event.call_id) {
              callIdRef.current = event.call_id;
              setCallId(event.call_id);
            }
            if (callStateRef.current !== 'RINGING') {
              updateCallState('RINGING');
              setStatusMessage('Ringing...');
              callToneManager.startOutgoingRingback();
            }
          }
          break;
        }

        case 'call.accept': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          const activeId = event.call_id || callIdRef.current;
          if (!activeId) return;

          updateCallState('CONNECTING');
          setStatusMessage('Connecting...');

          if (isOutgoingRef.current) {
            try {
              await setupPeerConnection(activeId);
              const offer = await webrtcService.createOffer();
              websocketService.send({
                type: 'call.offer',
                call_id: activeId,
                sdp: offer,
              });
            } catch (err) {
              console.error('Failed to create WebRTC offer:', err);
              websocketService.send({
                type: 'call.failed',
                call_id: activeId,
                reason: 'offer_creation_failed',
              });
              updateCallState('FAILED');
              setStatusMessage('Call failed to connect');
              resetToIdle(2200, event.conversation_id);
            }
          }
          break;
        }

        case 'call.offer': {
          if (!event.sdp) return;
          const activeId = event.call_id || callIdRef.current;
          if (!activeId) return;

          // If receiver has already accepted and initialized local stream, answer immediately;
          // otherwise buffer the offer until receiver clicks Accept.
          if (
            !isOutgoingRef.current &&
            ['ACCEPTED', 'CONNECTING', 'CONNECTED'].includes(callStateRef.current)
          ) {
            try {
              await setupPeerConnection(activeId);
              const answer = await webrtcService.handleOfferAndCreateAnswer(event.sdp);
              websocketService.send({
                type: 'call.answer',
                call_id: activeId,
                sdp: answer,
              });
            } catch (err) {
              console.error('Failed to handle offer:', err);
            }
          } else {
            bufferedOfferRef.current = event.sdp;
          }
          break;
        }

        case 'call.answer': {
          if (!event.sdp) return;
          try {
            await webrtcService.handleAnswer(event.sdp);
          } catch (err) {
            console.error('Failed to set remote answer:', err);
          }
          break;
        }

        case 'call.ice_candidate': {
          if (event.candidate) {
            await webrtcService.addIceCandidate(event.candidate);
          }
          break;
        }

        case 'call.connected': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          if (callStateRef.current !== 'CONNECTED') {
            updateCallState('CONNECTED');
            setStatusMessage('Connected');
            startDurationTimer();
          }
          break;
        }

        case 'call.media_state': {
          if (typeof event.audio_enabled === 'boolean') {
            setRemoteMuted(!event.audio_enabled);
          }
          if (typeof event.video_enabled === 'boolean') {
            setRemoteCameraOff(!event.video_enabled);
          }
          break;
        }

        case 'call.reject': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          updateCallState('REJECTED');
          const peerFirst = remotePeerRef.current?.first_name || 'Member';
          setStatusMessage(event.message || `${peerFirst} declined the call.`);
          resetToIdle(2200, event.conversation_id);
          break;
        }

        case 'call.busy': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          updateCallState('BUSY');
          const peerFirst =
            event.receiver_name || remotePeerRef.current?.first_name || 'Member';
          setStatusMessage(
            event.message || `${peerFirst} is currently on another call.`
          );
          resetToIdle(2800, event.conversation_id);
          break;
        }

        case 'call.cancel': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          updateCallState('CANCELLED');
          setStatusMessage('Call cancelled');
          resetToIdle(1500, event.conversation_id);
          break;
        }

        case 'call.end': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          if (event.reason === 'timeout') {
            updateCallState('TIMEOUT');
            setStatusMessage('No answer');
            setTimeout(() => {
              setStatusMessage('Call ended');
            }, 1200);
            resetToIdle(2500, event.conversation_id);
          } else {
            updateCallState('ENDED');
            setStatusMessage(event.message || 'Call ended');
            resetToIdle(1800, event.conversation_id);
          }
          break;
        }

        case 'call.failed': {
          callToneManager.stopAllTones();
          clearClientRingTimeout();
          const reason = event.reason || '';
          const peerFirst =
            event.receiver_name || remotePeerRef.current?.first_name || 'Member';
          if (reason === 'OFFLINE') {
            updateCallState('OFFLINE');
            setStatusMessage(event.message || `${peerFirst} is currently offline.`);
            resetToIdle(2800, event.conversation_id);
          } else if (reason === 'RECEIVER_BUSY') {
            updateCallState('BUSY');
            setStatusMessage(
              event.message || `${peerFirst} is currently on another call.`
            );
            resetToIdle(2800, event.conversation_id);
          } else {
            updateCallState('FAILED');
            setStatusMessage(event.message || 'Call could not be completed.');
            resetToIdle(2800, event.conversation_id);
          }
          break;
        }

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    isAuthenticated,
    user,
    clearClientRingTimeout,
    resetToIdle,
    setupPeerConnection,
    startDurationTimer,
    updateCallState,
  ]);

  const initiateCallInternal = useCallback(
    async (peer: CallPeerInfo, type: CallType, conversationId?: string) => {
      if (callStateRef.current !== 'IDLE') return;
      setPermissionError(null);

      // 1. Request microphone (and camera for video) permissions first
      let stream: MediaStream;
      try {
        stream = await webrtcService.acquireLocalMedia(type);
        setLocalStream(stream);
      } catch (err: any) {
        const msg =
          err?.message ||
          (type === 'VIDEO'
            ? 'Camera access is required for video calls. Please allow camera access in your browser settings and try again.'
            : 'Microphone access is required for voice calls. Please allow microphone access in your browser settings and try again.');
        setPermissionError(msg);
        return;
      }

      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }

      const peerWithConv: CallPeerInfo = {
        ...peer,
        conversation_id: conversationId || peer.conversation_id,
      };

      callTypeRef.current = type;
      setCallType(type);
      isOutgoingRef.current = true;
      setIsOutgoing(true);
      remotePeerRef.current = peerWithConv;
      setRemotePeer(peerWithConv);
      setIsMuted(false);
      setIsCameraOff(false);
      setRemoteMuted(false);
      setRemoteCameraOff(false);
      setCallDuration(0);

      updateCallState('INITIATING');
      setStatusMessage(`Calling ${peer.first_name}...`);

      websocketService.send({
        type: 'call.initiate',
        receiver_id: peer.profile_id,
        call_type: type,
        conversation_id: peerWithConv.conversation_id,
      });

      // Client-side safety timeout (46s) in case connection drops during ringing
      clearClientRingTimeout();
      clientRingTimeoutRef.current = setTimeout(() => {
        if (['INITIATING', 'RINGING'].includes(callStateRef.current)) {
          if (callIdRef.current) {
            websocketService.send({
              type: 'call.cancel',
              call_id: callIdRef.current,
            });
          }
          updateCallState('TIMEOUT');
          setStatusMessage('No answer');
          setTimeout(() => setStatusMessage('Call ended'), 1200);
          resetToIdle(2500, peerWithConv.conversation_id);
        }
      }, 46000);
    },
    [clearClientRingTimeout, resetToIdle, updateCallState]
  );

  const startVoiceCall = useCallback(
    async (peer: CallPeerInfo, conversationId?: string) => {
      await initiateCallInternal(peer, 'VOICE', conversationId);
    },
    [initiateCallInternal]
  );

  const startVideoCall = useCallback(
    async (peer: CallPeerInfo, conversationId?: string) => {
      await initiateCallInternal(peer, 'VIDEO', conversationId);
    },
    [initiateCallInternal]
  );

  const acceptIncomingCall = useCallback(async () => {
    const activeId = callIdRef.current;
    if (!activeId || callStateRef.current !== 'INCOMING') return;

    callToneManager.stopAllTones();
    setPermissionError(null);

    try {
      const stream = await webrtcService.acquireLocalMedia(callTypeRef.current);
      setLocalStream(stream);
    } catch (err: any) {
      const msg =
        err?.message ||
        (callTypeRef.current === 'VIDEO'
          ? 'Camera access is required for video calls. Please allow camera access in your browser settings and try again.'
          : 'Microphone access is required for voice calls. Please allow microphone access in your browser settings and try again.');
      setPermissionError(msg);
      websocketService.send({
        type: 'call.reject',
        call_id: activeId,
        reason: 'media_permission_denied',
      });
      resetToIdle(0);
      return;
    }

    updateCallState('CONNECTING');
    setStatusMessage('Connecting...');

    await setupPeerConnection(activeId);

    websocketService.send({
      type: 'call.accept',
      call_id: activeId,
    });

    if (bufferedOfferRef.current) {
      try {
        const answer = await webrtcService.handleOfferAndCreateAnswer(bufferedOfferRef.current);
        bufferedOfferRef.current = null;
        websocketService.send({
          type: 'call.answer',
          call_id: activeId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Failed to answer buffered offer:', err);
      }
    }
  }, [resetToIdle, setupPeerConnection, updateCallState]);

  const rejectIncomingCall = useCallback(() => {
    const activeId = callIdRef.current;
    callToneManager.stopAllTones();
    if (activeId) {
      websocketService.send({
        type: 'call.reject',
        call_id: activeId,
      });
    }
    resetToIdle(0);
  }, [resetToIdle]);

  const cancelOutgoingCall = useCallback(() => {
    const activeId = callIdRef.current;
    callToneManager.stopAllTones();
    clearClientRingTimeout();
    if (activeId) {
      websocketService.send({
        type: 'call.cancel',
        call_id: activeId,
      });
    }
    updateCallState('ENDED');
    setStatusMessage('Call ended');
    resetToIdle(900);
  }, [clearClientRingTimeout, resetToIdle, updateCallState]);

  const endActiveCall = useCallback(() => {
    const activeId = callIdRef.current;
    callToneManager.stopAllTones();
    clearClientRingTimeout();
    if (activeId) {
      if (['INITIATING', 'RINGING'].includes(callStateRef.current) && isOutgoingRef.current) {
        websocketService.send({
          type: 'call.cancel',
          call_id: activeId,
        });
      } else {
        websocketService.send({
          type: 'call.end',
          call_id: activeId,
        });
      }
    }
    updateCallState('ENDED');
    setStatusMessage('Call ended');
    resetToIdle(1200);
  }, [clearClientRingTimeout, resetToIdle, updateCallState]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      webrtcService.setAudioEnabled(!nextMuted);
      if (callIdRef.current) {
        websocketService.send({
          type: 'call.media_state',
          call_id: callIdRef.current,
          audio_enabled: !nextMuted,
          video_enabled: !isCameraOff,
        });
      }
      return nextMuted;
    });
  }, [isCameraOff]);

  const toggleCamera = useCallback(() => {
    if (callTypeRef.current !== 'VIDEO') return;
    setIsCameraOff((prev) => {
      const nextOff = !prev;
      webrtcService.setVideoEnabled(!nextOff);
      if (callIdRef.current) {
        websocketService.send({
          type: 'call.media_state',
          call_id: callIdRef.current,
          audio_enabled: !isMuted,
          video_enabled: !nextOff,
        });
      }
      return nextOff;
    });
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  const clearPermissionError = useCallback(() => {
    setPermissionError(null);
  }, []);

  return (
    <CallContext.Provider
      value={{
        callState,
        callId,
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
        startVoiceCall,
        startVideoCall,
        acceptIncomingCall,
        rejectIncomingCall,
        cancelOutgoingCall,
        endActiveCall,
        toggleMute,
        toggleCamera,
        toggleSpeaker,
        clearPermissionError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export function useCallContext(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return ctx;
}
