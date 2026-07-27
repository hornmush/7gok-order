'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Item {
  id: number
  name: string
  unit: string
  category: string
}

function RequestContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = searchParams.get('cat') || 'veg'

  const [items, setItems] = useState<Item[]>([])
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const [memo, setMemo] = useState('')

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase.from('items').select('*').eq('category', category)
      if (data) setItems(data)
    }
    fetchItems()
  }, [category])

  const adjustQty = (id: number, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const orders = items
      .filter(item => (quantities[item.id] || 0) > 0)
      .map(item => ({
        item_id: item.id,
        item_name: item.name,
        category,
        requested_qty: quantities[item.id],
        confirmed_qty: quantities[item.id],
        status: 'pending',
        memo,
      }))

    if (orders.length === 0) {
      alert('수량이 1개 이상 선택된 품목이 없습니다.')
      return
    }

    const { error } = await supabase.from('orders').insert(orders)
    if (error) {
      alert('오류 발생: ' + error.message)
    } else {
      alert('성공적으로 발주 요청되었습니다!')
      router.push('/')
    }
  }

  return (
    <div className="bg-slate-100 min-h-screen pb-20">
      <header className="bg-emerald-600 text-white p-4 sticky top-0 shadow z-10 flex justify-between items-center">
        <h1 className="text-lg font-bold">{category === 'veg' ? '🥬 채소 발주 요청' : '🍎 과일 발주 요청'}</h1>
        <a href="/" className="text-sm bg-emerald-700 px-3 py-1 rounded">홈으로</a>
      </header>

      <main className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{item.name}</h3>
                  <span className="text-xs text-slate-500">{item.unit}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => adjustQty(item.id, -1)} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700">-</button>
                  <span className="w-10 text-center font-bold text-sm">{quantities[item.id] || 0}</span>
                  <button type="button" onClick={() => adjustQty(item.id, 1)} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-700">+</button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">현장 재고 및 특이사항 메모</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none" placeholder="예: 재고 소량 남음" />
          </div>

          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition">
            발주 요청 전송하기
          </button>
        </form>
      </main>
    </div>
  )
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">로딩 중...</div>}>
      <RequestContent />
    </Suspense>
  )
}
