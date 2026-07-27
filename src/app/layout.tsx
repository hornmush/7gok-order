import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '칠곡농협 농산팀 발주방',
  description: '현장 요청부터 업체 문자 발송까지 한번에',
  openGraph: {
    title: '칠곡농협 농산팀 발주방',
    description: '현장 요청부터 업체 문자 발송까지 한번에',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
