import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Sora({ variable: "--font-display-face", subsets: ["latin"] });
const body = DM_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Freelane — clients, projects & invoices for freelancers",
  description: "A private, offline-first mini CRM for freelancers: clients, kanban projects, time tracking, printable invoices and an on-device assistant.",
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbf8f4" }, { media: "(prefers-color-scheme: dark)", color: "#17130f" }] };

const themeScript = `try{var s=JSON.parse(localStorage.getItem('freelane-ui')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');if(s.accent!=null)document.documentElement.style.setProperty('--accent-h',s.accent)}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
