// frontend/components/Auth/withAuth.js
// Higher-order component that protects pages requiring authentication.
// Redirects to /login if no token is found.

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../UI';

export default function withAuth(WrappedComponent) {
  return function ProtectedPage(props) {
    const { isAuthenticated, ready } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (ready && !isAuthenticated) {
        router.replace('/login');
      }
    }, [ready, isAuthenticated, router]);

    if (!ready) {
      return (
        <div style={{
          height: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'var(--bg-0)',
        }}>
          <Spinner size={24} />
        </div>
      );
    }

    if (!isAuthenticated) return null;

    return <WrappedComponent {...props} />;
  };
}
