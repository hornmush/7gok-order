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

interface PriceHistoryRecord {
  id: number
  item_id: number
  item_name: string
  price: number
  recorded_date: string
}

interface ItemPricePair {
  name: string
  price: string
}

interface PeriodData {
  label: string
  fruit: ItemPricePair[]
  veg: ItemPricePair[]
}

interface EventRecord {
  id: number
  title: string
  period: string
  event_data: {
    wholeVeg: ItemPricePair[]
    wholeFruit: ItemPricePair[]
    periods: PeriodData[]
  }
  created_at: string
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [orderInputs, setOrderInputs] = useState<OrderInput>({})
  const [loading, setLoading] = useState(false)
  
  const [mainTab, setMainTab] = useState<'WRITE' | 'BOARD' | 'STATS' | 'CHART' | 'MANAGE' | 'EVENT'>('WRITE')
  
  // 2계층 탭 구조 상태
  const [topTab, setTopTab] = useState<'VEG' | 'FRUIT'>('VEG')
  const [vegSubTab, setVegSubTab] = useState<'VEG_FREQUENT' | 'VEG_PACKAGED' | 'VEG_SPECIAL' | 'VEG_OCCASIONAL'>('VEG_FREQUENT')
  const [fruitSubTab, setFruitSubTab] = useState<'FRUIT_FREQUENT' | 'FRUIT_SPECIAL'>('FRUIT_FREQUENT')

  const [boardSubTab, setBoardSubTab] = useState<'VEG' | 'FRUIT'>('VEG')
  const [searchQuery, setSearchQuery] = useState('')
  const [ordererName, setOrdererName] = useState('농산팀')
  const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([])
  const [editingOriginalTime, setEditingOriginalTime] = useState<string | null>(null)

  // 시세 히스토리 및 차트 검색 상태
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([])
  const [selectedChartItemId, setSelectedChartItemId] = useState<number | null>(null)
  const [chartItemSearch, setChartItemSearch] = useState('')
  const [inputPrice, setInputPrice] = useState('')
  const [inputPriceDate, setInputPriceDate] = useState(new Date().toISOString().split('T')[0])

  const [newItemName, setNewItemName] = useState('')
  const [newItemTopCat, setNewItemTopCat] = useState<'VEG' | 'FRUIT'>('VEG')
  const [newItemSubCat, setNewItemSubCat] = useState<string>('veg_frequent')
  const [newItemUnit, setNewItemUnit] = useState('박스')
  const [bulkText, setBulkText] = useState('')

  // AI 분석 로딩 상태
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [aiInsightText, setAiInsightText] = useState<string | null>(null)
  const [isAiChartAnalyzing, setIsAiChartAnalyzing] = useState(false)
  const [aiChartInsightText, setAiChartInsightText] = useState<string | null>(null)

  // 행사 관리 상태
  const [events, setEvents] = useState<EventRecord[]>([])
  const [eventTitle, setEventTitle] = useState('')
  const [eventPeriod, setEventPeriod] = useState('')
  const [wholeVeg, setWholeVeg] = useState<ItemPricePair[]>(Array(6).fill({ name: '', price: '' }))
  const [wholeFruit, setWholeFruit] = useState<ItemPricePair[]>(Array(3).fill({ name: '', price: '' }))
  const [periods, setPeriods] = useState<PeriodData[]>([
    { label: '1차 (금~토~일)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
    { label: '2차 (월~화)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
    { label: '3차 (수~목)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
    { label: '4차 (금~토~일)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
  ])

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
    else if (data) {
      setItems(data)
      if (data.length > 0 && !selectedChartItemId) {
        setSelectedChartItemId(data[0].id)
      }
    }
  }

  const fetchOrderHistory = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('기록 로딩 에러:', error)
    else if (data) setOrderHistory(data)
  }

  const fetchPriceHistory = async () => {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .order('recorded_date', { ascending: true })

    if (error) console.error('시세 히스토리 로딩 에러:', error)
    else if (data) setPriceHistory(data)
  }

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('행사 로딩 에러:', error)
    else if (data) setEvents(data)
  }

  const handleTabChange = (tab: 'WRITE' | 'BOARD' | 'STATS' | 'CHART' | 'MANAGE' | 'EVENT') => {
    setMainTab(tab)
    fetchItems()
    fetchOrderHistory()
    if (tab === 'CHART') fetchPriceHistory()
    if (tab === 'EVENT') fetchEvents()
  }

  useEffect(() => {
    fetchItems()
    fetchOrderHistory()
    fetchPriceHistory()
    fetchEvents()

    const channel = supabase
      .channel('realtime-orders-items-events-prices')
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'price_history' },
        () => { fetchPriceHistory() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => { fetchEvents() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleAddPriceRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChartItemId || !inputPrice.trim()) {
      alert('품목과 가격을 모두 입력해주세요!')
      return
    }

    const targetItem = items.find(i => i.id === selectedChartItemId)
    const priceNum = Number(inputPrice.replace(/[^0-9]/g, ''))

    if (isNaN(priceNum)) {
      alert('올바른 숫자로 가격을 입력해주세요.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('price_history').insert([
      {
        item_id: selectedChartItemId,
        item_name: targetItem?.name || '',
        price: priceNum,
        recorded_date: inputPriceDate,
      },
    ])
    setLoading(false)

    if (error) {
      console.error('시세 등록 에러:', error)
      alert('시세 기록 저장 중 오류가 발생했습니다.')
    } else {
      alert(`📈 [${targetItem?.name}] ${inputPriceDate} 시세가 성공적으로 기록되었습니다!`)
      setInputPrice('')
      fetchPriceHistory()
    }
  }

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

    if (editingOriginalTime) {
      await supabase.from('orders').delete().eq('created_at', editingOriginalTime)
    }

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
    const wasEditing = Boolean(editingOriginalTime)
    setEditingOriginalTime(null)

    if (error) {
      console.error('발주 등록 에러:', error)
      alert('발주 등록 중 오류가 발생했습니다.')
    } else {
      alert(wasEditing ? '✅ 발주 내역이 성공적으로 수정되었습니다!' : '발주 요청이 성공적으로 등록되었습니다!')
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

  const handleBulkAddItems = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkText.trim()) {
      alert('등록할 품목 목록을 입력해주세요!')
      return
    }

    const lines = bulkText.trim().split('\n')
    const newItemsToInsert = []

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.trim().split(/[\s,]+/)
      const name = parts[0]
      const unit = parts[1] || '박스'

      if (name) {
        newItemsToInsert.push({
          category: newItemSubCat,
          name: name,
          unit: unit,
        })
      }
    }

    if (newItemsToInsert.length === 0) {
      alert('등록할 수 있는 유효한 품목이 없습니다.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('items').insert(newItemsToInsert)
    setLoading(false)

    if (error) {
      console.error('일괄 등록 에러:', error)
      alert('일괄 등록 중 오류가 발생했습니다.')
    } else {
      alert(`🎉 총 ${newItemsToInsert.length}개의 품목이 성공적으로 일괄 등록되었습니다!`)
      setBulkText('')
      fetchItems()
    }
  }

  const updateWholeVeg = (index: number, field: 'name' | 'price', val: string) => {
    const updated = [...wholeVeg]
    updated[index] = { ...updated[index], [field]: val }
    setWholeVeg(updated)
  }

  const updateWholeFruit = (index: number, field: 'name' | 'price', val: string) => {
    const updated = [...wholeFruit]
    updated[index] = { ...updated[index], [field]: val }
    setWholeFruit(updated)
  }

  const updatePeriodItem = (pIndex: number, type: 'fruit' | 'veg', itemIndex: number, field: 'name' | 'price', val: string) => {
    const updatedPeriods = [...periods]
    const targetList = [...updatedPeriods[pIndex][type]]
    targetList[itemIndex] = { ...targetList[itemIndex], [field]: val }
    updatedPeriods[pIndex][type] = targetList
    setPeriods(updatedPeriods)
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTitle.trim() || !eventPeriod.trim()) {
      alert('행사 이름과 기간을 입력해주세요!')
      return
    }

    setLoading(true)
    const eventDataPayload = {
      wholeVeg,
      wholeFruit,
      periods,
    }

    const { error } = await supabase.from('events').insert([
      {
        title: eventTitle.trim(),
        period: eventPeriod.trim(),
        event_data: eventDataPayload,
      },
    ])
    setLoading(false)

    if (error) {
      console.error('행사 등록 에러:', error)
      alert('행사 등록 중 오류가 발생했습니다.')
    } else {
      alert('🎉 새로운 행사 계획이 성공적으로 등록되었습니다!')
      setEventTitle('')
      setEventPeriod('')
      setWholeVeg(Array(6).fill({ name: '', price: '' }))
      setWholeFruit(Array(3).fill({ name: '', price: '' }))
      setPeriods([
        { label: '1차 (금~토~일)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
        { label: '2차 (월~화)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
        { label: '3차 (수~목)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
        { label: '4차 (금~토~일)', fruit: Array(3).fill({ name: '', price: '' }), veg: Array(3).fill({ name: '', price: '' }) },
      ])
      fetchEvents()
    }
  }

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('정말 이 행사 계획을 삭제하시겠습니까?')) return

    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) {
      console.error('행사 삭제 에러:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } else {
      fetchEvents()
    }
  }

  const handleCopyEventText = (ev: EventRecord) => {
    const data = ev.event_data
    let text = `🎉 [${ev.title}]\n`
    text += `📅 행사기간: ${ev.period}\n\n`
    
    text += `--- [전기간 상품] ---\n`
    text += `🥦 야채 (6종):\n`
    data.wholeVeg?.forEach((item, idx) => {
      if (item.name) text += `  ${idx + 1}. ${item.name} : ${item.price || '-'}\n`
    })
    text += `🍎 과일 (3종):\n`
    data.wholeFruit?.forEach((item, idx) => {
      if (item.name) text += `  ${idx + 1}. ${item.name} : ${item.price || '-'}\n`
    })

    text += `\n--- [기간별 상품] ---\n`
    data.periods?.forEach(p => {
      text += `[${p.label}]\n`
      text += `  🍎 과일:\n`
      p.fruit?.forEach((f) => {
        if (f.name) text += `    - ${f.name} (${f.price || '-'})\n`
      })
      text += `  🥦 야채:\n`
      p.veg?.forEach((v) => {
        if (v.name) text += `    - ${v.name} (${v.price || '-'})\n`
      })
    })

    navigator.clipboard.writeText(text)
    alert('📋 공유용 텍스트가 클립보드에 복사되었습니다! 단톡방에 붙여넣어 보세요.')
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

  const handleUpdateOrderQuantity = async (orderId: number, newQuantity: number) => {
    const qty = Math.max(1, isNaN(newQuantity) ? 1 : newQuantity)
    const { error } = await supabase
      .from('orders')
      .update({ quantity: qty })
      .eq('id', orderId)

    if (error) {
      console.error('수량 변경 에러:', error)
      alert('수량 변경 중 오류가 발생했습니다.')
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
    setEditingOriginalTime(itemsList[0]?.created_at || null)
    handleTabChange('WRITE')
    alert('📝 해당 발주 기록을 수정 모드로 불러왔습니다! 저장 시 기존 기록이 수정(대체)됩니다.')
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
    const hasUnassigned = itemsList.some(o => !o.vendor || o.vendor === '미지정')
    if (!currentStatus && hasUnassigned) {
      alert('⚠️ 미지정인 품목이 있습니다! 모든 품목의 업체를 지정한 후 완료해주세요.')
      return
    }

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
      if (vegSubTab === 'VEG_PACKAGED') return cat === 'veg_packaged'
      if (vegSubTab === 'VEG_SPECIAL') return cat === 'veg_special'
      if (vegSubTab === 'VEG_OCCASIONAL') return cat === 'veg_occasional'
    } else {
      if (!cat.includes('fruit')) return false
      if (fruitSubTab === 'FRUIT_FREQUENT') return cat === 'fruit_frequent' || cat === 'fruit_main' || cat === 'fruit' || cat === 'fruits' || cat === ''
      if (fruitSubTab === 'FRUIT_SPECIAL') return cat === 'fruit_special'
    }
    return false
  })

  // 렌더링 헬퍼 컴포넌트
  const renderItemCard = (item: Item) => {
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
  }

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

  // AI 분석 실행 함수
  const handleRunAiAnalysis = () => {
    setIsAiAnalyzing(true)
    setTimeout(() => {
      if (completedHistory.length === 0) {
        setAiInsightText("⚠️ 분석할 완료된 발주 데이터가 없습니다. 발주 내역을 '완료' 처리해 주세요.")
      } else {
        const topVendor = Object.entries(vendorStats).sort((a, b) => b[1] - a[1])[0]
        const dominantType = totalVegQty >= totalFruitQty ? '채소류' : '과일류'
        const totalQtySum = totalVegQty + totalFruitQty

        setAiInsightText(
          `🤖 [칠곡농협 농산팀 AI 분석 리포트]\n\n` +
          `• 총 완료된 발주: **${totalOrderCount}회** (총 물량: **${totalQtySum}개**)\n` +
          `• 주력 품목군: 전체 발주량 중 **${dominantType}**의 비중이 가장 높게 집계되었습니다.\n` +
          `• 최다 물량 집중 업체: **${topVendor ? topVendor[0] : '없음'}** (${topVendor ? topVendor[1] : 0}개 물량 배정)\n\n` +
          `💡 **AI 경영 인사이트**: 현재 채소와 과일의 수급 흐름을 볼 때, 주요 협력업체인 [${topVendor ? topVendor[0] : '지정 업체'}]와의 물량 조율이 원활합니다. 주말 및 행사 시즌을 대비해 상위 발주 품목의 실시간 재고 안전율을 미리 점검하시는 것을 추천합니다!`
        )
      }
      setIsAiAnalyzing(false)
    }, 800)
  }

  // AI 시세 차트 분석 실행 함수
  const handleRunAiChartAnalysis = () => {
    setIsAiChartAnalyzing(true)
    setTimeout(() => {
      const targetItem = items.find(i => i.id === selectedChartItemId)
      const currentFilteredPrices = priceHistory.filter(p => p.item_id === selectedChartItemId)

      if (currentFilteredPrices.length < 2) {
        setAiChartInsightText("⚠️ 시세 분석을 위한 데이터(최소 2건 이상)가 부족합니다. 날짜별 시세를 더 기록해 주세요!")
      } else {
        const firstPrice = currentFilteredPrices[0].price
        const lastPrice = currentFilteredPrices[currentFilteredPrices.length - 1].price
        const diffRate = (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1)
        const trendText = Number(diffRate) >= 0 ? `상승세 (+${diffRate}%)` : `하락세 (${diffRate}%)`

        setAiChartInsightText(
          `📈 [AI 시세 트렌드 전문 분석]\n\n` +
          `• 대상 품목: **${targetItem?.name || '선택 품목'}**\n` +
          `• 가격 추이 변동: 기록된 기간 동안 **${trendText}**를 보이고 있습니다.\n\n` +
          `💡 **구매/행사 전략 제언**: 최근 도매 시세 흐름을 분석한 결과, 주말 수요 집중 구간에 가격 변동폭이 감지됩니다. 대량 매입 또는 주말 특가 행사(토요 붐 등) 기획 시 사전에 물량을 분산 비축하는 전략이 유리합니다.`
        )
      }
      setIsAiChartAnalyzing(false)
    }, 800)
  }

  const currentItemSelected = items.find(i => i.id === selectedChartItemId)
  const filteredPricesForChart = priceHistory.filter(p => p.item_id === selectedChartItemId)
  
  // 차트 탭 내에서 검색어로 필터링된 품목 리스트
  const filteredChartItemsList = items.filter(i => 
    i.name.toLowerCase().includes(chartItemSearch.toLowerCase().trim())
  )

  return (
    <main className="max-w-4xl mx-auto p-4 pb-28">
      <div className="text-center my-6">
        <h1 className="text-2xl font-extrabold text-gray-900">🛒 칠곡농협 농산팀 실시간 발주 시스템</h1>
        <p className="text-xs text-gray-500 mt-1">품목 선택, 발주 관리, 주별 통계, 시세 차트 및 행사 관리를 할 수 있습니다.</p>
      </div>

      {/* 상단 메인 탭 네비게이션: 2줄 레이아웃 (3열 x 2행) 적용 */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <button
          type="button"
          onClick={() => handleTabChange('WRITE')}
          className={`py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'WRITE' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✍️ 발주작성
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('BOARD')}
          className={`py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'BOARD' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📋 발주 확인
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('STATS')}
          className={`py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'STATS' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📊 주별통계
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('CHART')}
          className={`py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'CHART' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📈 시세차트
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('EVENT')}
          className={`py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'EVENT' ? 'bg-amber-600 text-white shadow-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🎉 행사관리
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('MANAGE')}
          className={`py-3 text-xs sm:text-sm font-black rounded-xl transition-all shadow-sm ${
            mainTab === 'MANAGE' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ⚙️ 품목관리
        </button>
      </div>

      {mainTab === 'WRITE' && (
        <>
          {editingOriginalTime && (
            <div className="bg-amber-50 border-2 border-amber-300 p-3.5 rounded-2xl mb-4 flex items-center justify-between shadow-sm">
              <span className="text-xs font-black text-amber-900">✏️ 기존 발주 수정 중입니다 (저장 시 기존 항목이 수정/대체됩니다)</span>
              <button
                type="button"
                onClick={() => { setEditingOriginalTime(null); setOrderInputs({}); }}
                className="text-xs font-bold text-red-600 bg-white px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50"
              >
                수정 취소
              </button>
            </div>
          )}

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

          {topTab === 'VEG' && searchQuery === '' && (
            <div className="grid grid-cols-4 gap-1.5 bg-gray-100 p-1.5 rounded-xl mb-6 shadow-inner border border-green-200">
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_FREQUENT')}
                className={`py-2.5 text-[11px] sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_FREQUENT' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🥬 자주 발주
              </button>
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_PACKAGED')}
                className={`py-2.5 text-[11px] sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_PACKAGED' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🛍️ 포장된
              </button>
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_SPECIAL')}
                className={`py-2.5 text-[11px] sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_SPECIAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🥕 특수 야채
              </button>
              <button
                type="button"
                onClick={() => setVegSubTab('VEG_OCCASIONAL')}
                className={`py-2.5 text-[11px] sm:text-sm font-bold rounded-lg transition-all ${
                  vegSubTab === 'VEG_OCCASIONAL' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🧅 가끔 넣는
              </button>
            </div>
          )}

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

          {searchQuery !== '' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {filteredItems.map(item => renderItemCard(item))}
            </div>
          ) : topTab === 'VEG' && vegSubTab === 'VEG_FREQUENT' ? (
            (() => {
              const boxItems = filteredItems.filter(i => i.name.includes('박스'))
              const potatoItems = filteredItems.filter(i => (i.name.includes('감자') || i.name.includes('고구마')) && !i.name.includes('박스'))
              const mushroomItems = filteredItems.filter(i => i.name.includes('버섯') && !i.name.includes('박스') && !i.name.includes('감자') && !i.name.includes('고구마'))
              const onionItems = filteredItems.filter(i => i.name.includes('양파') && !i.name.includes('박스') && !i.name.includes('감자') && !i.name.includes('고구마') && !i.name.includes('버섯'))
              const restItems = filteredItems.filter(i => 
                !i.name.includes('박스') && 
                !i.name.includes('감자') && !i.name.includes('고구마') && 
                !i.name.includes('버섯') && 
                !i.name.includes('양파')
              )

              return (
                <div className="space-y-6 mb-8">
                  {restItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-gray-700">🥬 일반 자주 발주 품목</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {restItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}

                  {boxItems.length > 0 && (
                    <div className="bg-emerald-50/50 border-2 border-emerald-300 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-black text-emerald-900 flex items-center space-x-1 border-b border-emerald-200 pb-2">
                        <span>📦 박스류 품목</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {boxItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}

                  {potatoItems.length > 0 && (
                    <div className="bg-amber-50/50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-black text-amber-900 flex items-center space-x-1 border-b border-amber-200 pb-2">
                        <span>🥔 감자 · 고구마류</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {potatoItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}

                  {mushroomItems.length > 0 && (
                    <div className="bg-orange-50/50 border-2 border-orange-300 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-black text-orange-900 flex items-center space-x-1 border-b border-orange-200 pb-2">
                        <span>🍄 버섯류</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mushroomItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}

                  {onionItems.length > 0 && (
                    <div className="bg-purple-50/50 border-2 border-purple-300 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-black text-purple-900 flex items-center space-x-1 border-b border-purple-200 pb-2">
                        <span>🧅 양파류 (양파 · 적양파)</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {onionItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()
          ) : topTab === 'VEG' && vegSubTab === 'VEG_SPECIAL' ? (
            <div className="space-y-6 mb-8">
              {filteredItems.filter(i => ['삼색파프리카봉', '빨파프', '노파프', '주황파프'].some(n => i.name.includes(n))).length > 0 && (
                <div className="bg-amber-50/60 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-black text-amber-900 flex items-center space-x-1 border-b border-amber-200 pb-2">
                    <span>🌶️ 파프리카류</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredItems.filter(i => ['삼색파프리카봉', '빨파프', '노파프', '주황파프'].some(n => i.name.includes(n))).map(item => renderItemCard(item))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-700">🥕 기타 특수 야채 품목</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredItems.filter(i => !['삼색파프리카봉', '빨파프', '노파프', '주황파프'].some(n => i.name.includes(n))).map(item => renderItemCard(item))}
                </div>
              </div>
            </div>
          ) : topTab === 'VEG' && vegSubTab === 'VEG_OCCASIONAL' ? (
            (() => {
              const driedItems = filteredItems.filter(i => i.name.startsWith('건') || i.name.includes('청각'))
              const restItems = filteredItems.filter(i => !(i.name.startsWith('건') || i.name.includes('청각')))

              return (
                <div className="space-y-6 mb-8">
                  {driedItems.length > 0 && (
                    <div className="bg-amber-50/50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
                      <h3 className="text-xs font-black text-amber-900 flex items-center space-x-1 border-b border-amber-200 pb-2">
                        <span>📦 건조류 (건~ / 청각)</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {driedItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}

                  {restItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-gray-700">🧅 기타 가끔 넣는 품목</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {restItems.map(item => renderItemCard(item))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {filteredItems.map(item => renderItemCard(item))}
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t shadow-lg flex justify-center">
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={loading}
              className={`w-full max-w-md font-bold py-3.5 px-6 rounded-xl shadow-md transition-all disabled:bg-gray-400 flex items-center justify-center space-x-2 text-white ${
                editingOriginalTime ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <span>{editingOriginalTime ? '✏️ 수정 완료 저장하기' : '📝 발주 요청 올리기'}</span>
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
              const hasUnassigned = itemsList.some(o => !o.vendor || o.vendor === '미지정')

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
                        {hasUnassigned && !isCompleted && (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                            ⚠️ 미지정 업체가 있습니다
                          </span>
                        )}
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
                            isCompleted
                              ? 'bg-amber-500 hover:bg-amber-600 text-white'
                              : hasUnassigned
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
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

                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {itemsList.map(order => {
                        const unit = getItemUnit(order.item_id, order.item_name)
                        const currentV = order.vendor || '미지정'
                        const isFruitTab = boardSubTab === 'FRUIT'
                        const isPotatoOrSweetPotato = order.item_name.includes('감자') || order.item_name.includes('고구마')

                        return (
                          <div key={order.id} className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm py-2.5 px-3 rounded-xl bg-white border border-gray-200/80 gap-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-800">· {order.item_name}</span>
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={order.quantity}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateOrderQuantity(order.id, Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-right text-sm font-bold border rounded bg-white text-indigo-600 focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-xs text-gray-500 font-medium">{unit}</span>
                              </div>
                              {currentV === '미지정' && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded ml-1">미지정</span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1.5 bg-gray-100 p-1.5 rounded-xl w-full md:w-auto justify-end">
                              <span className="text-[11px] font-bold text-gray-500 mr-1">업체지정:</span>
                              {!isFruitTab ? (
                                isPotatoOrSweetPotato ? (
                                  <>
                                    {(['협동', '옥승', '창성'] as const).map(vName => (
                                      <button
                                        key={vName}
                                        type="button"
                                        onClick={() => handleAssignVendor(order.id, vName)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                          currentV === vName ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                                        }`}
                                      >
                                        {vName}
                                      </button>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {(['협동', '옥승', '인정'] as const).map(vName => (
                                      <button
                                        key={vName}
                                        type="button"
                                        onClick={() => handleAssignVendor(order.id, vName)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                          currentV === vName ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                                        }`}
                                      >
                                        {vName}
                                      </button>
                                    ))}
                                  </>
                                )
                              ) : (
                                <>
                                  {(['영주', '진성'] as const).map(vName => (
                                    <button
                                      key={vName}
                                      type="button"
                                      onClick={() => handleAssignVendor(order.id, vName)}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        currentV === vName ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-200'
                                      }`}
                                    >
                                      {vName}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {(() => {
                      const vendorMap = itemsList.reduce((acc, order) => {
                        const v = order.vendor && order.vendor !== '미지정' ? order.vendor : '미지정'
                        if (!acc[v]) acc[v] = []
                        acc[v].push(order)
                        return acc
                      }, {} as Record<string, OrderRecord[]>)

                      const assignedVendors = Object.entries(vendorMap).filter(([v]) => v !== '미지정')
                      if (assignedVendors.length === 0) return null

                      return (
                        <div className="pt-2 flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-bold text-gray-500 mr-1">업체별 복사:</span>
                          {assignedVendors.map(([vName, vItems]) => (
                            <button
                              key={vName}
                              type="button"
                              onClick={() => handleCopyVendorText(vName, vItems)}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center space-x-1"
                            >
                              <span>📋 [{vName}] 복사 ({vItems.length}개)</span>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
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

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4 border border-indigo-500/30">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-indigo-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🤖</span>
                <h3 className="text-base font-black text-white">AI 스마트 발주 분석 리포트</h3>
              </div>
              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAiAnalyzing}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:bg-gray-600"
              >
                <span>{isAiAnalyzing ? '⏳ 분석 중...' : '✨ AI 분석 실행 / 새로고침'}</span>
              </button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-xs leading-relaxed text-slate-200">
              {isAiAnalyzing ? (
                <div className="text-center py-6 text-indigo-300 font-bold animate-pulse">
                  🔮 완료된 발주 데이터를 바탕으로 AI가 핵심 인사이트를 분석하고 있습니다...
                </div>
              ) : aiInsightText ? (
                <div className="whitespace-pre-line font-medium">
                  {aiInsightText}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  우측 상단의 **[✨ AI 분석 실행 / 새로고침]** 버튼을 눌러 완료된 발주 통계에 대한 전문적인 분석 리포트를 확인해보세요!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📈 [📈 시세차트] 탭 (검색 + 리스트 + 점선 그래프 적용) */}
      {mainTab === 'CHART' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <span>📈 품목별 도매 시세 히스토리 및 트렌드 분석</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">검색으로 품목을 빠르게 찾아 시세를 기록하고, 점선 그래프를 통한 가격 변동 흐름과 AI 분석을 확인하세요.</p>
            </div>
          </div>

          {/* 시세 입력 폼 */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-emerald-900 border-b border-emerald-200 pb-2">
              ➕ 당일 도매 시세 기록하기
            </h3>

            {/* 품목 검색창 추가 */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-emerald-900">🔍 품목 검색 및 선택</label>
              <input
                type="text"
                placeholder="검색할 품목 이름 입력 (예: 사과, 대파...)"
                value={chartItemSearch}
                onChange={e => setChartItemSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white font-bold text-gray-800 focus:outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <form onSubmit={handleAddPriceRecord} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">검색된 품목 리스트</label>
                <select
                  value={selectedChartItemId || ''}
                  onChange={e => setSelectedChartItemId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-xs border rounded-xl bg-white font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
                >
                  {filteredChartItemsList.length === 0 ? (
                    <option value="">검색 결과 없음</option>
                  ) : (
                    filteredChartItemsList.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">기준 날짜 및 도매 시세 (원)</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={inputPriceDate}
                    onChange={e => setInputPriceDate(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs border rounded-xl bg-white font-bold text-gray-800 focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    placeholder="예: 15000"
                    value={inputPrice}
                    onChange={e => setInputPrice(e.target.value)}
                    className="w-1/2 px-3 py-2 text-xs border rounded-xl bg-white font-bold text-gray-800 focus:outline-none focus:border-emerald-600 text-right"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all text-xs"
              >
                📈 시세 저장하기
              </button>
            </form>
          </div>

          {/* 시세 시각화 (점선 그래프) 및 리스트 영역 */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  📊 [{currentItemSelected?.name || '품목'}] 시세 변동 흐름
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">단위: 원 ({currentItemSelected?.unit || '기준'})</p>
              </div>

              <div className="w-56">
                <select
                  value={selectedChartItemId || ''}
                  onChange={e => setSelectedChartItemId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 font-bold"
                >
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredPricesForChart.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-xs">
                  아직 기록된 [{currentItemSelected?.name}] 시세 데이터가 없습니다. 상단에서 시세를 입력해 보세요!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 📈 점선 그래프 영역 (SVG Line Chart with strokeDasharray) */}
                <div className="bg-gray-50 p-4 rounded-2xl border space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-600">📈 시세 추이 점선 그래프</span>
                    <span className="text-[11px] font-semibold text-emerald-700">· · · 변동 추세선</span>
                  </div>
                  
                  <div className="w-full overflow-x-auto">
                    <svg viewBox="0 0 500 210" className="w-full h-48 overflow-visible">
                      {/* 가이드 격자선 */}
                      <line x1="40" y1="20" x2="40" y2="170" stroke="#E5E7EB" strokeWidth="1" />
                      <line x1="40" y1="170" x2="480" y2="170" stroke="#E5E7EB" strokeWidth="1" />
                      <line x1="40" y1="95" x2="480" y2="95" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="3,3" />

                      {(() => {
                        const prices = filteredPricesForChart.map(p => p.price);
                        const minP = Math.min(...prices);
                        const maxP = Math.max(...prices);
                        const range = maxP - minP === 0 ? 1 : maxP - minP;

                        const paddingX = 55;
                        const paddingY = 25;
                        const chartW = 410;
                        const chartH = 130;

                        const points = filteredPricesForChart.map((record, idx, arr) => {
                          const x = paddingX + (arr.length === 1 ? chartW / 2 : (idx / (arr.length - 1)) * chartW);
                          const y = paddingY + chartH - ((record.price - minP) / range) * chartH;
                          return { x, y, ...record };
                        });

                        const pathData = points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

                        return (
                          <>
                            {/* 점선 연결 라인 (strokeDasharray="6,6") */}
                            {points.length > 1 && (
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#059669"
                                strokeWidth="2.5"
                                strokeDasharray="6,6"
                              />
                            )}

                            {/* 데이터 포인트 원 및 가격/날짜 텍스트 */}
                            {points.map((pt) => (
                              <g key={pt.id}>
                                <circle cx={pt.x} cy={pt.y} r="4.5" fill="#059669" className="transition-all" />
                                <text x={pt.x} y={pt.y - 10} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#047857">
                                  {pt.price.toLocaleString()}
                                </text>
                                <text x={pt.x} y="190" fontSize="9" fontWeight="medium" fill="#6B7280" textAnchor="middle">
                                  {pt.recorded_date.slice(5)}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* 내역 목록 테이블 */}
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-3">기록 날짜</th>
                        <th className="p-3">품목명</th>
                        <th className="p-3 text-right">도매 시세</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredPricesForChart.map(record => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-600 font-medium">{record.recorded_date}</td>
                          <td className="p-3 font-bold text-gray-800">{record.item_name}</td>
                          <td className="p-3 text-right font-extrabold text-emerald-700">{record.price.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* AI 시세 트렌드 분석 리포트 카드 */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4 border border-emerald-500/30">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-emerald-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🤖</span>
                <h3 className="text-base font-black text-white">AI 시세 변동 예측 및 트렌드 리포트</h3>
              </div>
              <button
                type="button"
                onClick={handleRunAiChartAnalysis}
                disabled={isAiChartAnalyzing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:bg-gray-600"
              >
                <span>{isAiChartAnalyzing ? '⏳ 분석 중...' : '✨ 시세 트렌드 분석 실행'}</span>
              </button>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-xs leading-relaxed text-slate-200">
              {isAiChartAnalyzing ? (
                <div className="text-center py-6 text-emerald-300 font-bold animate-pulse">
                  🔮 누적된 도매 시세 히스토리를 분석하여 가격 변동 트렌드를 예측하고 있습니다...
                </div>
              ) : aiChartInsightText ? (
                <div className="whitespace-pre-line font-medium">
                  {aiChartInsightText}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  우측 상단의 **[✨ 시세 트렌드 분석 실행]** 버튼을 눌러 선택한 품목의 가격 변동 흐름과 맞춤형 행사/매입 전략을 확인해보세요!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mainTab === 'EVENT' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <span>🎉 농산팀 행사 계획 및 공유 (품목/가격 칸 분리형)</span>
          </h2>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-800 border-b pb-2">➕ 새로운 행사 등록하기</h3>
            <form onSubmit={handleAddEvent} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">행사 이름</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    placeholder="예: 토요 붐 할인 행사"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">행사 기간</label>
                  <input
                    type="text"
                    value={eventPeriod}
                    onChange={e => setEventPeriod(e.target.value)}
                    placeholder="예: 3월 7일 ~ 3월 14일"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t">
                <h4 className="text-xs font-black text-indigo-900 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                  🛒 전기간 상품 입력 (야채 6종 / 과일 3종)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50/40 p-4 rounded-xl border border-green-200 space-y-2">
                    <span className="text-xs font-bold text-green-800 block mb-1">🥦 전기간 야채 (총 6개)</span>
                    {wholeVeg.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateWholeVeg(idx, 'name', e.target.value)}
                          placeholder={`야채 ${idx + 1} 품목명`}
                          className="flex-2 px-2.5 py-1.5 text-xs border rounded-lg bg-white font-medium"
                        />
                        <input
                          type="text"
                          value={item.price}
                          onChange={e => updateWholeVeg(idx, 'price', e.target.value)}
                          placeholder="가격/규격"
                          className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white font-medium"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-red-50/40 p-4 rounded-xl border border-red-200 space-y-2">
                    <span className="text-xs font-bold text-red-700 block mb-1">🍎 전기간 과일 (총 3개)</span>
                    {wholeFruit.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateWholeFruit(idx, 'name', e.target.value)}
                          placeholder={`과일 ${idx + 1} 품목명`}
                          className="flex-2 px-2.5 py-1.5 text-xs border rounded-lg bg-white font-medium"
                        />
                        <input
                          type="text"
                          value={item.price}
                          onChange={e => updateWholeFruit(idx, 'price', e.target.value)}
                          placeholder="가격/규격"
                          className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg bg-white font-medium"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-3 border-t">
                <h4 className="text-xs font-black text-amber-950 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  📌 세부기간별 상품 입력 (4개 기간별 과일 3종 / 야채 3종)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {periods.map((p, pIdx) => (
                    <div key={pIdx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <span className="text-xs font-black text-indigo-900 bg-white px-2.5 py-1 rounded-md border shadow-xs inline-block">
                        {p.label}
                      </span>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-red-600 block">🍎 과일 (3종)</span>
                        {p.fruit.map((f, fIdx) => (
                          <div key={fIdx} className="flex gap-1.5">
                            <input
                              type="text"
                              value={f.name}
                              onChange={e => updatePeriodItem(pIdx, 'fruit', fIdx, 'name', e.target.value)}
                              placeholder={`과일 ${fIdx + 1} 품목명`}
                              className="flex-2 px-2 py-1 text-xs border rounded bg-white"
                            />
                            <input
                              type="text"
                              value={f.price}
                              onChange={e => updatePeriodItem(pIdx, 'fruit', fIdx, 'price', e.target.value)}
                              placeholder="가격"
                              className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-green-700 block">🥦 야채 (3종)</span>
                        {p.veg.map((v, vIdx) => (
                          <div key={vIdx} className="flex gap-1.5">
                            <input
                              type="text"
                              value={v.name}
                              onChange={e => updatePeriodItem(pIdx, 'veg', vIdx, 'name', e.target.value)}
                              placeholder={`야채 ${vIdx + 1} 품목명`}
                              className="flex-2 px-2 py-1 text-xs border rounded bg-white"
                            />
                            <input
                              type="text"
                              value={v.price}
                              onChange={e => updatePeriodItem(pIdx, 'veg', vIdx, 'price', e.target.value)}
                              placeholder="가격"
                              className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all disabled:bg-gray-400 mt-2"
              >
                🎉 행사 계획 등록하기
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-extrabold text-gray-800">📋 등록된 행사 계획 목록 ({events.length}건)</h3>
            {events.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">등록된 행사 계획이 없습니다.</p>
              </div>
            ) : (
              events.map(ev => {
                const data = ev.event_data
                return (
                  <div key={ev.id} className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                      <div>
                        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
                          📅 {ev.period}
                        </span>
                        <h4 className="text-lg font-black text-gray-900 mt-1.5">{ev.title}</h4>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyEventText(ev)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1"
                        >
                          <span>📋 공유용 텍스트 복사</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all"
                        >
                          🗑️ 삭제
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50/40 p-3.5 rounded-xl border border-green-200">
                        <span className="text-xs font-black text-green-800 block mb-2 border-b pb-1">🥦 전기간 야채 (6종)</span>
                        <div className="space-y-1 text-xs">
                          {data.wholeVeg?.map((item, i) => (
                            item.name ? (
                              <div key={i} className="flex justify-between bg-white px-2.5 py-1 rounded border border-green-100">
                                <span className="font-bold text-gray-800">· {item.name}</span>
                                <span className="font-semibold text-green-700">{item.price || '-'}</span>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>

                      <div className="bg-red-50/40 p-3.5 rounded-xl border border-red-200">
                        <span className="text-xs font-black text-red-700 block mb-2 border-b pb-1">🍎 전기간 과일 (3종)</span>
                        <div className="space-y-1 text-xs">
                          {data.wholeFruit?.map((item, i) => (
                            item.name ? (
                              <div key={i} className="flex justify-between bg-white px-2.5 py-1 rounded border border-red-100">
                                <span className="font-bold text-gray-800">· {item.name}</span>
                                <span className="font-semibold text-red-600">{item.price || '-'}</span>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-black text-gray-600">📌 세부기간별 상품 (과일 3종 / 야채 3종)</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.periods?.map((p, pIdx) => (
                          <div key={pIdx} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                            <span className="text-xs font-black text-indigo-700 block border-b pb-1">▪️ {p.label}</span>
                            <div className="text-xs space-y-1 text-gray-800">
                              <p className="font-bold text-red-600">🍎 과일:</p>
                              {p.fruit?.map((f, fi) => f.name ? <p key={fi} className="pl-3">· {f.name} ({f.price || '-'})</p> : null)}
                              <p className="font-bold text-green-700 pt-1">🥦 야채:</p>
                              {p.veg?.map((v, vi) => v.name ? <p key={vi} className="pl-3">· {v.name} ({v.price || '-'})</p> : null)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {mainTab === 'MANAGE' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <span>⚙️ 발주 품목 관리 (개별 및 일괄 등록)</span>
          </h2>

          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-indigo-900 border-b border-indigo-200 pb-2 flex items-center">
              <span>🚀 여러 품목 한 번에 일괄 등록 (대량 등록)</span>
            </h3>
            
            <form onSubmit={handleBulkAddItems} className="space-y-3">
              <div>
                <label className="block text-xs font-black text-indigo-900 mb-2">1. 등록할 상위/세부 분류 선택</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewItemTopCat('VEG')
                      setNewItemSubCat('veg_frequent')
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newItemTopCat === 'VEG' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700'
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
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      newItemTopCat === 'FRUIT' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700'
                    }`}
                  >
                    🍎 과일류
                  </button>
                </div>

                {newItemTopCat === 'VEG' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <label className="flex items-center space-x-1 cursor-pointer p-2 rounded-lg border bg-white text-[11px]">
                      <input type="radio" name="bulkSub" checked={newItemSubCat === 'veg_frequent'} onChange={() => setNewItemSubCat('veg_frequent')} />
                      <span className="font-bold text-green-700">자주 발주</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer p-2 rounded-lg border bg-white text-[11px]">
                      <input type="radio" name="bulkSub" checked={newItemSubCat === 'veg_packaged'} onChange={() => setNewItemSubCat('veg_packaged')} />
                      <span className="font-bold text-teal-700">포장된</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer p-2 rounded-lg border bg-white text-[11px]">
                      <input type="radio" name="bulkSub" checked={newItemSubCat === 'veg_special'} onChange={() => setNewItemSubCat('veg_special')} />
                      <span className="font-bold text-emerald-700">특수 야채</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer p-2 rounded-lg border bg-white text-[11px]">
                      <input type="radio" name="bulkSub" checked={newItemSubCat === 'veg_occasional'} onChange={() => setNewItemSubCat('veg_occasional')} />
                      <span className="font-bold text-blue-700">가끔 넣는</span>
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <label className="flex items-center space-x-1 cursor-pointer p-2 rounded-lg border bg-white text-[11px]">
                      <input type="radio" name="bulkSub" checked={newItemSubCat === 'fruit_frequent'} onChange={() => setNewItemSubCat('fruit_frequent')} />
                      <span className="font-bold text-red-600">자주 발주</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer p-2 rounded-lg border bg-white text-[11px]">
                      <input type="radio" name="bulkSub" checked={newItemSubCat === 'fruit_special'} onChange={() => setNewItemSubCat('fruit_special')} />
                      <span className="font-bold text-orange-600">특수 과일</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-indigo-900 mb-1">
                  2. 품목 목록 붙여넣기 (줄바꿈 구분, 예: <code className="bg-indigo-100 px-1 rounded">대파 단</code> 또는 <code className="bg-indigo-100 px-1 rounded">사과박스, 박스</code>)
                </label>
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder="대파 단&#10;무 개&#10;배추 포기&#10;양파망 망"
                  rows={5}
                  className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-xl bg-white font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all disabled:bg-gray-400 text-xs"
              >
                🚀 일괄 품목 등록하기
              </button>
            </form>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-800 mb-4 border-b pb-2">➕ 개별 품목 추가하기</h3>
            <form onSubmit={handleAddNewItem} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">품목 이름</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="예: 애호박"
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl bg-white shadow-xs focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">단위 (예: 박스, 봉, 팩, 단)</label>
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
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all disabled:bg-gray-400 text-xs"
              >
                ➕ 개별 품목 등록
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
                if (c === 'veg_packaged') { badgeText = '포장된'; badgeColor = 'bg-teal-100 text-teal-700'; }
                else if (c === 'veg_special') { badgeText = '특수야채'; badgeColor = 'bg-emerald-100 text-emerald-700'; }
                else if (c === 'veg_occasional') { badgeText = '가끔넣는'; badgeColor = 'bg-blue-100 text-blue-700'; }
                else if (c === 'fruit_special') { badgeText = '특수과일'; badgeColor = 'bg-orange-100 text-orange-600'; }
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
