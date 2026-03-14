import { create } from 'zustand';
import { User, Server, Channel, Message } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
}));

if (typeof window !== 'undefined') {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  if (savedToken && savedUser) {
    useAuthStore.setState({ 
      token: savedToken, 
      user: JSON.parse(savedUser) 
    });
  }
}

interface AppState {
  servers: Server[];
  currentServer: Server | null;
  currentChannel: Channel | null;
  setServers: (servers: Server[]) => void;
  setCurrentServer: (server: Server | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  servers: [],
  currentServer: null,
  currentChannel: null,
  setServers: (servers) => set({ servers }),
  setCurrentServer: (server) => set({ currentServer: server }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
}));
