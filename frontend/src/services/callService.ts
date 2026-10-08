import { getAuthHeaders } from '../lib/authApi';
import { API_BASE_URL } from '../lib/config';

export interface CallHistoryEntry {
  id: string;
  caller_id: string;
  receiver_id: string;
  conversation_id?: string;
  call_type: 'VOICE' | 'VIDEO';
  status: string;
  is_outgoing: boolean;
  other_profile_id: string;
  other_name: string;
  other_photo_url?: string | null;
  other_gender?: string;
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  duration: number;
  created_at: string;
}

/**
 * Fetches centralized WebRTC STUN & short-lived TURN configuration from the backend.
 * Never hardcodes TURN credentials in the frontend.
 */
export async function fetchWebRTCConfiguration(): Promise<RTCConfiguration> {
  const defaultStunUrls = (
    import.meta.env.VITE_STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302'
  )
    .split(',')
    .map((u: string) => u.trim())
    .filter(Boolean);

  const fallbackConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.relay.metered.ca:80' },
      ...defaultStunUrls.map((urls: string) => ({ urls })),
      {
        urls: [
          'turn:global.relay.metered.ca:80',
          'turn:global.relay.metered.ca:80?transport=tcp',
          'turn:global.relay.metered.ca:443',
          'turns:global.relay.metered.ca:443?transport=tcp',
        ],
        username: '2d6f532140885f340c97d232',
        credential: 'lYAb1mssOpEcBNHC',
      },
    ],
    iceCandidatePoolSize: 10,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/calls/webrtc-config`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) return fallbackConfig;
    const data = await res.json();
    if (data && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      return {
        iceServers: data.iceServers,
        iceCandidatePoolSize: 10,
      };
    }
  } catch {
    // Use fallback STUN servers if offline or endpoint unreachable
  }
  return fallbackConfig;
}

export async function fetchCallHistory(conversationId?: string): Promise<CallHistoryEntry[]> {
  const url = conversationId
    ? `${API_BASE_URL}/calls/history?conversation_id=${encodeURIComponent(conversationId)}`
    : `${API_BASE_URL}/calls/history`;
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) return [];
  return res.json();
}

/**
 * Subtle, pleasant Web Audio API Ringtone & Ringback synthesizer.
 * Stops immediately when accepted, rejected, cancelled, or timed out.
 */
class CallAudioToneManager {
  private audioCtx: AudioContext | null = null;
  private toneInterval: ReturnType<typeof setInterval> | null = null;
  private activeOscillators: OscillatorNode[] = [];

  private ensureContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private playChimeNote(freq1: number, freq2: number, durationMs: number, gainVal = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, now);
      osc2.frequency.setValueAtTime(freq2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationMs / 1000 + 0.02);
      osc2.stop(now + durationMs / 1000 + 0.02);

      this.activeOscillators.push(osc1, osc2);
    } catch {
      // Ignore if browser autoplay policy blocks before interaction
    }
  }

  /**
   * Plays a gentle, melodic incoming call ringtone.
   */
  public startIncomingRingtone(): void {
    this.stopAllTones();
    const triggerRingPattern = () => {
      this.playChimeNote(523.25, 659.25, 320, 0.09); // C5 + E5
      setTimeout(() => {
        if (this.toneInterval) {
          this.playChimeNote(587.33, 783.99, 420, 0.09); // D5 + G5
        }
      }, 360);
    };
    triggerRingPattern();
    this.toneInterval = setInterval(triggerRingPattern, 2400);
  }

  /**
   * Plays a soft outgoing ringback tone while waiting for receiver.
   */
  public startOutgoingRingback(): void {
    this.stopAllTones();
    const triggerRingback = () => {
      this.playChimeNote(440, 480, 750, 0.045);
    };
    triggerRingback();
    this.toneInterval = setInterval(triggerRingback, 3000);
  }

  /**
   * Immediately stops any active ringtone or ringback tone.
   */
  public stopAllTones(): void {
    if (this.toneInterval) {
      clearInterval(this.toneInterval);
      this.toneInterval = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.activeOscillators = [];
  }
}

export const callToneManager = new CallAudioToneManager();
