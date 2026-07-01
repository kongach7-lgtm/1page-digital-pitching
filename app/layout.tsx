import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "1-Page Digital Pitching",
  description: "ส่งไอเดียธุรกิจและโหวตให้เพื่อนแบบ real-time",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${kanit.variable} font-sans bg-brand-bg text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
