'use client';

import { Server } from '@/types';
import styles from './ServerSidebar.module.css';

interface Props {
  servers: Server[];
  currentServer: Server | null;
  onServerSelect: (server: Server) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
}

export default function ServerSidebar({ 
  servers, 
  currentServer,
  onServerSelect, 
  onCreateServer, 
  onJoinServer 
}: Props) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.servers}>
        {servers.map((server) => (
          <button
            key={server.id}
            className={`${styles.serverIcon} ${currentServer?.id === server.id ? styles.active : ''}`}
            onClick={() => onServerSelect(server)}
            title={server.name}
          >
            {server.icon ? (
              <img src={server.icon} alt={server.name} />
            ) : (
              <span>{server.name.charAt(0).toUpperCase()}</span>
            )}
          </button>
        ))}
      </div>
      
      <div className={styles.bottomActions}>
        <button onClick={onCreateServer} className={styles.addButton} title="Create Server">
          <span>+</span>
        </button>
        <button onClick={onJoinServer} className={styles.addButton} title="Join Server">
          <span>⌘</span>
        </button>
      </div>
    </div>
  );
}
