import { metadata } from './metadata'

export { metadata }

export default function AdminDashboard() {
  return (
    <div className="h-full space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-600">관리자 대시보드에 오신 것을 환영합니다.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-neon-yellow">
          <h3 className="text-sm font-medium text-gray-600 mb-1">총 사용자</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-brand-purple">
          <h3 className="text-sm font-medium text-gray-600 mb-1">오늘 방문</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-brand-pink">
          <h3 className="text-sm font-medium text-gray-600 mb-1">주문 수</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-brand-orange">
          <h3 className="text-sm font-medium text-gray-600 mb-1">매출</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">₩0</p>
        </div>
      </div>
    </div>
  )
}
