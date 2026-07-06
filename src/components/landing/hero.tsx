import { Button } from "@/components/ui/button"
import {
  FileCheck2,
  Wallet,
  UserCheck,
  Sparkles,
  Monitor,
  Laptop,
  Smartphone,
} from "lucide-react"

const floatingCards = [
  { icon: FileCheck2, label: "Result Ready", color: "bg-emerald-50 text-emerald-600 border-emerald-200", pos: "-top-4 -left-4 sm:-left-8 sm:-top-6 lg:-left-12" },
  { icon: Wallet, label: "Fees Paid", color: "bg-blue-50 text-blue-600 border-blue-200", pos: "-right-2 top-1/4 sm:-right-6" },
  { icon: UserCheck, label: "Attendance", color: "bg-amber-50 text-amber-600 border-amber-200", pos: "-bottom-4 -right-2 sm:-bottom-6 sm:-right-6" },
  { icon: Sparkles, label: "AI Lesson Notes", color: "bg-purple-50 text-purple-600 border-purple-200", pos: "-bottom-4 -left-2 sm:-bottom-6 sm:-left-6" },
]

const WHATSAPP_LINK = "https://wa.me/2348108381294?text=Hi%20Chyksys%2C%20I%27d%20like%20to%20schedule%20a%20free%20school%20digitization%20session."

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-off-white pt-28 pb-24 md:pt-36 md:pb-32">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-burnt-orange/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-warm-gold/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Copy */}
          <div className="max-w-2xl">
            <h1 className="font-[Georgia,serif] text-4xl font-bold leading-tight tracking-tight text-deep-navy sm:text-5xl lg:text-6xl">
              Everything your school needs.{" "}
              <span className="text-burnt-orange">One simple platform.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-deep-navy/70">
              Stop managing your school with paper records, scattered files, and endless
              Excel sheets. Chyksys helps you manage student records, automate result
              computation, track school fees, monitor attendance, prepare lesson notes
              with AI, and streamline your school&apos;s daily operations  all from one
              secure, easy-to-use platform.
            </p>
            <p className="mt-4 text-base leading-relaxed text-deep-navy/60">
              Whether you&apos;re a proprietor, administrator, bursar, or teacher, we help
              you spend less time on paperwork and more time delivering a better learning
              experience.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="rounded-full bg-burnt-orange px-8 text-base font-semibold text-white hover:bg-burnt-orange/90"
                >
                  Schedule a Free School Digitization Session
                </Button>
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-deep-navy/20 px-8 text-base font-semibold text-deep-navy hover:bg-deep-navy/5"
                >
                  Talk to an Expert
                </Button>
              </a>
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* Main dashboard card */}
            <div className="rounded-2xl border border-slate-gray/80 bg-white p-4 shadow-2xl shadow-deep-navy/5">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="ml-4 h-4 w-40 rounded-full bg-slate-gray" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-burnt-orange/5 p-4">
                  <p className="text-xs text-deep-navy/50">Students</p>
                  <p className="mt-1 text-2xl font-bold text-deep-navy font-[Georgia,serif]">1,247</p>
                  <p className="mt-1 text-xs text-emerald-600">+12 this week</p>
                </div>
                <div className="rounded-xl bg-warm-gold/10 p-4">
                  <p className="text-xs text-deep-navy/50">Fees Collected</p>
                  <p className="mt-1 text-2xl font-bold text-deep-navy font-[Georgia,serif]">₦2.4M</p>
                  <p className="mt-1 text-xs text-emerald-600">89% paid</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-xs text-deep-navy/50">Attendance</p>
                  <p className="mt-1 text-2xl font-bold text-deep-navy font-[Georgia,serif]">96%</p>
                  <p className="mt-1 text-xs text-emerald-600">Today</p>
                </div>
              </div>
              <div className="mt-3 h-32 rounded-xl bg-gradient-to-br from-slate-gray/50 to-slate-gray/30" />
            </div>

            {/* Floating cards */}
            {floatingCards.map((card) => (
              <div
                key={card.label}
                className={`absolute rounded-xl border px-3 py-2 shadow-lg ${card.color} ${card.pos}`}
              >
                <div className="flex items-center gap-2">
                  <card.icon className="h-4 w-4" />
                  <span className="text-xs font-semibold">{card.label}</span>
                </div>
              </div>
            ))}

            {/* Device icons */}
            <div className="absolute -bottom-8 right-1/2 flex -translate-x-1/2 gap-6 text-deep-navy/20 sm:bottom-[-40px]">
              <Monitor className="h-6 w-6" />
              <Laptop className="h-6 w-6" />
              <Smartphone className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}