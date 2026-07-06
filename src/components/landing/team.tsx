"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"

const team = [
  {
    name: "Chike Pascal",
    role: "Founder & Lead Software Engineer",
    image: "/images/pascal.jpeg",
    bio: [
      "Computer Science graduate of the University of Ibadan and founder of ChykSystems, a subsidiary of ChykeTech.",
      "Having worked with numerous schools to build custom software and digital solutions, Chike gained firsthand knowledge of how schools operate and the challenges they face. He realized that while many schools needed modern management software, most could not afford the cost of developing one from scratch.",
      "To bridge this gap, he created Chyksys an all-in-one school management platform that gives schools enterprise-level capabilities at a fraction of the cost.",
      "Driven by a passion for solving real problems through technology, Chike continues to improve Chyksys based on feedback from schools and the evolving needs of education.",
    ],
    accent: "from-burnt-orange/80 to-burnt-orange",
    socials: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/chike-pascal-a6bba3300?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" },
      { label: "Twitter", href: "https://x.com/pascal_devs?s=11" },
    ],
  },
  {
    name: "Grace Okediran",
    role: "Growth Strategist & Education Solutions Lead",
    image: "/images/grace.jpeg",
    bio: [
      "Communication and Language Arts graduate of the University of Ibadan, educator and business strategist.",
      "Born into a family of educators with a father who runs two schools and a mother trained in education  Grace understands school administration from both personal and professional perspectives.",
      "As a public school teacher, she experienced the limitations of paper records and Excel spreadsheets firsthand. Those experiences shaped her passion for helping schools embrace practical technology that simplifies administration rather than complicating it.",
      "Today, she leads Chyksys' growth strategy, helping schools adopt digital systems through training, implementation support and strategic guidance.",
    ],
    accent: "from-warm-gold/80 to-warm-gold",
    socials: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/grace-okediran-659518193?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
      { label: "Instagram", href: "#" },
    ],
  },
]

function TeamCard({
  member,
  index,
}: {
  member: (typeof team)[0]
  index: number
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative overflow-hidden rounded-3xl border border-slate-gray/50 bg-white transition-all duration-500 hover:shadow-2xl hover:shadow-deep-navy/8"
    >
      {/* Image Section */}
      <div className="relative h-72 overflow-hidden bg-gradient-to-br from-slate-gray/60 to-slate-gray/40 sm:h-80">
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-white to-transparent" />

        {/* Decorative accent line */}
        <motion.div
          animate={{ scaleX: hovered ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="absolute inset-x-0 bottom-0 z-20 h-1 origin-left bg-gradient-to-r from-burnt-orange via-warm-gold to-burnt-orange"
        />

        {/* Profile image */}
        <div className="absolute inset-0 flex items-center justify-center p-8 pt-10">
          <motion.div
            animate={{ scale: hovered ? 1.03 : 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative"
          >
            {/* Glow behind image */}
            <div className="absolute -inset-3 rounded-full bg-burnt-orange/10 blur-2xl transition-opacity duration-500 group-hover:opacity-75" />

            <div className="relative h-48 w-48 overflow-hidden rounded-full border-4 border-white shadow-xl sm:h-56 sm:w-56">
              <Image
                src={member.image}
                alt={member.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes="(max-width: 640px) 192px, 224px"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative px-6 pb-8 pt-2 sm:px-10 sm:pb-10">
        {/* Name & Role */}
        <div className="text-center">
          <motion.h3
            animate={{ y: hovered ? -2 : 0 }}
            transition={{ duration: 0.3 }}
            className="font-[Georgia,serif] text-2xl font-bold text-deep-navy sm:text-[1.65rem]"
          >
            {member.name}
          </motion.h3>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${member.accent}`} />
            <p className="text-sm font-semibold tracking-wide text-burnt-orange">
              {member.role}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-auto my-5 h-px w-16 bg-gradient-to-r from-transparent via-slate-gray to-transparent" />

        {/* Bio */}
        <div className="space-y-3 text-center text-[0.82rem] leading-relaxed text-deep-navy/60 sm:text-sm">
          {member.bio.map((para, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 + i * 0.08 }}
            >
              {para}
            </motion.p>
          ))}
        </div>

        {/* Social Links */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {member.socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-gray/60 text-deep-navy/30 transition-all duration-300 hover:border-burnt-orange/30 hover:bg-burnt-orange/5 hover:text-burnt-orange"
              aria-label={social.label}
            >
              {social.label === "LinkedIn" ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              )}
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function Team() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-to-b from-white to-off-white/60 py-20 md:py-28"
    >
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute -top-40 right-0 h-[400px] w-[400px] rounded-full bg-burnt-orange/[0.02] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-warm-gold/[0.03] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <p className="text-sm font-semibold tracking-[0.15em] text-burnt-orange uppercase">
            About Us
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Built by educators.{" "}
            <span className="text-burnt-orange">Powered by technology.</span>
          </h2>
          <p className="mt-4 text-base text-deep-navy/50">
            The people behind Chyksys combining real classroom experience with
            world-class engineering to transform how Nigerian schools operate.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {team.map((member, i) => (
            <TeamCard key={member.name} member={member} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}