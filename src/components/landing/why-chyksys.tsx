import {
  Smartphone,
  Award,
  GraduationCap,
  ShieldCheck,
  DollarSign,
  HeadphonesIcon,
  RefreshCw,
} from "lucide-react"

const reasons = [
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Access your school data from any device  phone, tablet, or desktop. Your dashboard goes where you go.",
  },
  {
    icon: Award,
    title: "Built from years of school experience",
    description: "Chyksys was born from working directly with Nigerian schools. Every feature solves a real problem educators face daily.",
  },
  {
    icon: GraduationCap,
    title: "Simple to use",
    description: "No complicated training needed. If you can use WhatsApp, you can use Chyksys. Clean interfaces designed for non-technical users.",
  },
  {
    icon: DollarSign,
    title: "Affordable",
    description: "Enterprise-level capabilities at a fraction of the cost. Pricing designed for schools of every size.",
  },
  {
    icon: ShieldCheck,
    title: "Secure",
    description: "Your school data is encrypted, backed up, and accessible only to authorized staff. We take security seriously.",
  },
  {
    icon: RefreshCw,
    title: "Continuous improvement",
    description: "Regular updates based on real school feedback. We evolve with the needs of Nigerian education.",
  },
  {
    icon: HeadphonesIcon,
    title: "Reliable support",
    description: "Dedicated support team that understands school operations. We don't just fix bugs — we help you succeed.",
  },
]

export function WhyChyksys() {
  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            Why CHYKSYS
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Why schools choose Chyksys
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, i) => (
            <div
              key={reason.title}
              className={`rounded-2xl border p-6 transition-all hover:shadow-lg hover:shadow-burnt-orange/5 ${
                i % 2 === 0
                  ? "border-slate-gray/60 bg-white hover:border-burnt-orange/20"
                  : "border-slate-gray/60 bg-slate-gray/30 hover:bg-white hover:border-burnt-orange/20"
              }`}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-burnt-orange/10 text-burnt-orange">
                <reason.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-deep-navy">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}