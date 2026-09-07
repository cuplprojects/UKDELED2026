import React from "react";
import Header from "./Header";
import Navbar from "./Navbar";
import Footer from "./Footer";

/**
 * Common layout wrapper component that integrates Header, Navbar, and Footer.
 * It also automatically handles print hiding for the layout parts.
 */
export default function Layout({ children, className = "min-h-screen flex flex-col bg-amber-50/20 font-sans w-full" }) {
  return (
    <div className={className}>
      <div className="w-full print:hidden">
        <Header />
        <Navbar />
      </div>
      <div className="flex-1 flex flex-col w-full">
        {children}
      </div>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
