import './globals.css';

export const metadata = {
  title: 'B7 Solar — Monitoramento',
  description: 'Sistema de Monitoramento B7 Solar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}