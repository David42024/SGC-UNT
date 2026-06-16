import './globals.css';
import { AuthProvider } from '../lib/auth';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'SGC-UNT — Sistema de Gestión de la Calidad',
  description: 'Universidad Nacional de Trujillo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-gray-50 text-gray-900">
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
