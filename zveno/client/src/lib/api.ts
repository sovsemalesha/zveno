const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class Api {
  private token: string | null = null;
  
  setToken(token: string | null) {
    this.token = token;
  }
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
  }
  
  async register(email: string, username: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
  }
  
  async login(email: string, password: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }
  
  async getMe() {
    return this.request<any>('/auth/me');
  }
  
  async getServers() {
    return this.request<any[]>('/servers');
  }
  
  async createServer(name: string, icon?: string) {
    return this.request<any>('/servers', {
      method: 'POST',
      body: JSON.stringify({ name, icon }),
    });
  }
  
  async getServer(id: string) {
    return this.request<any>(`/servers/${id}`);
  }
  
  async joinServer(inviteCode: string) {
    return this.request<any>(`/servers/join/${inviteCode}`, {
      method: 'POST',
    });
  }
  
  async updateServer(id: string, name: string, icon?: string) {
    return this.request<any>(`/servers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, icon }),
    });
  }
  
  async generateInvite(serverId: string) {
    return this.request<{ inviteCode: string }>(`/servers/${serverId}/invite`, {
      method: 'POST',
    });
  }
  
  async kickMember(serverId: string, memberId: string) {
    return this.request<any>(`/servers/${serverId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }
  
  async updateMemberRole(serverId: string, memberId: string, role: 'ADMIN' | 'MODERATOR' | 'USER') {
    return this.request<any>(`/servers/${serverId}/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }
  
  async createChannel(serverId: string, name: string, type: 'TEXT' | 'VOICE' = 'TEXT') {
    return this.request<any>(`/channels/server/${serverId}`, {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  }
  
  async getMessages(channelId: string, limit = 50) {
    return this.request<any[]>(`/messages/channel/${channelId}?limit=${limit}`);
  }
  
  async sendMessage(channelId: string, content: string) {
    return this.request<any>(`/messages/channel/${channelId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
}

export const api = new Api();
