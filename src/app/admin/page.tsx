import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { metadata } from './metadata'

export { metadata }

export default function AdminDashboard() {
  const stats = [
    { title: '총 사용자', value: '0', accent: 'border-l-neutral-900' },
    { title: '오늘 방문', value: '0', accent: 'border-l-brand-purple' },
    { title: '주문 수', value: '0', accent: 'border-l-brand-pink' },
    { title: '매출', value: '₩0', accent: 'border-l-brand-orange' },
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          관리자 대시보드에 오신 것을 환영합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.title}
            className={`overflow-hidden border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md ${s.accent}`}
          >
            <CardHeader className="pb-6">
              <CardDescription className="text-xs font-medium uppercase tracking-wide">
                {s.title}
              </CardDescription>
              <CardTitle className="text-3xl font-bold tabular-nums">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
