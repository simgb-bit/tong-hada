import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { useData } from '@/store/DataContext'
import { Spinner } from '@/components/ui'
import { Home } from '@/pages/Home'
import { NewTong } from '@/pages/NewTong'
import { TongList } from '@/pages/TongList'
import { TongDetail } from '@/pages/TongDetail'
import { Analytics } from '@/pages/Analytics'

export default function App() {
  const { loading, error } = useData()

  return (
    <Layout>
      {loading ? (
        <Spinner label="데이터를 불러오는 중입니다…" />
      ) : error ? (
        <div className="card border-red-100 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">데이터 로드 오류</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewTong />} />
          <Route path="/tongs" element={<TongList />} />
          <Route path="/tongs/:id" element={<TongDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          {/* 통 캘린더는 통 기록함의 뷰로 통합됨 — 기존 링크 호환용 리다이렉트 */}
          <Route path="/calendar" element={<Navigate to="/tongs" replace />} />
          <Route path="*" element={<Home />} />
        </Routes>
      )}
    </Layout>
  )
}
