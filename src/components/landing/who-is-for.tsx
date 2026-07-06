import { Eye, FolderOpen, GraduationCap, Wallet, Users } from "lucide-react"

const roles = [
  {
    icon: Eye,
    title: "Proprietors / Principals",
    description: "See your school's performance from one dashboard. Monitor finances, academics and operations without chasing reports.",
    color: "bg-burnt-orange/10 text-burnt-orange",
  },
  {
    icon: FolderOpen,
    title: "Administrators",
    description: "Manage admissions, student records, examinations and school data effortlessly.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: GraduationCap,
    title: "Teachers",
    description: "Prepare lesson notes with AI, record attendance, enter scores and spend more time teaching.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Wallet,
    title: "Bursars",
    description: "Track school fees, payments, balances and financial records accurately.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Users,
    title: "Parents",
    description: "Receive academic updates, monitor performance and stay connected with your child's school.",
    color: "bg-purple-50 text-purple-600",
    tag: "Coming Soon",
  },
]

export function WhoIsFor() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            Who CHYKSYS Is For
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Built for every role in your school
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.title}
              className="relative rounded-2xl border border-slate-gray/60 bg-slate-gray/30 p-6 transition-all hover:border-burnt-orange/20 hover:bg-white hover:shadow-lg hover:shadow-burnt-orange/5"
            >
              {role.tag && (
                <span className="absolute right-4 top-4 rounded-full bg-warm-gold/20 px-3 py-1 text-xs font-semibold text-warm-gold">
                  {role.tag}
                </span>
              )}
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${role.color}`}>
                <role.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-deep-navy">{role.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}