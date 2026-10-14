import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'よりそいラボ｜親子の自己理解と対話', description: '自分を知る。気持ちをつなぐ。親子の自己理解と対話を支える研究プラットフォームの体験版。', robots: { index: false, follow: false }, manifest: '/manifest.webmanifest' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#244f47' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body>{children}</body></html>; }
