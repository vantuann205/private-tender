import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "PrivateTender | Procurement workspace", description: "A privacy-first procurement prototype." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
