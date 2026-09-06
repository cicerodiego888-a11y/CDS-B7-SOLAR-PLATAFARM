import './globals.css';
import { AppFrame } from '../components/auth/AppFrame';
import { AuthProvider } from '../components/auth/AuthProvider';

export const metadata = {
  title: 'B7 Solar Platform',
  description: 'Monitoramento profissional de usinas fotovoltaicas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
