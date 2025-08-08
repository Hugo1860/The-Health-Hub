import NotificationCenter from '@/components/NotificationCenter';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">通知中心</h1>
          <p className="text-gray-600 mt-2">查看您的所有通知消息</p>
        </div>
        <NotificationCenter />
      </div>
    </div>
  );
}