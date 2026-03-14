import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Server, Channel, Message } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token });
      },
      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

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
