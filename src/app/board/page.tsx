'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface OrderItem {
  id: number
  item_name: string
  category: string
  requested_qty: number
  confirmed_qty: number
  status: string
  memo?: string
}

export default function BoardPage() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function fetchBoard() {
      const { data } = await supabase.from('orders').select('*').eq('order_date', today).order('id', { ascending: false })
      if (data) setOrders(data)
    }
    fetchBoard()
  }, [today])

  return (
    <div className="bg-slate-100 min-h-screen pb-20">
      <header className="bg-slate-800 text-white p-4 sticky top-0 shadow z-10 flex justify-between items-center">
        <h1 className="text-lg font-bold">📋 일일 발주 게시판</h1>
        <a href="/" className="text-sm bg-slate-700 px-3 py-1 rounded">홈으로</a>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-500">오늘 날짜</span>
            <h2 className="font-bold text-slate-800 text-lg">{today}</h2>
          </div>
        </div>

        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white p-8 rounded-xl text-center text-slate-400 text-sm shadow-sm">오늘 등록된 발주 내역이 없습니다.</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${order.category === 'veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {order.category === 'veg' ? '채소' : '과일'}
                </span>
                <h3 className="font-bold text-slate-800 text-base mt-1">{order.item_name}</h3>
                <p className="text-sm font-semibold text-slate-700 mt-1">확정 수량: <span className="text-emerald-600">{order.confirmed_qty}개</span></p>
                {order.memo && <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded mt-2">메모: {order.memo}</p>}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
