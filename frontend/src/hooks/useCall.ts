import { useCallContext, formatCallTimer } from '../context/CallContext';
export type { CallState, CallType, CallPeerInfo, CallContextValue } from '../context/CallContext';

export function useCall() {
  return useCallContext();
}

export { formatCallTimer };
