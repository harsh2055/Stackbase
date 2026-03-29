// frontend/pages/_app.js
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { useEffect } from 'react';
import { setTokenGetter } from '../lib/api';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AppWithAuth Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}

function AppWithAuth({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
