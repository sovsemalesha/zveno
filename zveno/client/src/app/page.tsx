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
    };
    
    init();
  }, [setAuth, setServers]);
  
  useEffect(() => {
    if (!loading && !user && !token) {
      router.push('/login');
    } else if (!loading && user) {
      router.push('/servers');
    }
  }, [loading, user, token, router]);
  
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading Zveno...</p>
    </div>
  );
}
