import { getAuthToken } from '../lib/authApi';

export type CallSignalEventType =
  | 'call.initiate'
  | 'call.ringing'
  | 'call.accept'
  | 'call.reject'
  | 'call.busy'
  | 'call.cancel'
  | 'call.offer'
  | 'call.answer'
  | 'call.ice_candidate'
  | 'call.connected'
  | 'call.end'
  | 'call.failed'
  | 'call.media_state'
  | 'pong';

export interface CallSignalEvent {
  type: CallSignalEventType;
  call_id?: string;
  caller_id?: string;
  caller_name?: string;
  caller_first_name?: string;
  caller_photo?: string | null;
  caller_gender?: string;
  receiver_id?: string;
  receiver_name?: string;
  receiver_first_name?: string;
  receiver_photo?: string | null;
  sender_id?: string;
  call_type?: 'VOICE' | 'VIDEO';
  conversation_id?: string;
  status?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  duration?: number;
  reason?: string;
  message?: string;
  audio_enabled?: boolean;
  video_enabled?: boolean;
  answered_at?: string;
}

type SignalListener = (event: CallSignalEvent) => void;

const FORBIDDEN_FIELDS = new Set([
  'phone_number',
  'mobile_number',
  'personal_contact_number',
  'phone',
  'mobile',
]);

import { API_BASE_URL } from '../lib/config';

function resolveWebSocketBaseUrl(): string {
  const explicitWs = import.meta.env.VITE_WS_URL || import.meta.env.Backend_WS_URL || import.meta.env.BACKEND_WS_URL;
  if (explicitWs) return explicitWs;

  const apiUrl = API_BASE_URL;
  try {
    const parsed = new URL(apiUrl);
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${parsed.host}/ws/calls`;
  } catch {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//localhost:8000/ws/calls`;
  }
}

class CallWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Set<SignalListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = false;
  private reconnectAttempts = 0;

  public connect(): void {
    const token = getAuthToken();
    if (!token) return;

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.shouldReconnect = true;
    const baseUrl = resolveWebSocketBaseUrl();
    const separator = baseUrl.includes('?') ? '&' : '?';
    const wsUrl = `${baseUrl}${separator}token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (msgEvent) => {
        try {
          const parsed = JSON.parse(msgEvent.data) as CallSignalEvent;
          if (!parsed || !parsed.type) return;
          // Sanitize any accidental phone fields
          for (const key of Object.keys(parsed)) {
            if (FORBIDDEN_FIELDS.has(key.toLowerCase())) {
              delete (parsed as any)[key];
            }
          }
          this.listeners.forEach((listener) => {
            try {
              listener(parsed);
            } catch (err) {
              console.error('Error in call signal listener:', err);
            }
          });
        } catch {
          // Ignore malformed non-JSON frames
        }
      };

      this.ws.onclose = (ev) => {
        this.stopHeartbeat();
        this.ws = null;
        // Do not reconnect if policy violation / auth failure (1008)
        if (this.shouldReconnect && ev.code !== 1008) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
          this.reconnectAttempts += 1;
          this.reconnectTimer = setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = () => {
        // Error is followed by onclose which schedules reconnect
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  public send(payload: Record<string, any>): boolean {
    // Strip any forbidden phone fields before sending
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (!FORBIDDEN_FIELDS.has(k.toLowerCase()) && v !== undefined) {
        cleanPayload[k] = v;
      }
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      // Retry shortly once socket opens
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(cleanPayload));
        }
      }, 350);
      return false;
    }

    this.ws.send(JSON.stringify(cleanPayload));
    return true;
  }

  public subscribe(listener: SignalListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isConnected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const websocketService = new CallWebSocketService();
