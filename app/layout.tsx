import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "SuplementIA - Evidence-Based Health Solutions",
  description: "Find what the science says about supplements and interventions for your health goals",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
