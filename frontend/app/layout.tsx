import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResolveAI | Tier-2 Agent & Lead Console",
  description: "Autonomous customer resolution copilot and Tier-2 support lead investigation dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
