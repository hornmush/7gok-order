'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface StatRow {
  id: number
  order_date: string
  category: string
  item_name: string
  requested_qty: number
  confirmed_qty: number
  status: string
  memo?: string
}

export default function StatsPage() {
  const [data, setData] = useState<StatRow[]>([])

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.from('orders').select('*').order('order_date', { ascending: false })
      if (data) setData(data)
    }
    fetchStats()
  }, [])

  const downloadCSV = () => {
    if (data.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }

    let csv = "\uFEFFID,날짜,구분,품목명,요청수량,확정수량,상태,메모\n"
    data.forEach(r => {
      csv += `"${r.id}","${r.order_date}","${r.category}","${r.item_name}","${r.requested_qty}","${r.confirmed_qty}","${r.status}","${r.memo || ''}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `칠곡농협_발주통계_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-slate-100 min-h-screen pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 shadow z-10 flex justify-between items-center">
        <h1 className="text-lg font-bold">📊 주간 통계 및 다운로드</h1>
        <a href="/" className="text-sm bg-slate-800 px-3 py-1 rounded">홈으로</a>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800">전체 발주 누적 통계</h2>
            <p className="text-xs text-slate-500">엑셀 파일로 다운로드하여 분석하세요.</p>
          </div>
          <button onClick={downloadCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow transition">
            📥 엑셀(CSV) 다운로드
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b text-xs text-slate-500 font-semibold">
                <th className="p-3">날짜</th>
                <th className="p-3">구분</th>
                <th className="p-3">품목명</th>
                <th className="p-3 text-right">확정수량</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-400">데이터가 없습니다.</td></tr>
              ) : (
                data.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-xs text-slate-500">{row.order_date}</td>
                    <td className="p-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${row.category === 'veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {row.category === 'veg' ? '채소' : '과일'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{row.item_name}</td>
                    <td className="p-3 text-right font-bold text-slate-700">{row.confirmed_qty}개</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
