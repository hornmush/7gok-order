'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Order {
  id: number
  item_name: string
  category: string
  requested_qty: number
  confirmed_qty: number
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [confirmedQtys, setConfirmedQtys] = useState<{ [key: number]: number }>({})
  const [generatedText, setGeneratedText] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*').eq('status', 'pending')
    if (data) {
      setOrders(data)
      const initial: { [key: number]: number } = {}
      data.forEach(o => { initial[o.id] = o.requested_qty })
      setConfirmedQtys(initial)
    }
  }

  const handleQtyChange = (id: number, val: number) => {
    setConfirmedQtys(prev => ({ ...prev, [id]: val }))
  }

  const confirmAndGenerate = async () => {
    if (orders.length === 0) {
      alert('대기 중인 요청이 없습니다.')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const dayOfWeek = weekdays[new Date().getDay()]

    let vegItems: string[] = []
    let fruitItems: string[] = []

    for (let order of orders) {
      const qty = confirmedQtys[order.id] ?? order.requested_qty
      await supabase.from('orders').update({ confirmed_qty: qty, status: 'confirmed' }).eq('id', order.id)

      if (qty > 0) {
        if (order.category === 'veg') vegItems.push(`- ${order.item_name}: ${qty}개`)
        else fruitItems.push(`- ${order.item_name}: ${qty}개`)
      }
    }

    let text = `[칠곡농협 농산팀 일일 발주서]\n- 일자: ${today} (${dayOfWeek})\n\n`
    if (vegItems.length > 0) text += `[채소류]\n${vegItems.join('\n')}\n\n`
    if (fruitItems.length > 0) text += `[과일류]\n${fruitItems.join('\n')}\n\n`
    text += `이상 총 품목 발주 부탁드립니다. 감사합니다!`

    setGeneratedText(text)
    alert('발주가 확정되었습니다!')
    fetchOrders()
  }

  const copyText = () => {
    navigator.clipboard.writeText(generatedText)
    alert('클립보드에 복사되었습니다!')
  }

  return (
    <div className="bg-slate-100 min-h-screen pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 shadow z-10 flex justify-between items-center">
        <h1 className="text-lg font-bold">⚙️ 발주 관리자 센터</h1>
        <a href="/" className="text-sm bg-slate-800 px-3 py-1 rounded">홈으로</a>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-800 mb-3">대기 중인 발주 요청</h2>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">대기 중인 요청이 없습니다.</p>
            ) : (
              orders.map(order => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${order.category === 'veg' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {order.category === 'veg' ? '채소' : '과일'}
                    </span>
                    <h4 className="font-bold text-slate-800 mt-1">{order.item_name}</h4>
                    <p className="text-xs text-slate-400">요청: {order.requested_qty}개</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">확정:</span>
                    <input type="number" value={confirmedQtys[order.id] ?? order.requested_qty} onChange={e => handleQtyChange(order.id, parseInt(e.target.value) || 0)} className="w-16 text-center font-bold border rounded-lg py-1 text-sm outline-none" />
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={confirmAndGenerate} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow transition">
            ✨ 최종 발주 확정 및 업체 문자 생성
          </button>
        </div>

        {generatedText && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-500">
            <h3 className="font-bold text-emerald-800 mb-2">📋 생성된 협력업체 발주 텍스트</h3>
            <textarea value={generatedText} readOnly rows={7} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-mono outline-none" />
            <button onClick={copyText} className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-sm">
              📋 문자 내용 복사하기
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
