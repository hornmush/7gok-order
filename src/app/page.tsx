'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Item {
  id: number
  category: string
  name: string
  unit: string
}

interface OrderInput {
  [itemId: number]: {
    checked: boolean
    quantity: number
  }
}

interface OrderRecord {
  id: number
  item_id: number
  item_name: string
  category: string
  vendor?: string
  quantity: number
  created_at: string
  orderer?: string
  is_completed?: boolean
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [orderInputs, setOrderInputs] = useState<OrderInput>({})
  const [loading, setLoading] = useState(false)
  
  const [mainTab, setMainTab] = useState<'WRITE' | 'BOARD' | 'STATS' | 'MANAGE'>('WRITE')
  
  // 2계층 탭 구조 상태 (채소류 / 과일류 상위탭 및 하위탭)
  const [topTab, setTopTab] = useState<'VEG' | 'FRUIT'>('VEG')
  const [vegSubTab, setVegSubTab] = useState<'VEG_FREQUENT' | 'VEG_SPECIAL' | 'VEG_OCCASIONAL'>('VEG_FREQUENT')
  const [fruitSubTab, setFruitSubTab] = useState<'FRUIT_FREQUENT' | 'FRUIT_SPECIAL'>('FRUIT_FREQUENT')

  const [boardSubTab, setBoardSubTab] = useState<'VEG' | 'FRUIT'>('VEG')
  const [searchQuery, setSearchQuery] = useState('')
  const [ordererName, setOrdererName] = useState('농산팀')
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([])

  const [newItemName, setNewItemName] = useState('')
  const [newItemTopCat, setNewItemTopCat] = useState<'VEG' | 'FRUIT'>('VEG')
  const [newItemSubCat, setNewItemSubCat] = useState<string>('veg_frequent')
  const [newItemUnit, setNewItemUnit] = useState('박스')

  useEffect(() => {
    const savedName = localStorage.getItem('ordererName')
    if (savedName) {
      setOrdererName(savedName)
    } else {
      setOrdererName('농산팀')
    }
  }, [])

  const handleNameChange = (name: string) => {
    setOrdererName(name)
    localStorage.setItem('ordererName', name)
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('name', { ascending: true })

    if (error) console.error('아이템 로딩 에러:', error)
    else if (data) setItems(data)
  }

  const fetchOrderHistory = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('기록 로딩 에러:', error)
    else if (data) setOrderHistory(data)
  }

  const handleTabChange = (tab: 'WRITE' | 'BOARD' | 'STATS' | 'MANAGE') => {
    setMainTab(tab)
    fetchItems()
    fetchOrderHistory()
  }

  useEffect(() => {
    fetchItems()
    fetchOrderHistory()

    const channel = supabase
      .channel('realtime-orders-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { fetchOrderHistory() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => { fetchItems() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCheckboxChange = (itemId: number, checked: boolean) => {
    if (checked) {
      const targetItem = items.find(i => i.id === itemId)
      const targetCat = targetItem?.category?.toLowerCase() || ''
      const targetIsFruit = targetCat.includes('fruit')

      const hasConflict = Object.entries(orderInputs).some(([idStr, val]) => {
        if (!val.checked) return false
        const it = items.find(i => i.id === Number(idStr))
        if (!it) return false
        const itCat = it.category?.toLowerCase() || ''
        const itIsFruit = itCat.includes('fruit')
        return targetIsFruit !== itIsFruit
      })

      if (hasConflict) {
        alert('⚠️ 채소와 과일은 동시에 담을 수 없습니다!\n기존 선택이 초기화되고 새로 선택한 품목으로 전환됩니다.')
        setOrderInputs({
          [itemId]: { checked: true, quantity: 1 },
        })
        return
      }
    }

    setOrderInputs(prev => ({
      ...prev,
      [itemId]: {
        checked,
        quantity: prev[itemId]?.quantity || 1,
      },
    }))
  }

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setOrderInputs(prev => ({
      ...prev,
      [itemId]: {
        checked: prev[itemId]?.checked || false,
        quantity: isNaN(quantity) ? 1 : Math.max(1, quantity),
      },
    }))
  }

  const handleSubmitOrder = async () => {
    const selectedItems = Object.entries(orderInputs).filter(
      ([_, value]) => value.checked && value.quantity > 0
    )

    if (selectedItems.length === 0) {
      alert('발주할 품목을 선택하고 수량을 입력해주세요.')
      return
    }

    if (!ordererName.trim()) {
      alert('작성자 이름을 입력해주세요!')
      return
    }

    setLoading(true)

    const ordersData = selectedItems.map(([itemIdStr, value]) => {
      const itemId = Number(itemIdStr)
      const item = items.find(i => i.id === itemId)

      return {
        item_id: itemId,
        item_name: item?.name || '',
        category: item?.category || '',
        vendor: '미지정',
        quantity: value.quantity,
        orderer: ordererName.trim(),
        is_completed: false,
      }
    })

    const { error } = await supabase.from('orders').insert(ordersData)
    setLoading(false)

    if (error) {
      console.error('발주 등록 에러:', error)
      alert('발주 등록 중 오류가 발생했습니다.')
    } else {
      alert('발주 요청이 성공적으로 등록되었습니다!')
      setOrderInputs({})
      handleTabChange('BOARD')
    }
  }

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) {
      alert('품목 이름을 입력해주세요!')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('items').insert([
      {
        category: newItemSubCat,
        name: newItemName.trim(),
        unit: newItemUnit.trim(),
      },
    ])
    setLoading(false)

    if (error) {
      console.error('품목 추가 에러:', error)
      alert('품목 추가 중 오류가 발생했습니다.')
    } else {
      alert(`✅ [${newItemName}] 품목이 성공적으로 추가되었습니다!`)
      setNewItemName('')
      fetchItems()
    }
  }

  const handleAssignVendor = async (orderId: number, vendorName: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ vendor: vendorName })
      .eq('id', orderId)

    if (error) {
      console.error('업체 지정 에러:', error)
      alert('업체 지정 중 오류가 발생했습니다.')
    } else {
      fetchOrderHistory()
    }
  }

  const handleLoadForEdit = (itemsList: OrderRecord[]) => {
    const newInputs: OrderInput = {}
    
    itemsList.forEach(order => {
      let matchedItem = items.find(i => i.id === order.item_id)
      if (!matchedItem) {
        matchedItem = items.find(i => i.name === order.item_name)
      }

      if (matchedItem) {
        newInputs[matchedItem.id] = {
          checked: true,
          quantity: order.quantity,
        }
      }
    })

    const firstCat = itemsList[0]?.category?.toLowerCase() || ''
    if (firstCat.includes('fruit')) {
      setTopTab('FRUIT')
      setFruitSubTab('FRUIT_FREQUENT')
    } else {
      setTopTab('VEG')
      setVegSubTab('VEG_FREQUENT')
    }

    setOrderInputs(newInputs)
    handleTabChange('WRITE')
    alert('📝 해당 발주 기록을 작성 화면으로 불러왔습니다!')
  }

  const handleDeleteOrderBatch = async (itemsList: OrderRecord[]) => {
    if (!confirm('정말 이 발주 기록을 삭제하시겠습니까?')) return

    const idsToDelete = itemsList.map(item => item.id)
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('id', idsToDelete)

    if (error) {
      console.error('삭제 에러:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } else {
      fetchOrderHistory()
    }
  }

  const handleToggleComplete = async (itemsList: OrderRecord[], currentStatus?: boolean) => {
    const newStatus = !currentStatus
    const idsToUpdate = itemsList.map(item => item.id)

    const { error } = await supabase
      .from('orders')
      .update({ is_completed: newStatus })
      .in('id', idsToUpdate)

    if (error) {
      console.error('상태 변경 에러:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    } else {
      fetchOrderHistory()
    }
  }

  const getItemUnit = (itemId: number, itemName?: string) => {
    const foundItem = items.find(i => i.id === itemId) || items.find(i => i.name === itemName)
    return foundItem ? foundItem.unit : ''
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    date.setHours(date.getHours() + 9)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const filteredOrderHistory = orderHistory.filter(order => {
    const cat = order.category?.toLowerCase() || ''
    const isFruit = cat.includes('fruit')

    if (boardSubTab === 'VEG') return !isFruit
    if (boardSubTab === 'FRUIT') return isFruit
    return false
  })

  const groupedOrders = filteredOrderHistory.reduce((acc, order) => {
    const timeKey = formatDateTime(order.created_at)
    if (!acc[timeKey]) acc[timeKey] = []
    acc[timeKey].push(order)
    return acc
  }, {} as Record<string, OrderRecord[]>)

  const handleCopyVendorText = (vendorName: string, vendorItems: OrderRecord[]) => {
    const dateStr = vendorItems[0]?.created_at ? new Date(vendorItems[0].created_at) : new Date()
    dateStr.setHours(dateStr.getHours() + 9)
    const month = dateStr.getMonth() + 1
    const day = dateStr.getDate()
    const formattedDate = `${month}월 ${day}일`

    let text = `${formattedDate} 발주입니다\n\n발주 목록\n`
    vendorItems.forEach(item => {
      const unit = getItemUnit(item.item_id, item.item_name)
      text += `- ${item.item_name}: ${item.quantity}${unit}\n`
    })

    navigator.clipboard.writeText(text)
    alert(`📋 [${vendorName}] 발주 텍스트가 클립보드에 복사되었습니다!`)
  }

  const uniqueItemsMap = new Map()
  items.forEach(item => {
    if (!uniqueItemsMap.has(item.name)) uniqueItemsMap.set(item.name, item)
  })
  const uniqueItems = Array.from(uniqueItemsMap.values())

  const filteredItems = uniqueItems.filter(item => {
    const cat = item.category?.toLowerCase() || ''
    const matchesSearch = searchQuery.trim() === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())

    if (searchQuery.trim() !== '') return matchesSearch

    if (topTab === 'VEG') {
      if (cat.includes('fruit')) return false
      if (vegSubTab === 'VEG_FREQUENT') return cat === 'veg_frequent' || cat === 'veg' || cat === 'vegetable' || cat === ''
      if (vegSubTab === 'VEG_SPECIAL') return cat === 'veg_special'
      if (vegSubTab === 'VEG_OCCASIONAL') return cat === 'veg_occasional'
    } else {
      if (!cat.includes('fruit')) return false
      if (fruitSubTab === 'FRUIT_FREQUENT') return cat === 'fruit_frequent' || cat === 'fruit_main' || cat === 'fruit' || cat === 'fruits' || cat === ''
      if (fruitSubTab === 'FRUIT_SPECIAL') return cat === 'fruit_special' || cat === 'fruit_seasonal'
    }
    return false
  })

  const selectedCount = Object.values(orderInputs).filter(v => v.checked).length
  let lastDate = ''

  const completedHistory = orderHistory.filter(o => o.is_completed)
  const totalOrderCount = completedHistory.length
  
  const totalVegQty = completedHistory
    .filter(o => {
      const c = o.category?.toLowerCase() || ''
      return !c.includes('fruit')
    })
    .reduce((sum, o) => sum + o.quantity, 0)

  const totalFruitQty = completedHistory
    .filter(o => {
      const c = o.category?.toLowerCase() || ''
      return c.includes('fruit')
    })
    .reduce((sum, o) => sum + o.quantity, 0)

  const weeklyStats = completedHistory.reduce((acc, order) => {
    const d = new Date(order.created_at)
    d.setHours(d.getHours() + 9)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const weekNum = Math.ceil(d.getDate() / 7)
    const weekKey = `${year}년 ${month}월 ${weekNum}주차`

    const vendor = order.vendor && order.vendor !== '미지정' ? order.vendor : '업체 미지정'
    const cat = order.category?.toLowerCase() || ''
    const isFruit = cat.includes('fruit')

    if (!acc[weekKey]) {
      acc[weekKey] = { totalQty: 0, orderCount: 0, vendors: {} }
    }
    acc[weekKey].totalQty += order.quantity
    acc[weekKey].orderCount += 1

    if (!acc[weekKey].vendors[vendor]) {
      acc[weekKey].vendors[vendor] = { vegItems: {}, fruitItems: {} }
    }

    const targetMap = isFruit ? acc[weekKey].vendors[vendor].fruitItems : acc[weekKey].vendors[vendor].vegItems
    if (!targetMap[order.item_name]) {
      targetMap[order.item_name] = { qty: 0, unit: getItemUnit(order.item_id, order.item_name) }
    }
    targetMap[order.item_name].qty += order.quantity

    return acc
  }, {} as Record<string, any>)

  const sortedWeeklyStats = Object.entries(weeklyStats).sort((a, b) => b[0].localeCompare(a[0]))

  const vendorStats = completedHistory.reduce((acc, order) => {
    const v = order.vendor && order.vendor !== '미지정' ? order.vendor : '미지정'
    if (!acc[v]) acc[v] = 0
    acc[v] += order.quantity
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="max-w-4xl mx-auto p-4 pb-28">
      <div className="text-center my-6">
        <h1 className="text-2xl font-extrabold text-gray-900">🛒 칠곡농협 농산팀 실시간 발주 시스템</h1>
        <p className="text-xs text-gray-500 mt-1">품목 선택, 발주 관리, 주별 통계 및 품목 추가를 할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => handleTabChange('WRITE')}
          className={`py-3 text-[11px] sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'WRITE' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✍️ 발주작성
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('BOARD')}
          className={`py-3 text-[11px] sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'BOARD' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📋 발주 확인 !
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('STATS')}
          className={`py-3 text-[11px] sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'STATS' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📊 주별통계
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('MANAGE')}
          className={`py-3 text-[11px] sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'MANAGE' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⚙️ 품목관리
        </button>
      </div>

      {mainTab === 'WRITE' && (
        <>
          <div className="bg-indigo-50 border-2 border-indigo-300 p-4 rounded-2xl mb-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-black text-indigo-900">✍️ 작성자 이름</span>
            <input
              type="text"
              value={ordererName}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="이름 입력 (예: 농산팀)"
              className="w-40 px-3 py-2 text-sm font-bold border border-indigo-400 rounded-xl bg-white text-center text-indigo-900 focus:outline-none focus:border-blue-600 shadow-inner"
            />
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 품목 검색 (예: 가지, 대파, 사과...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 1단계 상위 탭: 채소류 / 과일류 */}
          <div className="flex bg-gray-200 p-1.5 rounded-2xl mb-3 shadow-inner">
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setTopTab('VEG'); }}
              className={`flex-1 py-3 text-sm sm:text-base font-black rounded-xl transition-all ${
                topTab === 'VEG' && searchQuery === '' ? 'bg-green-700 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🥦 채소류
            </button>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setTopTab('FRUIT'); }}
              className={`flex-1 py-3 text-sm sm:text-base font-black rounded-xl transition-all ${
                topTab === 'FRUIT' && searchQuery === '' ? 'bg-red-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🍎 과일류
            </button>
          </div>

          {/* 2단계 하위 탭: 채소류 선택 시 */}
          {topTab === 'VEG' && searchQuery === '' && (
            <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1.5 rounded-xl mb-6 shadow-inner border border-green-200">
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_FREQUENT')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_FREQUENT' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🥬 자주 발주
              </button>
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_SPECIAL')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_SPECIAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🥕 특수 야채
              </button>
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_OCCASIONAL')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_OCCASIONAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🧅 가끔 넣는
              </button>
            </div>
          )}

          {/* 2단계 하위 탭: 과일류 선택 시 */}
          {topTab === 'FRUIT' && searchQuery === '' && (
            <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1.5 rounded-xl mb-6 shadow-inner border border-red-200">
              <button
                type="button"
                onClick={() => setFruitSubTab('FRUIT_FREQUENT')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  fruitSubTab === 'FRUIT_FREQUENT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🍎 자주 발주
              </button>
              <button
                type="button"
                onClick={() => setFruitSubTab('FRUIT_SPECIAL')}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                  fruitSubTab === 'FRUIT_SPECIAL' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🍉 특수 과일
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {filteredItems.map(item => {
              const isChecked = orderInputs[item.id]?.checked || false
              const quantity = orderInputs[item.id]?.quantity || 1

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    isChecked ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <label className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => handleCheckboxChange(item.id, e.target.checked)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <div>
                        <span className="font-bold text-sm text-gray-800 block">{item.name}</span>
                      </div>
                    </label>
                  </div>

                  {isChecked && (
                    <div className="mt-3 pt-2 border-t border-gray-200/80 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">{item.unit}</span>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={e => handleQuantityChange(item.id, Number(e.target.value))}
                        className="w-16 px-2 py-1 text-right text-sm border rounded bg-white font-semibold"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t shadow-lg flex justify-center">
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={loading}
              className="w-full max-w-md bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all disabled:bg-gray-400 flex items-center justify-center space-x-2"
            >
              <span>📝 발주 요청 올리기</span>
              {selectedCount > 0 && (
                <span className="bg-white text-blue-600 text-xs px-2 py-0.5 rounded-full font-black">
                  {selectedCount}건
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {mainTab === 'BOARD' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <span>📋 관리자 발주 관리 및 기록</span>
          </h2>

          <div className="flex bg-gray-100 p-1.5 rounded-xl mb-6 shadow-inner">
            <button
              type="button"
              onClick={() => setBoardSubTab('VEG')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                boardSubTab === 'VEG' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              🥦 채소류 발주 관리
            </button>
            <button
              type="button"
              onClick={() => setBoardSubTab('FRUIT')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                boardSubTab === 'FRUIT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              🍎 과일류 발주 관리
            </button>
          </div>

          {Object.keys(groupedOrders).length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm">
                {boardSubTab === 'VEG' ? '등록된 채소류 발주 기록이 없습니다.' : '등록된 과일류 발주 기록이 없습니다.'}
              </p>
            </div>
          ) : (
            Object.entries(groupedOrders).map(([timeKey, itemsList], index) => {
              const currentDate = timeKey.split(' ')[0]
              const showDateDivider = currentDate !== lastDate
              lastDate = currentDate

              const ordererNameTag = itemsList[0]?.orderer || '익명'
              const isCompleted = itemsList[0]?.is_completed || false

              const vendorGroups = itemsList.reduce((acc, order) => {
                const vName = order.vendor && order.vendor !== '미지정' ? order.vendor : '업체 미지정'
                if (!acc[vName]) acc[vName] = []
                acc[vName].push(order)
                return acc
              }, {} as Record<string, OrderRecord[]>)

              return (
                <div key={timeKey}>
                  {showDateDivider && (
                    <div className={`my-6 pt-4 flex items-center ${index > 0 ? 'border-t-2 border-dashed border-gray-300' : ''}`}>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg shadow-xs">
                        📅 {currentDate}
                      </span>
                    </div>
                  )}

                  <div className={`rounded-2xl border p-5 shadow-sm space-y-4 mb-4 transition-all ${
                    isCompleted ? 'bg-gray-100 border-gray-300 opacity-75' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                          🕒 {timeKey}
                        </span>
                        <span className="text-xs font-extrabold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                          ✍️ {ordererNameTag}
                        </span>
                        {isCompleted && (
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                            ✅ 발주 완료됨
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadForEdit(itemsList)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                        >
                          ✏️ 수정/불러오기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(itemsList, isCompleted)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all ${
                            isCompleted ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isCompleted ? '↩️ 취소' : '✅ 완료'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrderBatch(itemsList)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>

                    {Object.entries(vendorGroups).map(([vendorName, vendorItems]) => {
                      const isUnassigned = vendorName === '업체 미지정'
                      const isFruitTab = boardSubTab === 'FRUIT'

                      return (
                        <div key={vendorName} className={`rounded-xl p-4 border space-y-3 shadow-xs ${
                          isUnassigned ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-100'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-sm text-gray-800 flex items-center space-x-1">
                              <span>🏢 {vendorName}</span>
                              <span className="text-xs text-gray-500 font-normal ml-1">({vendorItems.length}개 품목)</span>
                            </span>

                            {!isUnassigned && (
                              <button
                                type="button"
                                onClick={() => handleCopyVendorText(vendorName, vendorItems)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center space-x-1"
                              >
                                <span>📋 [{vendorName}] 복사</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {vendorItems.map(order => {
                              const unit = getItemUnit(order.item_id, order.item_name)
                              const currentV = order.vendor

                              return (
                                <div key={order.id} className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm py-2.5 px-3 rounded-xl bg-white border border-gray-200/80 gap-3">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-800">· {order.item_name}</span>
                                    <span className="font-bold text-indigo-600">{order.quantity}{unit}</span>
                                  </div>

                                  <div className="flex items-center space-x-1.5 bg-gray-100 p-1.5 rounded-xl w-full md:w-auto justify-end">
                                    <span className="text-[11px] font-bold text-gray-500 mr-1">업체지정:</span>
                                    {!isFruitTab ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleAssignVendor(order.id, '협동')}
                                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            currentV === '협동' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                                          }`}
                                        >
                                          협동
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAssignVendor(order.id, '옥승')}
                                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            currentV === '옥승' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                                          }`}
                                        >
                                          옥승
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleAssignVendor(order.id, '영주')}
                                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            currentV === '영주' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                                          }`}
                                        >
                                          영주
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleAssignVendor(order.id, '진성')}
                                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                            currentV === '진성' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                                          }`}
                                        >
                                          진성
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {mainTab === 'STATS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <span>📊 주별 · 업체별 발주 현황 요약</span>
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              ✅ 완료된 발주만 집계됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-blue-600 block">총 완료 건수</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">{totalOrderCount}건</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-emerald-600 block">업체별 현황</span>
              <span className="text-xs font-black text-emerald-900 mt-2 block">
                {Object.entries(vendorStats).map(([v, q]) => `${v}: ${q}개`).join(' / ') || '데이터 없음'}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-amber-600 block">채소 / 과일 별 현황</span>
              <span className="text-xs font-black text-amber-900 mt-2 block">
                채소: {totalVegQty}개 / 과일: {totalFruitQty}개
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-800 border-b pb-2">📅 주별 · 업체별 완료 품목 내역</h3>
            {sortedWeeklyStats.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">완료된 주별 발주 기록이 없습니다.</p>
            ) : (
              <div className="space-y-6">
                {sortedWeeklyStats.map(([weekName, data]) => {
                  return (
                    <div key={weekName} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm font-black text-indigo-700">🗓️ {weekName}</span>
                        <span className="text-xs font-bold text-gray-600">
                          완료된 발주 횟수: <strong className="text-blue-600">{data.orderCount}회</strong>
                        </span>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(data.vendors).map(([vendorName, vendorData]: [string, any]) => {
                          const hasVeg = Object.keys(vendorData.vegItems).length > 0
                          const hasFruit = Object.keys(vendorData.fruitItems).length > 0

                          return (
                            <div key={vendorName} className="bg-white border border-indigo-100 rounded-xl p-3.5 space-y-3 shadow-xs">
                              <span className="text-xs font-extrabold text-indigo-900 block pb-1 border-b border-gray-100">
                                🏢 {vendorName} 발주 내역
                              </span>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50/40 border border-green-200 rounded-lg p-2.5 space-y-1.5">
                                  <span className="text-[11px] font-bold text-green-700 block pb-1 border-b border-green-100">
                                    🥦 채소류
                                  </span>
                                  {!hasVeg ? (
                                    <p className="text-[10px] text-gray-400 py-1 text-center">내역 없음</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {Object.entries(vendorData.vegItems).map(([itemName, itemInfo]: [string, any]) => (
                                        <div key={itemName} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-green-100 text-[11px]">
                                          <span className="font-bold text-gray-800 truncate mr-1">· {itemName}</span>
                                          <span className="font-extrabold text-green-700 shrink-0">{itemInfo.qty}{itemInfo.unit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="bg-red-50/40 border border-red-200 rounded-lg p-2.5 space-y-1.5">
                                  <span className="text-[11px] font-bold text-red-600 block pb-1 border-b border-red-100">
                                    🍎 과일류
                                  </span>
                                  {!hasFruit ? (
                                    <p className="text-[10px] text-gray-400 py-1 text-center">내역 없음</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {Object.entries(vendorData.fruitItems).map(([itemName, itemInfo]: [string, any]) => (
                                        <div key={itemName} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-red-100 text-[11px]">
                                          <span className="font-bold text-gray-800 truncate mr-1">· {itemName}</span>
                                          <span className="font-extrabold text-red-600 shrink-0">{itemInfo.qty}{itemInfo.unit}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {mainTab === 'MANAGE' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <span>⚙️ 새로운 발주 품목 추가하기</span>
          </h2>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleAddNewItem} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-2">1. 상위 분류 선택</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNewItemTopCat('VEG')
                      setNewItemSubCat('veg_frequent')
                    }}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                      newItemTopCat === 'VEG' ? 'bg-green-700 text-white border-green-700 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    🥦 채소류
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewItemTopCat('FRUIT')
                      setNewItemSubCat('fruit_frequent')
                    }}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                      newItemTopCat === 'FRUIT' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    🍎 과일류
                  </button>
                </div>

                <label className="block text-xs font-black text-gray-700 mb-2">2. 세부 분류 선택</label>
                {newItemTopCat === 'VEG' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center space-x-1.5 cursor-pointer p-2 rounded-lg border bg-gray-50">
                      <input
                        type="radio"
                        name="newSubCategory"
                        checked={newItemSubCat === 'veg_frequent'}
                        onChange={() => setNewItemSubCat('veg_frequent')}
                        className="text-green-600"
                      />
                      <span className="text-xs font-bold text-green-700">자주 발주</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer p-2 rounded-lg border bg-gray-50">
                      <input
                        type="radio"
                        name="newSubCategory"
                        checked={newItemSubCat === 'veg_special'}
                        onChange={() => setNewItemSubCat('veg_special')}
                        className="text-emerald-600"
                      />
                      <span className="text-xs font-bold text-emerald-700">특수 야채</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer p-2 rounded-lg border bg-gray-50">
                      <input
                        type="radio"
                        name="newSubCategory"
                        checked={newItemSubCat === 'veg_occasional'}
                        onChange={() => setNewItemSubCat('veg_occasional')}
                        className="text-blue-600"
                      />
                      <span className="text-xs font-bold text-blue-700">가끔 넣는</span>
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border bg-gray-50">
                      <input
                        type="radio"
                        name="newSubCategory"
                        checked={newItemSubCat === 'fruit_frequent'}
                        onChange={() => setNewItemSubCat('fruit_frequent')}
                        className="text-red-600"
                      />
                      <span className="text-xs font-bold text-red-600">자주 발주</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg border bg-gray-50">
                      <input
                        type="radio"
                        name="newSubCategory"
                        checked={newItemSubCat === 'fruit_special'}
                        onChange={() => setNewItemSubCat('fruit_special')}
                        className="text-orange-600"
                      />
                      <span className="text-xs font-bold text-orange-600">특수 과일</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">품목 이름</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="예: 애호박, 사과 등"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">단위 (예: 박스, 봉, 팩, 통)</label>
                <input
                  type="text"
                  value={newItemUnit}
                  onChange={e => setNewItemUnit(e.target.value)}
                  placeholder="박스"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all disabled:bg-gray-400"
              >
                ➕ 새 품목 등록하기
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-gray-800 border-b pb-2">📋 현재 등록된 전체 품목 목록 ({items.length}개)</h3>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {items.map(item => {
                const c = item.category?.toLowerCase() || ''
                let badgeText = '자주발주'
                let badgeColor = 'bg-green-100 text-green-700'
                if (c === 'veg_special') { badgeText = '특수야채'; badgeColor = 'bg-emerald-100 text-emerald-700'; }
                else if (c === 'veg_occasional') { badgeText = '가끔넣는'; badgeColor = 'bg-blue-100 text-blue-700'; }
                else if (c === 'fruit_special') { badgeText = '특수과일'; badgeColor = 'bg-orange-100 text-orange-700'; }
                else if (c.includes('fruit')) { badgeText = '자주발주(과일)'; badgeColor = 'bg-red-100 text-red-600'; }

                return (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-xl border text-sm">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>
                        {badgeText}
                      </span>
                      <span className="font-bold text-gray-800">{item.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-semibold">{item.unit}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
