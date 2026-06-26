"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
