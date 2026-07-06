const footerSections = [
  {
    title: "Product",
    links: [
      "Features",
      "Student Records",
      "Result Computation",
      "Attendance",
      "School Fees",
      "AI Lesson Notes",
      "Report Cards",
      "Examinations",
    ],
  },
  {
    title: "Resources",
    links: [
      "Help Centre",
      "User Guide",
      "Video Tutorials",
      "Templates",
      "WAEC Updates",
      "NECO Updates",
      "NERDC Curriculum",
      "FAQs",
    ],
  },
  {
    title: "Company",
    links: [
      "About Us",
      "Meet the Team",
      "Testimonials",
      "Careers",
      "Contact",
    ],
  },
  {
    title: "Blog",
    links: [
      "School Management",
      "Education Technology",
      "AI for Teachers",
      "Product Updates",
      "School Digitization",
      "Education News",
    ],
  },
  {
    title: "Legal",
    links: [
      "Privacy Policy",
      "Terms of Service",
      "Cookie Policy",
      "Data Protection Policy",
    ],
  },
]

const socialLinks = [
  { label: "Facebook", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "X", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "WhatsApp", href: "#" },
]

export function Footer() {
  return (
    <footer id="contact" className="bg-deep-navy pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top: Login / Get Started */}
        <div className="mb-12 flex flex-col items-center justify-between gap-4 border-b border-white/10 pb-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-burnt-orange">
              <span className="font-[Georgia,serif] text-lg font-bold text-white">C</span>
            </div>
            <span className="font-[Georgia,serif] text-xl font-bold text-white">
              Chyksys
            </span>
          </div>
          <div className="flex gap-4">
            <a
              href="#"
              className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Login
            </a>
            <a
              href="#"
              className="rounded-full bg-burnt-orange px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-burnt-orange/90"
            >
              Create Your School
            </a>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-sm font-semibold text-white uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/50 transition-colors hover:text-white/90"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social + Bottom */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex flex-wrap justify-center gap-4">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="text-sm text-white/40 transition-colors hover:text-white/80"
                >
                  {s.label}
                </a>
              ))}
            </div>
            <p className="text-sm text-white/30">
              © 2026 Chyksys, a product of ChykeTech. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}