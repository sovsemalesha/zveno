'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { user, token, setAuth } = useAuthStore();
  const { setServers } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      
      if (savedToken) {
        api.setToken(savedToken);
        try {
          const userData = await api.getMe();
          setAuth(userData, savedToken);
          const servers = await api.getServers();
          setServers(servers);
        } catch {
          localStorage.removeItem('token');
        }
      }
      
      setLoading(false);
      setInitialized(true);
    };
    
    init();
  }, [setAuth, setServers]);
  
  useEffect(() => {
    if (initialized) {
      if (user) {
        router.push('/servers');
      } else {
        router.push('/login');
      }
    }
  }, [initialized, user, router]);

  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading Zveno...</p>
    </div>
  );
}
