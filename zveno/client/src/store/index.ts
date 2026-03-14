import { create } from 'zustand';
import { User, Server, Channel } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoaded: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoaded: false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, token, isLoaded: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    set({ user: null, token: null, isLoaded: true });
  },
  loadAuth: () => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (savedToken && savedUser) {
        set({ token: savedToken, user: JSON.parse(savedUser), isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } else {
      set({ isLoaded: true });
    }
  },
}));

interface AppState {
  servers: Server[];
  currentServer: Server | null;
  currentChannel: Channel | null;
  setServers: (servers: Server[]) => void;
  setCurrentServer: (server: Server | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
}

const initialState = {
  servers: [] as Server[],
  currentServer: null as Server | null,
  currentChannel: null as Channel | null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setServers: (servers) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('servers', JSON.stringify(servers));
    }
    set({ servers });
  },
  setCurrentServer: (server) => set({ currentServer: server }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
}));

if (typeof window !== 'undefined') {
  const savedServers = localStorage.getItem('servers');
  if (savedServers) {
    useAppStore.setState({ servers: JSON.parse(savedServers) });
  }
}
