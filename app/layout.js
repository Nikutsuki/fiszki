import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Fiszki - CSV Study App",
  description:
    "A simple study application that lets you import questions from CSV files and practice with multiple choice quizzes.",
  keywords:
    "study, quiz, flashcards, learning, education, multiple choice, csv",
  author: "Fiszki Study App",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Add other viewport settings here if needed, e.g., maximumScale, userScalable
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Apply theme immediately before any content renders to prevent FOUC
                  const root = document.documentElement;
                  const theme = localStorage.getItem('theme');

                  // Temporarily disable transitions during initial load
                  root.classList.add('no-transitions');

                  // Remove any existing theme classes first
                  root.classList.remove('dark');

                  // Apply dark theme if needed
                  if (theme === 'dark' ||
                      (theme !== 'light' && !theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    root.classList.add('dark');
                  }

                  // Re-enable transitions after a brief delay
                  setTimeout(() => {
                    root.classList.remove('no-transitions');
                  }, 100);

                  // Add a class to indicate script has run
                  root.classList.add('theme-script-loaded');
                } catch (e) {
                  // Fallback: assume light mode
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.remove('no-transitions');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
