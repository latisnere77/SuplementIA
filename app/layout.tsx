/**
 * Root Layout
 * Minimal layout required by Next.js App Router
 * Actual locale-specific layout is in app/[locale]/layout.tsx
 */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
