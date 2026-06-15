'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { iceServers } from '@/lib/webrtc';
import { recordCall } from '@/lib/callRecord';
import { useAuth } from './AuthProvider';

export type CallMedia = 'audio' | 'video';
export type CallStatus =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended';
export type CallPeer = { id: string; name: string };

// Signaling messages exchanged over the peer's personal broadcast channel.
type Signal =
  | {
      kind: 'invite';
      callId: string;
      from: CallPeer;
      media: CallMedia;
      sdp: RTCSessionDescriptionInit;
      conversationId?: string;
    }
  | { kind: 'answer'; callId: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; callId: string; candidate: RTCIceCandidateInit }
  | { kind: 'decline'; callId: string }
  | { kind: 'cancel'; callId: string }
  | { kind: 'hangup'; callId: string }
  | { kind: 'reaction'; callId: string; emoji: string }
  | { kind: 'raise'; callId: string; raised: boolean }
  | { kind: 'chat'; callId: string; id: string; text: string; sender: string };

export type CallReaction = { id: string; emoji: string; mine: boolean };
export type CallChatMessage = { id: string; text: string; sender: string; mine: boolean; ts: number };

type CallContextValue = {
  status: CallStatus;
  media: CallMedia;
  peer: CallPeer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  error: string | null;
  /** ms timestamp the call connected, for the live duration timer. */
  connectedAt: number | null;
  /** populated on the brief "Call ended" screen. */
  endedInfo: { peerName: string; duration: number } | null;
  handRaised: boolean;
  peerRaised: boolean;
  reactions: CallReaction[];
  chatMessages: CallChatMessage[];
  conversationId: string | null;
  startCall: (peer: CallPeer, media: CallMedia, conversationId?: string) => void;
  accept: () => void;
  decline: () => void;
  hangup: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleHand: () => void;
  sendReaction: (emoji: string) => void;
  sendChat: (text: string) => void;
};

const CallContext = createContext<CallContextValue | null>(null);

// Inert fallback so components that surface call actions (e.g. ChatHeader) can
// also render outside the provider — like the static /preview fixture.
const IDLE_CALL: CallContextValue = {
  status: 'idle',
  media: 'video',
  peer: null,
  localStream: null,
  remoteStream: null,
  micOn: true,
  camOn: true,
  error: null,
  connectedAt: null,
  endedInfo: null,
  handRaised: false,
  peerRaised: false,
  reactions: [],
  chatMessages: [],
  conversationId: null,
  startCall: () => {},
  accept: () => {},
  decline: () => {},
  hangup: () => {},
  toggleMic: () => {},
  toggleCam: () => {},
  toggleHand: () => {},
  sendReaction: () => {},
  sendChat: () => {},
};

export function useCall(): CallContextValue {
  return useContext(CallContext) ?? IDLE_CALL;
}

function channel(name: string): RealtimeChannel {
  // private: true → gated by RLS on realtime.messages (see the call-signaling
  // migration), so only the two space members can use a call topic.
  return supabase.channel(name, {
    config: { private: true, broadcast: { self: false } },
  });
}

function subscribed(ch: RealtimeChannel): Promise<RealtimeChannel> {
  return new Promise((resolve, reject) => {
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') resolve(ch);
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') reject(new Error(s));
    });
  });
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { userId, profile } = useAuth();

  const [status, setStatus] = useState<CallStatus>('idle');
  const [media, setMedia] = useState<CallMedia>('video');
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [endedInfo, setEndedInfo] = useState<{
    peerName: string;
    duration: number;
  } | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [peerRaised, setPeerRaised] = useState(false);
  const [reactions, setReactions] = useState<CallReaction[]>([]);
  const [chatMessages, setChatMessages] = useState<CallChatMessage[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const peerChanRef = useRef<RealtimeChannel | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const callIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const peerRef = useRef<CallPeer | null>(null);
  const offerRef = useRef<RTCSessionDescriptionInit | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  // for the in-chat call record (only the caller, who knows the conversation)
  const roleRef = useRef<'caller' | 'callee' | null>(null);
  const convIdRef = useRef<string | null>(null);
  const mediaRef = useRef<CallMedia>('video');

  // --- signaling ---
  // active-call channel (caller sets at startCall, callee at accept)
  const openPeerChannel = useCallback(async (peerId: string) => {
    if (peerChanRef.current) return peerChanRef.current;
    peerChanRef.current = await subscribed(channel(`call:user:${peerId}`));
    return peerChanRef.current;
  }, []);

  const signal = useCallback(async (msg: Signal) => {
    await peerChanRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: msg,
    });
  }, []);

  // one-off send (decline/busy) before an active channel exists
  const signalTo = useCallback(async (peerId: string, msg: Signal) => {
    const ch = channel(`call:user:${peerId}`);
    try {
      await subscribed(ch);
      await ch.send({ type: 'broadcast', event: 'signal', payload: msg });
    } catch {
      // best-effort
    } finally {
      void supabase.removeChannel(ch);
    }
  }, []);

  const cleanup = useCallback((next: CallStatus) => {
    const connected = Boolean(connectedAtRef.current);
    const duration = connectedAtRef.current
      ? Math.floor((Date.now() - connectedAtRef.current) / 1000)
      : 0;
    const peerName = peerRef.current?.name ?? '';

    // Drop a call record into the chat (caller side only → no duplicates).
    if (next === 'ended' && roleRef.current === 'caller' && convIdRef.current) {
      void recordCall(
        convIdRef.current,
        userId,
        mediaRef.current,
        connected ? 'completed' : 'missed',
        duration,
      );
    }

    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    if (peerChanRef.current) {
      void supabase.removeChannel(peerChanRef.current);
      peerChanRef.current = null;
    }
    pendingIce.current = [];
    callIdRef.current = null;
    peerIdRef.current = null;
    peerRef.current = null;
    offerRef.current = null;
    connectedAtRef.current = null;
    roleRef.current = null;
    convIdRef.current = null;
    setConnectedAt(null);
    setLocalStream(null);
    setRemoteStream(null);
    setPeer(null);
    setMicOn(true);
    setCamOn(true);
    setHandRaised(false);
    setPeerRaised(false);
    setReactions([]);
    setChatMessages([]);

    if (next === 'ended') {
      setEndedInfo({ peerName, duration });
      setStatus('ended');
      setTimeout(() => {
        setEndedInfo(null);
        setStatus('idle');
      }, 2400);
    } else {
      setStatus(next);
    }
  }, [userId]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    for (const c of pendingIce.current) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        // ignore late/duplicate candidates
      }
    }
    pendingIce.current = [];
  }, []);

  const createPc = useCallback(
    (callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pc.onicecandidate = (e) => {
        if (e.candidate)
          void signal({ kind: 'ice', callId, candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => setRemoteStream(e.streams[0]);
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === 'connected') {
          if (!connectedAtRef.current) {
            connectedAtRef.current = Date.now();
            setConnectedAt(connectedAtRef.current);
          }
          setStatus('active');
        } else if (st === 'failed') {
          void signal({ kind: 'hangup', callId });
          cleanup('ended');
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [signal, cleanup],
  );

  const getMedia = useCallback(async (m: CallMedia) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: m === 'video',
    });
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // --- actions ---
  const startCall = useCallback(
    (p: CallPeer, m: CallMedia, conversationId?: string) => {
      if (status !== 'idle') return;
      setError(null);
      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      peerIdRef.current = p.id;
      peerRef.current = p;
      roleRef.current = 'caller';
      convIdRef.current = conversationId ?? null;
      mediaRef.current = m;
      setPeer(p);
      setMedia(m);
      setCamOn(m === 'video');
      setStatus('outgoing');
      void (async () => {
        try {
          await openPeerChannel(p.id);
          const stream = await getMedia(m);
          const pc = createPc(callId);
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await signal({
            kind: 'invite',
            callId,
            from: { id: userId, name: profile?.display_name ?? 'Unknown' },
            media: m,
            sdp: offer,
            conversationId: conversationId,
          });
        } catch (e) {
          setError(
            e instanceof Error ? e.message : 'Could not start the call.',
          );
          cleanup('idle');
        }
      })();
    },
    [status, openPeerChannel, getMedia, createPc, signal, userId, profile?.display_name, cleanup],
  );

  const accept = useCallback(() => {
    const callId = callIdRef.current;
    const peerId = peerIdRef.current;
    const offer = offerRef.current;
    if (status !== 'incoming' || !callId || !peerId || !offer) return;
    setStatus('connecting');
    void (async () => {
      try {
        await openPeerChannel(peerId);
        const stream = await getMedia(media);
        const pc = createPc(callId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(offer);
        await flushIce();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signal({ kind: 'answer', callId, sdp: answer });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join the call.');
        void signalTo(peerId, { kind: 'decline', callId });
        cleanup('idle');
      }
    })();
  }, [status, media, openPeerChannel, getMedia, createPc, flushIce, signal, signalTo, cleanup]);

  const decline = useCallback(() => {
    const callId = callIdRef.current;
    const peerId = peerIdRef.current;
    if (callId && peerId) void signalTo(peerId, { kind: 'decline', callId });
    cleanup('idle');
  }, [signalTo, cleanup]);

  const hangup = useCallback(() => {
    const callId = callIdRef.current;
    const peerId = peerIdRef.current;
    if (callId) {
      const kind = status === 'outgoing' ? 'cancel' : 'hangup';
      if (peerChanRef.current) void signal({ kind, callId });
      else if (peerId) void signalTo(peerId, { kind, callId });
    }
    cleanup('ended');
  }, [status, signal, signalTo, cleanup]);

  const toggleMic = useCallback(() => {
    const s = localRef.current;
    if (!s) return;
    const on = !micOn;
    s.getAudioTracks().forEach((t) => (t.enabled = on));
    setMicOn(on);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const s = localRef.current;
    if (!s) return;
    const on = !camOn;
    s.getVideoTracks().forEach((t) => (t.enabled = on));
    setCamOn(on);
  }, [camOn]);

  const pushReaction = useCallback((emoji: string, mine: boolean) => {
    const id = crypto.randomUUID();
    setReactions((r) => [...r, { id, emoji, mine }]);
    setTimeout(
      () => setReactions((r) => r.filter((x) => x.id !== id)),
      3500,
    );
  }, []);

  const sendReaction = useCallback(
    (emoji: string) => {
      const callId = callIdRef.current;
      if (!callId) return;
      pushReaction(emoji, true);
      void signal({ kind: 'reaction', callId, emoji });
    },
    [signal, pushReaction],
  );

  const toggleHand = useCallback(() => {
    const callId = callIdRef.current;
    if (!callId) return;
    setHandRaised((prev) => {
      const next = !prev;
      void signal({ kind: 'raise', callId, raised: next });
      return next;
    });
  }, [signal]);

  const sendChat = useCallback(
    (text: string) => {
      const callId = callIdRef.current;
      if (!callId || !text.trim()) return;
      const id = crypto.randomUUID();
      const senderName = profile?.display_name ?? 'You';
      setChatMessages((prev) => [...prev, { id, text: text.trim(), sender: senderName, mine: true, ts: Date.now() }]);
      void signal({ kind: 'chat', callId, id, text: text.trim(), sender: senderName });
    },
    [signal, profile?.display_name],
  );

  // --- incoming signaling (kept in a ref so the channel sub never goes stale) ---
  const handle = (msg: Signal) => {
    if (msg.kind === 'invite') {
      // already busy → politely decline on a transient channel
      if (status !== 'idle' || pcRef.current) {
        void signalTo(msg.from.id, { kind: 'decline', callId: msg.callId });
        return;
      }
      callIdRef.current = msg.callId;
      peerIdRef.current = msg.from.id;
      peerRef.current = msg.from;
      roleRef.current = 'callee';
      mediaRef.current = msg.media;
      convIdRef.current = msg.conversationId ?? null;
      offerRef.current = msg.sdp;
      setPeer(msg.from);
      setMedia(msg.media);
      setCamOn(msg.media === 'video');
      setStatus('incoming');
      return;
    }
    if (!callIdRef.current || msg.callId !== callIdRef.current) return;
    if (msg.kind === 'answer') {
      void (async () => {
        const pc = pcRef.current;
        if (pc) {
          await pc.setRemoteDescription(msg.sdp);
          await flushIce();
        }
      })();
    } else if (msg.kind === 'ice') {
      const pc = pcRef.current;
      if (pc?.remoteDescription) void pc.addIceCandidate(msg.candidate).catch(() => {});
      else pendingIce.current.push(msg.candidate);
    } else if (msg.kind === 'reaction') {
      pushReaction(msg.emoji, false);
    } else if (msg.kind === 'chat') {
      setChatMessages((prev) => [...prev, { id: msg.id, text: msg.text, sender: msg.sender, mine: false, ts: Date.now() }]);
    } else if (msg.kind === 'raise') {
      setPeerRaised(msg.raised);
    } else if (msg.kind === 'decline' || msg.kind === 'cancel' || msg.kind === 'hangup') {
      cleanup('ended');
    }
  };
  const handleRef = useRef(handle);
  useEffect(() => {
    handleRef.current = handle;
  });

  useEffect(() => {
    const inbox = channel(`call:user:${userId}`);
    inbox
      .on('broadcast', { event: 'signal' }, ({ payload }) =>
        handleRef.current(payload as Signal),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(inbox);
    };
  }, [userId]);

  return (
    <CallContext.Provider
      value={{
        status,
        media,
        peer,
        localStream,
        remoteStream,
        micOn,
        camOn,
        error,
        connectedAt,
        endedInfo,
        handRaised,
        peerRaised,
        reactions,
        chatMessages,
        conversationId: convIdRef.current,
        startCall,
        accept,
        decline,
        hangup,
        toggleMic,
        toggleCam,
        toggleHand,
        sendReaction,
        sendChat,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
