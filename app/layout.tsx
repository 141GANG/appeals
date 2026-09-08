import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Ещё шанс — вернись в чат', description: 'Подай апелляцию, расскажи свою сторону истории и получи шанс вернуться в чат.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru" className="dark"><body>{children}</body></html>;
}
