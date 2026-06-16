'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('sgc_token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-unt-azul">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm opacity-75">Cargando SGC-UNT...</p>
      </div>
    </div>
  );
}
