import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/next"
import { PWAInstaller } from "@/components/pwa-installer"

// Plus Jakarta Sans — Premium corporate sans-serif
// Clean, modern, elegant — perfect for Black & Gold enterprise UI
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "Vertex - Professional Inventory Management System",
  description: "Enterprise-grade inventory management with real-time analytics, Google Sheets integration, and offline-first architecture",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["inventory", "management", "stock", "analytics", "POS", "enterprise"],
  authors: [{ name: "Vertex Team" }],
  creator: "Vertex",
  publisher: "Vertex",
  icons: {
    icon: [
      { url: "/Vertex-icon-3.png", sizes: "32x32", type: "image/png" },
      { url: "/Vertex-icon-3.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/Vertex-icon-3.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/Vertex-icon-3.png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vertex",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Vertex - Professional Inventory Management",
    description: "Enterprise-grade inventory management system",
    siteName: "Vertex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vertex - Professional Inventory Management",
    description: "Enterprise-grade inventory management system",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Vertex",
    "msapplication-TileColor": "#3b82f6",
    "msapplication-config": "/browserconfig.xml",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        {/* Favicon - Using Vertex Icon */}
        <link rel="icon" href="/Vertex-icon-3.png" sizes="any" />
        <link rel="icon" href="/Vertex-icon-3.png" type="image/png" />
        <link rel="apple-touch-icon" href="/Vertex-icon-3.png" />
      </head>
      <body className={`min-h-screen w-full overflow-x-hidden antialiased ${plusJakartaSans.variable} ${GeistMono.variable} font-sans`} suppressHydrationWarning>
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {/* PWA Service Worker Registration */}
              <PWAInstaller />
              
              {/* Skip to main content for accessibility */}
              <a href="#main-content" className="skip-to-main sr-only focus:not-sr-only">
                Skip to main content
              </a>
              
              {/* Screen reader announcement region */}
              <div 
                role="status" 
                aria-live="polite" 
                aria-atomic="true" 
                className="sr-only"
                id="screen-reader-announcements"
              />
              
              {children}
              
              <Toaster richColors position="top-right" />
              <Analytics />
              
              {/* PWA Installation Script */}
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                    let deferredPrompt;

                    window.addEventListener('beforeinstallprompt', (e) => {
                      e.preventDefault();
                      deferredPrompt = e;
                      console.log('PWA install prompt available');
                    });

                    window.addEventListener('appinstalled', (evt) => {
                      console.log('PWA was installed');
                    });

                    window.installPWA = () => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((choiceResult) => {
                          if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                          } else {
                            console.log('User dismissed the install prompt');
                          }
                          deferredPrompt = null;
                        });
                      }
                    };

                    if ('serviceWorker' in navigator) {
                      window.addEventListener('load', function() {
                        navigator.serviceWorker.register('/service-worker.js')
                          .then(function(registration) {
                            console.log('SW registered: ', registration);
                            
                            // Check for updates every time the page loads
                            registration.update();
                            
                            // Listen for new service worker - SILENT, no reload
                            registration.addEventListener('updatefound', () => {
                              const newWorker = registration.installing;
                              if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New service worker available - activate silently
                                    console.log('New service worker available, will activate on next navigation');
                                    // Don't reload - let it activate naturally
                                  }
                                });
                              }
                            });
                          })
                          .catch(function(registrationError) {
                            console.log('SW registration failed: ', registrationError);
                          });
                      });
                    }
                  `,
                }}
              />
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
