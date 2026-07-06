import {
  FileText,
  BookOpen,
  ClipboardList,
  DollarSign,
  Users,
  ExternalLink,
  HelpCircle,
  Video,
  ArrowRight,
} from "lucide-react"

const resources = [
  { icon: FileText, label: "School Digitization Guide", tag: "Guide" },
  { icon: BookOpen, label: "Lesson Note Template", tag: "Template" },
  { icon: ClipboardList, label: "Continuous Assessment Template", tag: "Template" },
  { icon: DollarSign, label: "School Budget Template", tag: "Template" },
  { icon: Users, label: "Admission Register Template", tag: "Template" },
  { icon: ExternalLink, label: "WAEC Updates", tag: "External" },
  { icon: ExternalLink, label: "NECO Updates", tag: "External" },
  { icon: ExternalLink, label: "NERDC Curriculum", tag: "External" },
  { icon: HelpCircle, label: "Product Documentation", tag: "Support" },
  { icon: HelpCircle, label: "Help Centre", tag: "Support" },
  { icon: Video, label: "Video Tutorials", tag: "Tutorial" },
]

export function Resources() {
  return (
    <section id="resources" className="bg-off-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            Resources
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Helpful resources for your school
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {resources.map((r) => (
            <a
              key={r.label}
              href="#"
              className="group flex items-center gap-4 rounded-xl border border-slate-gray/60 bg-white p-4 transition-all hover:border-burnt-orange/20 hover:shadow-md hover:shadow-burnt-orange/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-burnt-orange/10 text-burnt-orange transition-colors group-hover:bg-burnt-orange group-hover:text-white">
                <r.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-deep-navy">{r.label}</p>
                <p className="text-xs text-deep-navy/40">{r.tag}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-deep-navy/20 transition-colors group-hover:text-burnt-orange" />
            </a>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 text-base font-semibold text-burnt-orange hover:text-light-orange"
          >
            Browse All Resources <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}