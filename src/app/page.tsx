import Link from 'next/link'

export default function Home() {
  return (
    <main className="bg-slate-50 min-h-screen flex flex-col justify-between p-6">
      <div className="max-w-md mx-auto w-full my-auto">
        <div className="text-center mb-10">
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full">칠곡농협 농산팀</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">스마트 발주 및 재고 관리</h1>
          <p className="text-sm text-slate-500 mt-1">현장 요청부터 협력업체 문자 발송까지 한번에</p>
        </div>

        <div className="space-y-4">
          <Link href="/request?cat=veg" className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl text-center shadow-lg transition">
            🥬 채소 발주 요청하기
          </Link>
          <Link href="/request?cat=fruit" className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-4 px-6 rounded-xl text-center shadow-lg transition">
            🍎 과일 발주 요청하기
          </Link>
          
          <div className="border-t border-slate-200 my-6"></div>

          <div className="grid grid-cols-3 gap-2">
            <Link href="/admin" className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium py-3 rounded-lg text-center shadow">
              ⚙️ 관리자 센터
            </Link>
            <Link href="/board" className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium py-3 rounded-lg text-center shadow-sm">
              📋 일일 게시판
            </Link>
            <Link href="/stats" className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium py-3 rounded-lg text-center shadow-sm">
              📊 주간 통계
            </Link>
          </div>
        </div>
      </div>
      
      <footer className="text-center py-4 text-xs text-slate-400">
        Chilgok Nonghyup Agricultural Products Team System
      </footer>
    </main>
  )
}
