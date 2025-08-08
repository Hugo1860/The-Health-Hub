export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">测试页面</h1>
      <p className="mb-4 text-sm sm:text-base">如果看到这个页面，说明Next.js运行正常</p>
      <a href="/" className="text-blue-600 underline hover:text-blue-800 active:text-blue-900 touch-manipulation">返回主页</a>
    </div>
  );
}