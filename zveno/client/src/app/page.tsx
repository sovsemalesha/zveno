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
      console.log('Initializing...');
      const savedToken = localStorage.getItem('token');
      console.log('Saved token:', savedToken);
      
      if (savedToken) {
        api.setToken(savedToken);
        try {
          console.log('Fetching user data...');
          const userData = await api.getMe();
          console.log('User data:', userData);
          setAuth(userData, savedToken);
          const servers = await api.getServers();
          setServers(servers);
        } catch (err) {
          console.error('Init error:', err);
          localStorage.removeItem('token');
        }
      }
      
      console.log('Setting loading to false');
      setLoading(false);
    };
    
    init();
  }, [setAuth, setServers]);
  
  useEffect(() => {
    if (!loading) {
      if (!user && !token) {
        router.push('/login');
      } else if (user) {
        router.push('/servers');
      }
    }
  }, [loading, user, token, router]);
  
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading Zveno...</p>
    </div>
  );
}
