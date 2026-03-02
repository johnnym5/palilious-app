'use client';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    redirect('/');
  }, []);
  
  return null;
}
