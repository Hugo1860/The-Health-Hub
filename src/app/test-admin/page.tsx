'use client';

import { useSession } from 'next-auth/react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function TestAdminPage() {
  const { data: session, status } = useSession();
  const { isAdmin, isLoading, user } = useAdminAuth(false);

  if (status === 'loading' || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">管理员认证测试</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Session Status:</h2>
          <p>Status: {status}</p>
          <p>Authenticated: {status === 'authenticated' ? 'Yes' : 'No'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Session User:</h2>
          <pre>{JSON.stringify(session?.user, null, 2)}</pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">useAdminAuth Result:</h2>
          <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
          <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Expected for Admin Access:</h2>
          <p>Role should be: 'admin'</p>
          <p>Status should be: 'active' or undefined</p>
        </div>
      </div>
    </div>
  );
}