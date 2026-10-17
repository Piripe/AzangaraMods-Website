import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { UserContextProvider } from "../context/UserContext";
import NavigationTracker from "@/components/navigationTracker";
import Footer from "@/components/footer";

const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Azangara Mods",
  description: "The first website for sharing custom levels for Azangara.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={interSans.className}>
      <body>
        <UserContextProvider>{children}</UserContextProvider>
        <Footer/>
        <Suspense fallback={null}><NavigationTracker/></Suspense>
        <div id="portal"/>
      </body>
    </html>
  );
}
