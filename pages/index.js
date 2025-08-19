import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  // Redirect to login page
  useEffect(() => {
    router.push('/login');
  }, [router]);

  // Return null while redirecting
  return null;
}