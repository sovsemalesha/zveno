import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface UseVoiceOptions {
  serverId: string;
  channelId: string;
  token: string;
}

interface Participant {
  userId: string;
  producerId?: string;
  consumer?: RTCPeerConnection;
}

export function useVoice({ serverId, channelId, token }: UseVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const producerRef = useRef<RTPProducer | null>(null);
  const consumersRef = useRef<Map<string, RTCConsumer>>(new Map());
  
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });
    
    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('voice:join', { serverId, channelId });
      socket.emit('voice:getRouterRtpCapabilities', serverId);
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    socket.on('voice:transportCreated', async (data) => {
      await setupTransport(socket, data);
    });
    
    socket.on('voice:newProducer', async ({ producerId }) => {
      await consumeProducer(socket, serverId, producerId);
    });
    
    socketRef.current = socket;
    
    return () => {
      socket.disconnect();
    };
  }, [serverId, channelId, token]);
  
  const setupTransport = async (socket: Socket, transportData: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice:addIceCandidate', { candidate: event.candidate });
        }
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('voice:connectTransport', {
        serverId,
        transportId: transportData.id,
        dtlsParameters: pc.localDescription,
      });
      
      producerRef.current = { pc, transportId: transportData.id };
    } catch (err) {
      console.error('Failed to setup transport:', err);
    }
  };
  
  const consumeProducer = async (socket: Socket, serverId: string, producerId: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      
      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
      };
      
      await pc.setRemoteDescription({
        type: 'offer',
        sdp: await fetch(`${SOCKET_URL}/voice/getProducerSdp/${producerId}`).then(r => r.text()),
      });
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('voice:consume', { serverId, producerId, sdpAnswer: pc.localDescription });
      
      consumersRef.current.set(producerId, { pc, producerId });
      setParticipants(prev => [...prev, { userId: producerId, consumer: pc }]);
    } catch (err) {
      console.error('Failed to consume producer:', err);
    }
  };
  
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);
  
  const toggleDeafen = useCallback(() => {
    setIsDeafened(!isDeafened);
  }, [isDeafened]);
  
  return {
    isConnected,
    participants,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    localStream,
  };
}

interface RTPProducer {
  pc: RTCPeerConnection;
  transportId: string;
}

interface RTCConsumer {
  pc: RTCPeerConnection;
  producerId: string;
}
