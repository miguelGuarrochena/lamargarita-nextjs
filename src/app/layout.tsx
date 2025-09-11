import type { Metadata } from "next";
import "./globals.css";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';
import SWRegister from '@/components/SWRegister'; 

export const metadata: Metadata = {
  title: "La Margarita - Reservas",
  description: "Sistema de reservas para La Margarita",
  manifest: '/manifest.json', 
  themeColor: '#0ea5e9', 
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning={true}>
      <head>
        <ColorSchemeScript />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body suppressHydrationWarning={true}>
        <MantineProvider
          theme={{
            fontFamily: 'Quicksand, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
            primaryColor: 'blue',
            colors: {
              'brand': [
                '#f0f9ff',
                '#e0f2fe',
                '#bae6fd',
                '#7dd3fc',
                '#38bdf8',
                '#0ea5e9',
                '#0284c7',
                '#0369a1',
                '#075985',
                '#0c4a6e'
              ]
            }
          }}
          defaultColorScheme="light"
        >
          <SWRegister /> 
          {children}
          <div id="root-portal" />
        </MantineProvider>
      </body>
    </html>
  );
}
