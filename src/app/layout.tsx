import type { Metadata, Viewport } from "next";
import { Great_Vibes, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Texto: Manrope (moderna y limpia). Títulos: Space Grotesk (con carácter).
const bodyFont = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

// Caligrafía elegante (alternativa a Joseph Sophia) cargada de forma confiable.
const scriptFont = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-script",
});
import { MantineProvider, ColorSchemeScript, createTheme, type MantineColorsTuple } from '@mantine/core';
import '@mantine/core/styles.css';
import SWRegister from '@/components/SWRegister';

const brand: MantineColorsTuple = [
  '#e6f7f3',
  '#cdeee7',
  '#9fddd0',
  '#6fcbb7',
  '#46bca2',
  '#2db093',
  '#1f9d83',
  '#16836d',
  '#0f6a58',
  '#094f42',
];

const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  defaultRadius: 'lg',
  // Escala de radios más generosa → look redondeado y suave en toda la app.
  radius: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '22px',
    xl: '30px',
  },
  fontFamily:
    'var(--font-body), -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'var(--font-heading), var(--font-body), sans-serif',
    fontWeight: '700',
  },
  white: '#ffffff',
  colors: {
    brand,
  },
  components: {
    Paper: {
      defaultProps: { radius: 'lg' },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
        transitionProps: { transition: 'pop', duration: 220 },
        withCloseButton: true,
        closeOnClickOutside: true,
        closeOnEscape: true,
        zIndex: 2000,
        overlayProps: { backgroundOpacity: 0.55, blur: 3 },
      },
    },
    Button: {
      defaultProps: { radius: 'md' },
      styles: {
        root: {
          transition: 'transform 0.15s ease, background 0.15s ease',
        },
      },
    },
    TextInput: {
      defaultProps: { radius: 'md' },
    },
    PasswordInput: {
      defaultProps: { radius: 'md' },
    },
    Select: {
      defaultProps: { radius: 'md' },
    },
    Textarea: {
      defaultProps: { radius: 'md' },
    },
    NumberInput: {
      defaultProps: { radius: 'md' },
    },
    Alert: {
      defaultProps: { radius: 'lg' },
    },
    Badge: {
      defaultProps: { radius: 'sm' },
    },
  },
});

export const metadata: Metadata = {
  title: "La Margarita - Reservas",
  description: "Sistema de reservas para La Margarita",
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#1f9d83',
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
        <meta name="theme-color" content="#1f9d83" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        suppressHydrationWarning={true}
        className={`${bodyFont.variable} ${headingFont.variable} ${scriptFont.variable}`}
      >
        <MantineProvider theme={theme} defaultColorScheme="light">
          <SWRegister />
          {children}
          <div id="root-portal" />
        </MantineProvider>
      </body>
    </html>
  );
}
