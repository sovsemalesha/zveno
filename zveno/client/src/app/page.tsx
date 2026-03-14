'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { user, token, isLoaded, loadAuth, setAuth } = useAuthStore();
  const { setServers } = useAppStore();
  const [checking, setChecking] = useState(true);
  
  useEffect(() => {
    loadAuth();
  }, []);
  
  useEffect(() => {
    if (isLoaded && !user && token) {
      api.setToken(token);
      api.getMe()
        .then((userData) => {
          setAuth(userData, token);
          return api.getServers();
        })
        .then((servers) => {
          setServers(servers);
          setChecking(false);
        })
        .catch(() => {
          useAuthStore.getState().logout();
          setChecking(false);
        });
    } else if (isLoaded) {
      setChecking(false);
    }
  }, [isLoaded, user, token, setAuth, setServers]);
  
  useEffect(() => {
    if (!checking) {
      if (user) {
        router.push('/servers');
      } else {
        router.push('/login');
      }
    }
  }, [checking, user, router]);

  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading Zveno...</p>
    </div>
  );
}
