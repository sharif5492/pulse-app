import { useState, useCallback, useRef, useEffect } from 'react';
import { ActiveCallSession, CallType, User } from '../types';
import { zg } from '../lib/zegoService';
import { audioUtils } from '../lib/audioUtils';

/**
 * useCall hook
 * Manages call lifecycle with strict user acceptance controls:
 * - Do NOT call zg.joinRoom() on component mount.
 * - Only call joinRoom() and startTimer() inside handleAccept() function after user clicks Yes/Accept button.
 * - Keep incoming call ringing until accepted.
 */
export function useCall() {
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<ActiveCallSession | null>(null);
  const timerRef = useRef<any>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveCall((prev) => {
        if (!prev || prev.status !== 'connected') return prev;
        return {
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
        };
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleAccept = useCallback(async (session?: ActiveCallSession) => {
    const targetSession = session || incomingCall;
    if (!targetSession) return;

    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    audioUtils.playCallConnected();

    // Call joinRoom only after user clicks Accept with mirror disabled
    try {
      if (zg) {
        zg.setVideoMirrorMode?.(0);
        zg.setVideoConfig?.({ mirror: false });
        if (typeof zg.joinRoom === 'function') {
          await zg.joinRoom(targetSession.id);
        }
      }
    } catch (err) {
      console.warn('zg.joinRoom error on handleAccept:', err);
    }

    const connectedSession: ActiveCallSession = {
      ...targetSession,
      status: 'connected',
      startedAt: Date.now(),
    };

    setActiveCall(connectedSession);
    setIncomingCall(null);
    startTimer();
  }, [incomingCall, startTimer]);

  const handleReject = useCallback(() => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    audioUtils.playCallEnded();
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(() => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    stopTimer();
    audioUtils.playCallEnded();
    setActiveCall(null);
    setIncomingCall(null);
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
      }
    };
  }, [stopTimer]);

  return {
    activeCall,
    incomingCall,
    setActiveCall,
    setIncomingCall,
    handleAccept,
    handleReject,
    endCall,
    startTimer,
    stopTimer,
  };
}

export default useCall;
