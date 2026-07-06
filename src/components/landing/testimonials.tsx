"use client"

import { useState } from "react"
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react"
import { Button } from "@/components/ui/button"

const testimonials = [
  {
    name: "Mrs. Adeyemi",
    position: "Proprietress, Graceville Schools",
    rating: 5,
    review: "Chyksys completely transformed how we run our school. We went from spending days on result computation to publishing results in hours. The fee tracking alone has saved us countless hours and reduced disputes with parents.",
  },
  {
    name: "Mr. Okonkwo",
    position: "Principal, Summit Schools",
    rating: 5,
    review: "I was skeptical about switching from our old system, but Chyksys made the transition seamless. The AI lesson notes feature is a game-changer for our teachers. They now spend more time teaching and less time on paperwork.",
  },
  {
    name: "Alhaji Ibrahim",
    position: "Administrator, Excel International",
    rating: 5,
    review: "What impressed me most is how simple it is. Our bursar, who is not tech-savvy at all, was able to track fees from her first day. That accessibility is what sets Chyksys apart from everything else we tried.",
  },
  {
    name: "Mrs. Chukwu",
    position: "Head Teacher, Bright Future College",
    rating: 5,
    review: "The report card generation is beautiful and professional. Parents have complimented us on the quality. But beyond aesthetics, the ability to see every student's academic history at a glance has improved our decision-making tremendously.",
  },
]

export function Testimonials() {
  const [current, setCurrent] = useState(0)

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1))

  const t = testimonials[current]

  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            Testimonials
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Don&apos;t just take our word for it
          </h2>
          <p className="mt-4 text-deep-navy/60">
            See how other schools are transforming their operations with Chyksys.
          </p>
        </div>

        {/* Carousel */}
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-slate-gray/60 bg-white p-8 shadow-sm sm:p-12">
            <Quote className="mb-6 h-10 w-10 text-burnt-orange/20" />

            <blockquote className="text-lg leading-relaxed text-deep-navy/80 sm:text-xl">
              &ldquo;{t.review}&rdquo;
            </blockquote>

            <div className="mt-8 flex items-center justify-between">
              <div>
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warm-gold text-warm-gold" />
                  ))}
                </div>
                <p className="mt-2 font-semibold text-deep-navy">{t.name}</p>
                <p className="text-sm text-deep-navy/50">{t.position}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prev}
                  className="h-10 w-10 rounded-full border-slate-gray"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={next}
                  className="h-10 w-10 rounded-full border-slate-gray"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div className="mt-6 flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === current
                    ? "w-8 bg-burnt-orange"
                    : "w-2.5 bg-deep-navy/15 hover:bg-deep-navy/30"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}