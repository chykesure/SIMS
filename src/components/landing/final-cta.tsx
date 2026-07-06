import { Button } from "@/components/ui/button"

export function FinalCTA() {
  return (
    <section className="bg-deep-navy py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-[Georgia,serif] text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Ready to future-proof your school?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
          Every school reaches a point where paper records, manual calculations and
          scattered files begin to slow growth. The sooner you digitize your operations,
          the easier it becomes to manage your school with confidence.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="rounded-full bg-burnt-orange px-8 text-base font-semibold text-white hover:bg-burnt-orange/90"
          >
            Schedule a Free School Digitization Session
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full border-white/20 px-8 text-base font-semibold text-white hover:bg-white/10"
          >
            Talk to an Expert
          </Button>
        </div>
      </div>
    </section>
  )
}