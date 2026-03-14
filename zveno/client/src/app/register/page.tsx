'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useAppStore } from '@/store';
import { api } from '@/lib/api';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { setServers } = useAppStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      api.setToken(null);
      const { user, token } = await api.register(email, username, password);
      setAuth(user, token);
      api.setToken(token);
      const servers = await api.getServers();
      setServers(servers);
      router.push('/servers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.card} data-text="ZVENO">
        <h1 className="glitch" data-text="REGISTER">REGISTER</h1>
        <p className={styles.subtitle}>// NEW USER DETECTED</p>
        
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
            <label>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </div>
          
          <div className={styles.field}>
            <label>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          {error && <p className={styles.error}>{error}</p>}
          
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '> INITIALIZING...' : '> REGISTER'}
          </button>
        </form>
        
        <p className={styles.footer}>
          // ALREADY REGISTERED? <Link href="/login">LOGIN</Link>
        </p>
      </div>
    </div>
  );
}
