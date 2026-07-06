"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Features", href: "#features" },
  { label: "Resources", href: "#resources" },
  { label: "Blog", href: "#blog" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-burnt-orange">
            <span className="font-[Georgia,serif] text-lg font-bold text-white">C</span>
          </div>
          <span className="font-[Georgia,serif] text-xl font-bold text-deep-navy">
            Chyksys
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-deep-navy/70 transition-colors hover:text-burnt-orange"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <a href="/app?action=dev-login">
            <Button className="rounded-full bg-burnt-orange px-6 text-sm font-semibold text-white hover:bg-burnt-orange/90">
              Access The Portal
            </Button>
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-deep-navy"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-slate-gray/50 bg-white px-4 pb-6 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-deep-navy/80 transition-colors hover:bg-slate-gray hover:text-burnt-orange"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 px-4">
              <a href="/app?action=dev-login">
                <Button className="w-full rounded-full bg-burnt-orange text-sm font-semibold text-white hover:bg-burnt-orange/90">
                  Access The Portal
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}