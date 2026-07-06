import { Button } from "@/components/ui/button"
import {
  Users,
  Calculator,
  FileBarChart,
  Wallet,
  UserCheck,
  Sparkles,
  ClipboardList,
  Layers,
  Settings,
  ArrowRight,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Student Records",
    description: "Digitize student information and retrieve records instantly.",
  },
  {
    icon: Calculator,
    title: "Result Computation",
    description: "Automatically calculate scores, grades and positions.",
  },
  {
    icon: FileBarChart,
    title: "Report Cards",
    description: "Generate professional report cards in minutes.",
  },
  {
    icon: Wallet,
    title: "School Fees",
    description: "Track payments and outstanding balances effortlessly.",
  },
  {
    icon: UserCheck,
    title: "Attendance",
    description: "Monitor daily attendance for students and staff.",
  },
  {
    icon: Sparkles,
    title: "AI Lesson Notes",
    description: "Generate editable lesson notes aligned with your curriculum.",
  },
  {
    icon: ClipboardList,
    title: "Examinations",
    description: "Create assessments and manage academic records.",
  },
  {
    icon: Layers,
    title: "Class & Subject Management",
    description: "Organize classes, teachers, sessions and subjects with ease.",
  },
  {
    icon: Settings,
    title: "School Settings",
    description: "Customize grading systems, remarks, signatures and school information.",
  },
]

export function Features() {
  return (
    <section id="features" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            Features
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Everything you need to run your school
          </h2>
          <p className="mt-4 text-lg text-deep-navy/60">
            One platform. Every essential tool.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-gray/60 bg-slate-gray/30 p-6 transition-all hover:border-burnt-orange/20 hover:bg-white hover:shadow-lg hover:shadow-burnt-orange/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-burnt-orange/10 text-burnt-orange transition-colors group-hover:bg-burnt-orange group-hover:text-white">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-deep-navy">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
                {feature.description}
              </p>
              <button className="mt-4 flex items-center gap-1 text-sm font-medium text-burnt-orange opacity-0 transition-opacity group-hover:opacity-100">
                Learn More <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Post-features CTA */}
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <h3 className="font-[Georgia,serif] text-2xl font-bold text-deep-navy sm:text-3xl">
            Ready to modernize your school?
          </h3>
          <p className="mt-3 text-deep-navy/60">
            We&apos;ll walk you through the process and answer your questions.
          </p>
          <Button
            className="mt-6 rounded-full bg-burnt-orange px-8 text-base font-semibold text-white hover:bg-burnt-orange/90"
          >
            Schedule a Free School Digitization Session
          </Button>
        </div>
      </div>
    </section>
  )
}