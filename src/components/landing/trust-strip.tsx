"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

const logos = [
  "Reality High School",
  "TOGEM VICTORY SCHOOL",
  "Awesome Grace High School",
  "Crystal-Path High School",
]

export function TrustStrip() {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Duplicate for infinite scroll
  const allLogos = [...logos, ...logos]

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden border-y border-slate-gray/40 bg-gradient-to-r from-white via-off-white/50 to-white py-10 sm:py-14"
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent sm:w-32" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center text-xs font-semibold tracking-[0.2em] text-deep-navy/30 uppercase sm:text-sm"
        >
          Trusted by forward-thinking schools across Nigeria
        </motion.p>
      </div>

      {/* Scrolling strip */}
      <div className="relative">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
          className="flex gap-12 sm:gap-16 md:gap-20"
        >
          {allLogos.map((name, i) => (
            <motion.div
              key={`${name}-${i}`}
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="flex h-10 shrink-0 items-center"
            >
              <div className="flex items-center gap-2.5 px-2 sm:px-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-burnt-orange/10 sm:h-8 sm:w-8">
                  <span className="text-[10px] font-bold text-burnt-orange sm:text-xs">
                    {name.charAt(0)}
                  </span>
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-deep-navy/20 font-[Georgia,serif] sm:text-sm">
                  {name}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Subtle bottom border glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-burnt-orange/20 to-transparent" />
    </section>
  )
}