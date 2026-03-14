'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import ServerSidebar from '@/components/ServerSidebar';
import styles from './servers.module.css';

export default function ServersPage() {
  const router = useRouter();
  const { user, logout, isLoaded, loadAuth, setAuth } = useAuthStore();
  const { servers, setServers, setCurrentServer, currentServer } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  useEffect(() => {
    if (!isLoaded) {
      loadAuth();
    }
  }, [isLoaded, loadAuth]);
  
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/login');
    }
  }, [isLoaded, user, router]);
  
  useEffect(() => {
    if (!user) return;
    
    const loadServers = async () => {
      try {
        const data = await api.getServers();
        setServers(data);
      } catch (err) {
        console.error('Failed to load servers:', err);
      }
    };
    
    loadServers();
  }, [user, setServers]);
  
  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const server = await api.createServer(newServerName);
      setServers([...servers, server]);
      setShowCreateModal(false);
      setNewServerName('');
      router.push(`/servers/${server.id}`);
    } catch (err) {
      console.error('Failed to create server:', err);
    }
  };
  
  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const server = await api.joinServer(inviteCode);
      const data = await api.getServers();
      setServers(data);
      setShowJoinModal(false);
      setInviteCode('');
      router.push(`/servers/${server.id}`);
    } catch (err) {
      console.error('Failed to join server:', err);
    }
  };
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  return (
    <div className={styles.layout}>
      <ServerSidebar 
        servers={servers} 
        currentServer={currentServer}
        onServerSelect={(server) => {
          setCurrentServer(server);
          router.push(`/servers/${server.id}`);
        }}
        onCreateServer={() => setShowCreateModal(true)}
        onJoinServer={() => setShowJoinModal(true)}
      />
      
      <main className={styles.main}>
        <div className={styles.content}>
          <h1>Welcome to Zveno</h1>
          <p>Select a server from the sidebar or create a new one</p>
          
          <div className={styles.actions}>
            <button onClick={() => setShowCreateModal(true)} className={styles.button}>
              Create Server
            </button>
            <button onClick={() => setShowJoinModal(true)} className={styles.secondary}>
              Join Server
            </button>
          </div>
        </div>
        
        <div className={styles.userPanel}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}></div>
            <div>
              <p className={styles.username}>{user?.username}</p>
              <p className={styles.userId}>#{user?.id.slice(0, 8)}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logout}>Logout</button>
        </div>
      </main>
      
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Create Server</h2>
            <form onSubmit={handleCreateServer}>
              <input
                type="text"
                placeholder="Server name"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                required
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showJoinModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Join Server</h2>
            <form onSubmit={handleJoinServer}>
              <input
                type="text"
                placeholder="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button type="submit">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
