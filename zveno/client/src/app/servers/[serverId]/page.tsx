'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import { Channel, Message, Member } from '@/types';
import VoicePanel from '@/components/VoicePanel';
import ServerSidebar from '@/components/ServerSidebar';
import styles from './server.module.css';

export default function ServerPage() {
  const router = useRouter();
  const params = useParams();
  const serverId = params.serverId as string;
  
  const { user, logout } = useAuthStore();
  const { currentServer, setCurrentServer, currentChannel, setCurrentChannel } = useAppStore();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'TEXT' | 'VOICE'>('TEXT');
  
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverName, setServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);
  
  const [isInVoice, setIsInVoice] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<{ userId: string; username: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    setMessages([]);
    setCurrentChannel(null);
    loadServer();
  }, [serverId, user]);

  useEffect(() => {
    if (currentChannel) {
      setMessages([]);
      loadMessages(currentChannel.id);
    }
  }, [currentChannel?.id]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const loadServer = async () => {
    try {
      const server = await api.getServer(serverId);
      setCurrentServer(server);
      setChannels(server.channels);
      setMembers(server.members);
      
      if (server.channels.length > 0 && !currentChannel) {
        setCurrentChannel(server.channels[0]);
      }
    } catch (err) {
      console.error('Failed to load server:', err);
      router.push('/servers');
    }
  };
  
  const loadMessages = async (channelId: string) => {
    try {
      const msgs = await api.getMessages(channelId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentChannel) return;
    
    try {
      const msg = await api.sendMessage(currentChannel.id, messageInput);
      setMessages([...messages, msg]);
      setMessageInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  const handleJoinVoice = async (channel: Channel) => {
    setCurrentChannel(channel);
    setIsInVoice(true);
  };
  
  const handleLeaveVoice = () => {
    setIsInVoice(false);
    setVoiceParticipants([]);
  };
  
  const textChannels = channels.filter(c => c.type === 'TEXT');
  const voiceChannels = channels.filter(c => c.type === 'VOICE');
  
  if (!currentServer) {
    return <div className={styles.loading}>Loading...</div>;
  }
  
  return (
    <div className={styles.layout}>
      <ServerSidebar />
      
      <div className={styles.serverBar}>
        <Link href="/servers" className={styles.serverHeader}>
          {currentServer.icon ? (
            <img src={currentServer.icon} alt="" />
          ) : (
            <span>{currentServer.name.charAt(0)}</span>
          )}
          <span>{currentServer.name}</span>
        </Link>
        
        <button className={styles.settingsBtn} onClick={() => setShowServerSettings(true)}>⚙️</button>
        
        {textChannels.length > 0 && (
          <div className={styles.channelGroup}>
            <div className={styles.channelGroupHeader}>
              <span>TEXT CHANNELS</span>
              <button onClick={() => setShowCreateChannel(true)}>+</button>
            </div>
            {textChannels.map(channel => (
              <div
                key={channel.id}
                className={`${styles.channel} ${currentChannel?.id === channel.id ? styles.active : ''}`}
                onClick={() => setCurrentChannel(channel)}
                style={{ cursor: 'pointer' }}
              >
                # {channel.name}
              </div>
            ))}
          </div>
        )}
        
        {voiceChannels.length > 0 && (
          <div className={styles.channelGroup}>
            <div className={styles.channelGroupHeader}>
              <span>VOICE CHANNELS</span>
            </div>
            {voiceChannels.map(channel => (
              <div
                key={channel.id}
                className={`${styles.channel} ${styles.voice} ${currentChannel?.id === channel.id ? styles.active : ''} ${isInVoice && currentChannel?.id === channel.id ? styles.voiceActive : ''}`}
                onClick={() => handleJoinVoice(channel)}
              >
                🔊 {channel.name}
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.userPanel}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.username.charAt(0)}</div>
            <div>
              <div className={styles.username}>{user?.username}</div>
            </div>
          </div>
          <button className={styles.logout} onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      <div className={styles.main}>
        {currentChannel && (
          <div className={styles.chatHeader}>
            <div className={styles.channelTitle}>
              <span>{currentChannel.type === 'TEXT' ? '#' : '🔊'}</span>
              <span>{currentChannel.name}</span>
            </div>
          </div>
        )}
        
        {currentChannel?.type === 'TEXT' ? (
          <>
            <div className={styles.messages} ref={messagesContainerRef}>
              {messages.map(msg => (
                <div key={msg.id} className={styles.message}>
                  <div className={styles.messageAvatar}>
                    {msg.user.avatar ? (
                      <img src={msg.user.avatar} alt="" />
                    ) : (
                      <span>{msg.user.username.charAt(0)}</span>
                    )}
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageUsername}>{msg.user.username}</span>
                      <span className={styles.messageTime}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className={styles.messageForm}>
              <input
                type="text"
                placeholder={`Message #${currentChannel?.name}`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
            </form>
          </>
        ) : currentChannel?.type === 'VOICE' ? (
          <div className={styles.voiceChat}>
            <p>Voice Channel: {currentChannel?.name}</p>
          </div>
        ) : null}
        
        {isInVoice && currentChannel?.type === 'VOICE' && (
          <VoicePanel
            channelId={currentChannel.id}
            participants={voiceParticipants}
            isMuted={isMuted}
            isDeafened={isDeafened}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleDeafen={() => setIsDeafened(!isDeafened)}
            onLeave={handleLeaveVoice}
          />
        )}
      </div>
      
      <div className={styles.members}>
        <div className={styles.membersHeader}>MEMBERS</div>
        {members.map(member => (
          <div key={member.id} className={styles.member} onClick={() => setShowMemberMenu(member.id)}>
            <div className={styles.memberAvatar}>
              <span>{member.userId.charAt(0)}</span>
            </div>
            <div className={styles.memberInfo}>
              <span className={styles.memberName}>{member.userId.slice(0, 8)}</span>
              <span className={styles.memberRole}>{member.role}</span>
            </div>
          </div>
        ))}
      </div>
      
      {showCreateChannel && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Create Channel</h2>
            <input
              type="text"
              placeholder="Channel name"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
            />
            <select value={newChannelType} onChange={(e) => setNewChannelType(e.target.value as 'TEXT' | 'VOICE')}>
              <option value="TEXT">Text</option>
              <option value="VOICE">Voice</option>
            </select>
            <div className={styles.modalActions}>
              <button onClick={() => setShowCreateChannel(false)}>Cancel</button>
              <button onClick={async () => {
                try {
                  await api.createChannel(serverId, newChannelName, newChannelType);
                  loadServer();
                  setShowCreateChannel(false);
                  setNewChannelName('');
                } catch (err) {
                  console.error('Failed to create channel:', err);
                }
              }}>Create</button>
            </div>
          </div>
        </div>
      )}
      
      {showServerSettings && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Server Settings</h2>
            <input
              type="text"
              placeholder="Server name"
              value={serverName || currentServer.name}
              onChange={(e) => setServerName(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setShowServerSettings(false)}>Cancel</button>
              <button onClick={async () => {
                try {
                  await api.updateServer(serverId, serverName || currentServer.name);
                  loadServer();
                  setShowServerSettings(false);
                } catch (err) {
                  console.error('Failed to update server:', err);
                }
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      {showInviteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Invite Link</h2>
            <p className={styles.inviteCode}>{inviteCode}</p>
            <p className={styles.inviteHint}>Share this code with others to join your server!</p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowInviteModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
