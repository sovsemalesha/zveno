'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { setServers } = useAppStore();
  
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      
      if (savedToken && !token) {
        api.setToken(savedToken);
        try {
          const userData = await api.getMe();
          useAuthStore.getState().setAuth(userData, savedToken);
          const servers = await api.getServers();
          setServers(servers);
        } catch {
          localStorage.removeItem('token');
        }
      }
    };
    
    if (!user && token) {
      init();
    }
  }, [user, token, setServers]);
  
  useEffect(() => {
    if (user) {
      router.push('/servers');
    } else if (token === null) {
      router.push('/login');
    }
  }, [user, token, router]);

  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading Zveno...</p>
    </div>
  );
}
