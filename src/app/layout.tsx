import type { Metadata } from "next";
import "./globals.css";
import ReduxProvider from "@/components/providers/ReduxProvider";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/core/styles.css';

export const metadata: Metadata = {
  title: "La Margarita - Reservas",
  description: "Sistema de reservas para La Margarita",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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
          <ReduxProvider>
            {children}
          </ReduxProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
