import { Button } from "@/components/ui/button"
import { Monitor, Smartphone, Laptop } from "lucide-react"

export function Solution() {
  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: Illustration */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-2xl bg-gradient-to-br from-deep-navy to-deep-navy/90 p-8 shadow-2xl shadow-deep-navy/10">
              {/* Simulated dashboard */}
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                    <span className="text-sm text-white/70">Total Students</span>
                    <span className="text-lg font-bold text-white font-[Georgia,serif]">1,247</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                    <span className="text-sm text-white/70">Fees Outstanding</span>
                    <span className="text-lg font-bold text-warm-gold font-[Georgia,serif]">₦340K</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                    <span className="text-sm text-white/70">Attendance Rate</span>
                    <span className="text-lg font-bold text-emerald-400 font-[Georgia,serif]">96%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                    <span className="text-sm text-white/70">Results Published</span>
                    <span className="text-lg font-bold text-light-orange font-[Georgia,serif]">42/45</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Device icons */}
            <div className="absolute -bottom-6 -right-4 flex gap-3">
              {[Monitor, Laptop, Smartphone].map((Icon, i) => (
                <div key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
                  <Icon className="h-5 w-5 text-burnt-orange" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Copy */}
          <div>
            <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
              The Solution
            </p>
            <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
              One platform. Every school process connected.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-deep-navy/65">
              Imagine managing student records, examinations, school fees, attendance,
              report cards and lesson notes from one secure dashboard. That&apos;s Chyksys.
            </p>
            <div className="mt-8">
              <Button
                variant="outline"
                className="rounded-full border-deep-navy/20 px-8 text-base font-semibold text-deep-navy hover:bg-deep-navy/5"
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}