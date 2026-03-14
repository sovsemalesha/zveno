'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/store';
import { api } from '@/lib/api';
import { Message } from '@/types';
import styles from './channel.module.css';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const serverId = params.serverId as string;
  
  const { currentServer, setCurrentServer, currentChannel, setCurrentChannel } = useAppStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!currentServer || currentServer.id !== serverId) {
      loadServer();
    }
    
    if (currentChannel?.id !== channelId) {
      loadChannel();
    }
  }, [serverId, channelId]);
  
  useEffect(() => {
    if (currentChannel) {
      loadMessages();
    }
  }, [currentChannel?.id]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const loadServer = async () => {
    try {
      const server = await api.getServer(serverId);
      setCurrentServer(server);
    } catch (err) {
      console.error('Failed to load server:', err);
    }
  };
  
  const loadChannel = async () => {
    if (!currentServer) return;
    const channel = currentServer.channels.find(c => c.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
    }
  };
  
  const loadMessages = async () => {
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
  
  if (!currentServer || !currentChannel) {
    return <div className={styles.loading}>Loading...</div>;
  }
  
  const isVoice = currentChannel.type === 'VOICE';
  
  return (
    <div className={styles.layout}>
      <div className={styles.chatHeader}>
        <div className={styles.channelTitle}>
          <span>{isVoice ? '🔊' : '#'}</span>
          <span>{currentChannel.name}</span>
        </div>
      </div>
      
      <div className={styles.messages}>
        {isVoice ? (
          <div className={styles.voiceChat}>
            <div className={styles.voiceIcon}>🔊</div>
            <p>{currentChannel.name}</p>
            <p className={styles.voiceInfo}>Voice chat - click to join</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={styles.message}>
              <div className={styles.messageAvatar}>
                {msg.user.avatar ? (
                  <img src={msg.user.avatar} alt="" />
                ) : (
                  <span>{msg.user.username.charAt(0).toUpperCase()}</span>
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
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {!isVoice && (
        <form onSubmit={handleSendMessage} className={styles.messageForm}>
          <input
            type="text"
            placeholder={`Message #${currentChannel.name}`}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
          />
        </form>
      )}
    </div>
  );
}
