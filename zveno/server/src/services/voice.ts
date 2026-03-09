import { types as mediasoupTypes, createWorker, Worker } from 'mediasoup';

interface Room {
  id: string;
  router: mediasoupTypes.Router;
  peers: Map<string, mediasoupTypes.WebRtcTransport>;
}

class VoiceService {
  private worker: Worker | null = null;
  private rooms: Map<string, Room> = new Map();

  async initialize() {
    this.worker = await createWorker({
      logLevel: 'warn',
      dtlsCertificate: {
        commonName: 'zveno',
      },
    });

    this.worker.on('died', () => {
      console.error('Mediasoup worker died');
    });

    console.log('Mediasoup worker initialized');
  }

  async createRoom(serverId: string): Promise<Room> {
    if (this.rooms.has(serverId)) {
      return this.rooms.get(serverId)!;
    }

    const router = await this.worker!.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          channels: 2,
          clockRate: 48000,
          parameters: {
            minptime: 10,
            useinbandfec: 1,
          },
        },
      ],
    });

    const room: Room = {
      id: serverId,
      router,
      peers: new Map(),
    };

    this.rooms.set(serverId, room);
    return room;
  }

  async createTransport(serverId: string, peerId: string): Promise<mediasoupTypes.WebRtcTransport> {
    const room = await this.createRoom(serverId);

    const transport = await room.router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP }],
      initialAvailableOutgoingBitrate: 128000,
      maxIncomingBitrate: 0,
    });

    room.peers.set(peerId, transport);
    return transport;
  }

  async connectTransport(serverId: string, peerId: string, dtlsParameters: mediasoupTypes.DtlsParameters) {
    const room = this.rooms.get(serverId);
    if (!room) throw new Error('Room not found');

    const transport = room.peers.get(peerId);
    if (!transport) throw new Error('Transport not found');

    await transport.connect({ dtlsParameters });
  }

  async createProducer(serverId: string, peerId: string, transportId: string, kind: 'audio', rtpParameters: mediasoupTypes.RtpParameters): Promise<mediasoupTypes.Producer> {
    const room = this.rooms.get(serverId);
    if (!room) throw new Error('Room not found');

    const transport = room.peers.get(peerId);
    if (!transport || transport.id !== transportId) throw new Error('Transport not found');

    const producer = await transport.produce({ kind, rtpParameters });
    return producer;
  }

  async createConsumer(serverId: string, peerId: string, producerId: string): Promise<mediasoupTypes.Consumer> {
    const room = this.rooms.get(serverId);
    if (!room) throw new Error('Room not found');

    const transport = room.peers.get(peerId);
    if (!transport) throw new Error('Transport not found');

    const producer = room.router.producers.get(producerId);
    if (!producer) throw new Error('Producer not found');

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: {
        codecs: [{ mimeType: 'audio/opus', channels: 2 }],
        headerExtensions: [],
      },
    });

    return consumer;
  }

  async disconnectPeer(serverId: string, peerId: string) {
    const room = this.rooms.get(serverId);
    if (!room) return;

    const transport = room.peers.get(peerId);
    if (transport) {
      transport.close();
      room.peers.delete(peerId);
    }

    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(serverId);
    }
  }

  getRoomRtpCapabilities(serverId: string) {
    const room = this.rooms.get(serverId);
    if (!room) return null;
    return room.router.rtpCapabilities;
  }

  getProducers(serverId: string): string[] {
    const room = this.rooms.get(serverId);
    if (!room) return [];
    return Array.from(room.router.producers.keys());
  }
}

export const voiceService = new VoiceService();
