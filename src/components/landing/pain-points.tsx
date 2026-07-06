import {
  FileText,
  Table2,
  SearchX,
  Receipt,
  UserCog,
  MessageSquareOff,
  TrendingUp,
} from "lucide-react"

const painPoints = [
  {
    icon: FileText,
    title: "Paper files everywhere",
    description: "Important student records become difficult to organize, retrieve and protect.",
  },
  {
    icon: Table2,
    title: "Endless Excel sheets",
    description: "Result computation becomes stressful, repetitive and prone to errors.",
  },
  {
    icon: SearchX,
    title: "Missing records",
    description: "Report cards, payment records and student information get misplaced or damaged.",
  },
  {
    icon: Receipt,
    title: "Manual fee tracking",
    description: "Following up payments and reconciling accounts wastes valuable time.",
  },
  {
    icon: UserCog,
    title: "Administrative overload",
    description: "Teachers and administrators spend more time doing paperwork than supporting students.",
  },
  {
    icon: MessageSquareOff,
    title: "Communication gaps",
    description: "Parents struggle to stay informed while staff work across disconnected systems.",
  },
  {
    icon: TrendingUp,
    title: "Growing becomes difficult",
    description: "As student population increases, manual processes become harder to sustain.",
  },
]

export function PainPoints() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            What you can finally stop worrying about
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="group rounded-2xl border border-slate-gray/60 bg-slate-gray/30 p-6 transition-all hover:border-burnt-orange/20 hover:bg-white hover:shadow-lg hover:shadow-burnt-orange/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-burnt-orange/10 text-burnt-orange transition-colors group-hover:bg-burnt-orange group-hover:text-white">
                <point.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-deep-navy">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
                {point.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mid-page CTA banner */}
        <div className="mx-auto mt-16 max-w-3xl rounded-2xl bg-deep-navy p-8 text-center sm:p-10">
          <p className="text-sm font-semibold tracking-wide text-warm-gold uppercase">
            Still relying on paper records?
          </p>
          <p className="mt-2 text-lg font-medium text-white sm:text-xl">
            Join our free School Digitization Session and discover how leading schools
            are simplifying administration.
          </p>
          <a
            href="#"
            className="mt-6 inline-block rounded-full bg-burnt-orange px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-light-orange"
          >
            Schedule Your Free Session
          </a>
        </div>
      </div>
    </section>
  )
}