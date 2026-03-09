export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
}

export interface Server {
  id: string;
  name: string;
  icon?: string | null;
  inviteCode: string;
  channels: Channel[];
  members: Member[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  position: number;
  serverId: string;
}

export interface Member {
  id: string;
  role: 'ADMIN' | 'MODERATOR' | 'USER';
  userId: string;
  serverId: string;
  voiceChannelId?: string | null;
  user: User;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  channelId: string;
  userId: string;
  user: User;
}
