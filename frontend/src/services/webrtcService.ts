import { fetchWebRTCConfiguration } from './callService';

export interface WebRTCCallbacks {
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;

  /**
   * Requests microphone (and camera for VIDEO calls) permissions.
   * Throws user-friendly error messages when permission is denied or device is missing.
   */
  public async acquireLocalMedia(callType: 'VOICE' | 'VIDEO'): Promise<MediaStream> {
    this.stopLocalMedia();
    const isVideo = callType === 'VIDEO';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        isVideo
          ? 'Camera access is required for video calls. Please allow camera access in your browser settings and try again.'
          : 'Microphone access is required for voice calls. Please allow microphone access in your browser settings and try again.'
      );
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err: any) {
      const errName = err?.name || '';
      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError'
      ) {
        if (isVideo) {
          throw new Error(
            'Camera access is required for video calls. Please allow camera access in your browser settings and try again.'
          );
        }
        throw new Error(
          'Microphone access is required for voice calls. Please allow microphone access in your browser settings and try again.'
        );
      }

      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        throw new Error(
          isVideo
            ? 'No camera or microphone found on your device. Please connect a camera/microphone and try again.'
            : 'No microphone found on your device. Please connect a microphone and try again.'
        );
      }

      throw new Error(
        isVideo
          ? 'Camera access is required for video calls. Please allow camera access in your browser settings and try again.'
          : 'Microphone access is required for voice calls. Please allow microphone access in your browser settings and try again.'
      );
    }
  }

  public hasPeerConnection(): boolean {
    return this.peerConnection !== null && this.peerConnection.connectionState !== 'closed';
  }

  public async createPeerConnection(callbacks: WebRTCCallbacks): Promise<RTCPeerConnection> {
    this.closePeerConnection();
    const rtcConfig = await fetchWebRTCConfiguration();
    const pc = new RTCPeerConnection(rtcConfig);
    this.peerConnection = pc;
    this.remoteStream = new MediaStream();
    this.pendingCandidates = [];
    this.remoteDescriptionSet = false;

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callbacks.onIceCandidate(event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        callbacks.onRemoteStream(event.streams[0]);
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
        callbacks.onRemoteStream(this.remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      callbacks.onConnectionStateChange(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      callbacks.onIceConnectionStateChange?.(pc.iceConnectionState);
    };

    return pc;
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('RTCPeerConnection is not initialized');
    }
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  public async handleOfferAndCreateAnswer(
    offerSdp: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('RTCPeerConnection is not initialized');
    }
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
    this.remoteDescriptionSet = true;
    await this.flushPendingIceCandidates();

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    if (this.peerConnection.signalingState === 'have-local-offer') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
      this.remoteDescriptionSet = true;
      await this.flushPendingIceCandidates();
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!candidate) return;
    if (!this.peerConnection || !this.remoteDescriptionSet) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.remoteDescriptionSet) return;
    const queue = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const cand of queue) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn('Error flushing queued ICE candidate:', err);
      }
    }
  }

  public setAudioEnabled(enabled: boolean): boolean {
    if (!this.localStream) return enabled;
    this.localStream.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
    return enabled;
  }

  public setVideoEnabled(enabled: boolean): boolean {
    if (!this.localStream) return enabled;
    this.localStream.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
    return enabled;
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public stopLocalMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.localStream = null;
    }
  }

  public closePeerConnection(): void {
    this.pendingCandidates = [];
    this.remoteDescriptionSet = false;
    if (this.peerConnection) {
      try {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.close();
      } catch {
        // ignore
      }
      this.peerConnection = null;
    }
    this.remoteStream = null;
  }

  public cleanup(): void {
    this.stopLocalMedia();
    this.closePeerConnection();
  }
}

export const webrtcService = new WebRTCService();
