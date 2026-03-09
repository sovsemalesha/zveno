'use client';

import { useState } from 'react';
import styles from './VoicePanel.module.css';

interface VoiceParticipant {
  userId: string;
  username: string;
  isMuted?: boolean;
  isDeafened?: boolean;
}

interface Props {
  channelId: string | null;
  participants: VoiceParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLeave: () => void;
}

export default function VoicePanel({
  channelId,
  participants,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onLeave,
}: Props) {
  if (!channelId) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>🔊 Voice Connected</span>
      </div>
      
      <div className={styles.participants}>
        {participants.map(p => (
          <div key={p.userId} className={styles.participant}>
            <div className={styles.avatar}>
              <span>{p.username.charAt(0)}</span>
              <div className={styles.speaking} />
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{p.username}</span>
              {p.isMuted && <span className={styles.muted}>🔇</span>}
            </div>
          </div>
        ))}
        
        {participants.length === 0 && (
          <div className={styles.empty}>
            Waiting for others to join...
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <button
          className={`${styles.controlBtn} ${isMuted ? styles.active : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        
        <button
          className={`${styles.controlBtn} ${isDeafened ? styles.active : ''}`}
          onClick={onToggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? '🔇' : '🎧'}
        </button>
        
        <button
          className={`${styles.controlBtn} ${styles.leave}`}
          onClick={onLeave}
          title="Leave Voice"
        >
          📴
        </button>
      </div>
    </div>
  );
}
