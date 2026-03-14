'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { user, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      
      if (savedToken) {
        try {
          const userData = await api.getMe();
          setAuth(userData, savedToken);
        } catch {
          logout();
        }
      }
      
      setLoading(false);
    };
    
    init();
  }, []);
  
  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/servers');
      } else {
        router.push('/login');
      }
    }
  }, [loading, user, router]);

  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Loading Zveno...</p>
    </div>
  );
}
