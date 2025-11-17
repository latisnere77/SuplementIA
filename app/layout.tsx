import "./globals.css";

export const metadata = {
  title: "SuplementIA - Evidence-Based Health Solutions",
  description: "Find what the science says about supplements and interventions for your health goals",
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
      </body>
    </html>
  );
}
