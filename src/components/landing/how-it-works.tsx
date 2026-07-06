import { Building2, UserPlus, Settings, Rocket } from "lucide-react"

const steps = [
  {
    icon: Building2,
    title: "Register your school",
    description: "Create your school account in under 5 minutes. No technical knowledge required.",
  },
  {
    icon: UserPlus,
    title: "Add staff and students",
    description: "Import or manually add your school community. We make onboarding simple.",
  },
  {
    icon: Settings,
    title: "Configure your school",
    description: "Set up your grading system, class structure, subjects, and school preferences.",
  },
  {
    icon: Rocket,
    title: "Start managing everything",
    description: "Begin using all features immediately. Results, fees, attendance  all in one place.",
  },
]

export function HowItWorks() {
  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            How It Works
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Getting started is easier than you think
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-burnt-orange/30 via-burnt-orange/10 to-transparent lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center lg:text-left">
                {/* Step number */}
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-burnt-orange text-white font-[Georgia,serif] text-xl font-bold shadow-lg shadow-burnt-orange/20 lg:mx-0">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-deep-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}