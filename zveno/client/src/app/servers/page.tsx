'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import ServerSidebar from '@/components/ServerSidebar';
import styles from './servers.module.css';

export default function ServersPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { servers, setServers, setCurrentServer, currentServer } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    loadServers();
  }, [user]);
  
  const loadServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data);
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  };
  
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
      <ServerSidebar />
      
      <div className={styles.main}>
        <div className={styles.content}>
          <h1 className="glitch" data-text="ZVENO">ZVENO</h1>
          <p>Select a server or create a new one</p>
          
          <div className={styles.actions}>
            <button onClick={() => setShowCreateModal(true)}>+ Create Server</button>
            <button onClick={() => setShowJoinModal(true)} className={styles.secondary}>Join Server</button>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '32px' }}>
            {servers.map(server => (
              <div
                key={server.id}
                onClick={() => {
                  setCurrentServer(server);
                  router.push(`/servers/${server.id}`);
                }}
                style={{
                  width: '120px',
                  height: '120px',
                  background: 'var(--bg-secondary)',
                  border: '2px solid var(--accent)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: '4px',
                }}
              >
                <span style={{ fontSize: '24px', marginBottom: '8px' }}>
                  {server.icon ? <img src={server.icon} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} /> : server.name.charAt(0)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{server.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className={styles.userPanel}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{user?.username.charAt(0)}</div>
          <div>
            <div className={styles.username}>{user?.username}</div>
          </div>
        </div>
        <button className={styles.logout} onClick={handleLogout}>Logout</button>
      </div>
      
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Create Server</h2>
            <input
              type="text"
              placeholder="Server name"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button onClick={handleCreateServer}>Create</button>
            </div>
          </div>
        </div>
      )}
      
      {showJoinModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Join Server</h2>
            <input
              type="text"
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button onClick={handleJoinServer}>Join</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
