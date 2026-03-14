'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { setServers } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { user, token } = await api.login(email, password);
      setAuth(user, token);
      api.setToken(token);
      const servers = await api.getServers();
      setServers(servers);
      router.push('/servers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.card} data-text="ZVENO">
        <h1 className="glitch" data-text="ZVENO">ZVENO</h1>
        <p className={styles.subtitle}>// SYSTEM ACCESS REQUIRED</p>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.field}>
            <label>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className={styles.error}>{error}</p>}
          
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '> ACCESSING...' : '> LOGIN'}
          </button>
        </form>
        
        <p className={styles.footer}>
          // NO ACCOUNT? <Link href="/register">REGISTER</Link>
        </p>
      </div>
    </div>
  );
}
