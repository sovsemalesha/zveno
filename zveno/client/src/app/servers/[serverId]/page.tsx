'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import { Channel, Message, Member } from '@/types';
import VoicePanel from '@/components/VoicePanel';
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
    
    loadServer();
  }, [serverId, user]);
  
  useEffect(() => {
    if (currentChannel) {
      loadMessages(currentChannel.id);
    }
  }, [currentChannel]);
  
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
  
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const channel = await api.createChannel(serverId, newChannelName, newChannelType);
      setChannels([...channels, channel]);
      setShowCreateChannel(false);
      setNewChannelName('');
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };
  
  const handleJoinVoice = async (channel: Channel) => {
    setCurrentChannel(channel);
    setIsInVoice(true);
    setVoiceParticipants([{ userId: user!.id, username: user!.username }]);
  };
  
  const handleLeaveVoice = () => {
    setIsInVoice(false);
    setVoiceParticipants([]);
  };
  
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const handleToggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };
  
  const textChannels = channels.filter(c => c.type === 'TEXT');
  const voiceChannels = channels.filter(c => c.type === 'VOICE');
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  if (!currentServer) {
    return <div className={styles.loading}>Loading...</div>;
  }
  
  return (
    <div className={styles.layout}>
      <div className={styles.serverBar}>
        <Link href="/servers" className={styles.serverHeader}>
          {currentServer.icon ? (
            <img src={currentServer.icon} alt="" />
          ) : (
            <span>{currentServer.name.charAt(0)}</span>
          )}
          <span>{currentServer.name}</span>
        </Link>
        
        <div className={styles.channels}>
          {textChannels.length > 0 && (
            <div className={styles.channelGroup}>
              <div className={styles.channelGroupHeader}>
                <span>TEXT CHANNELS</span>
                <button onClick={() => setShowCreateChannel(true)}>+</button>
              </div>
              {textChannels.map(channel => (
                <Link
                  key={channel.id}
                  href={`/servers/${serverId}/channels/${channel.id}`}
                  className={`${styles.channel} ${currentChannel?.id === channel.id ? styles.active : ''}`}
                  onClick={() => setCurrentChannel(channel)}
                >
                  # {channel.name}
                </Link>
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
        </div>
      </div>
      
      <div className={styles.main}>
        <div className={styles.chatHeader}>
          <div className={styles.channelTitle}>
            {currentChannel && (
              <>
                <span>{currentChannel.type === 'TEXT' ? '#' : '🔊'}</span>
                <span>{currentChannel.name}</span>
              </>
            )}
          </div>
        </div>
        
        <div className={styles.messages} ref={messagesContainerRef}>
          {currentChannel?.type === 'TEXT' ? (
            messages.map(msg => (
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
            ))
          ) : (
            <div className={styles.voiceChat}>
              <p>Voice Channel: {currentChannel?.name}</p>
              <p className={styles.voiceInfo}>Voice chat coming soon...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {currentChannel?.type === 'TEXT' && (
          <form onSubmit={handleSendMessage} className={styles.messageForm}>
            <input
              type="text"
              placeholder={`Message #${currentChannel?.name}`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
          </form>
        )}
        
        {isInVoice && currentChannel?.type === 'VOICE' && (
          <VoicePanel
            channelId={currentChannel?.id}
            participants={voiceParticipants}
            isMuted={isMuted}
            isDeafened={isDeafened}
            onToggleMute={handleToggleMute}
            onToggleDeafen={handleToggleDeafen}
            onLeave={handleLeaveVoice}
          />
        )}
      </div>
      
      <div className={styles.members}>
        <div className={styles.membersHeader}>MEMBERS</div>
        {members.map(member => (
          <div key={member.id} className={styles.member}>
            <div className={styles.memberAvatar}>
              {member.user.avatar ? (
                <img src={member.user.avatar} alt="" />
              ) : (
                <span>{member.user.username.charAt(0)}</span>
              )}
              <div className={styles.status} />
            </div>
            <div className={styles.memberInfo}>
              <span className={styles.memberName}>{member.user.username}</span>
              <span className={styles.memberRole}>{member.role}</span>
            </div>
          </div>
        ))}
        
        <div className={styles.userPanel}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}></div>
            <div>
              <p className={styles.username}>{user?.username}</p>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logout}>Logout</button>
        </div>
      </div>
      
      {showCreateChannel && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Create Channel</h2>
            <form onSubmit={handleCreateChannel}>
              <input
                type="text"
                placeholder="Channel name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                required
              />
              <select
                value={newChannelType}
                onChange={(e) => setNewChannelType(e.target.value as 'TEXT' | 'VOICE')}
              >
                <option value="TEXT">Text Channel</option>
                <option value="VOICE">Voice Channel</option>
              </select>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateChannel(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
