import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const blogPosts = [
  {
    title: "How to Reduce Result Computation Errors in Your School",
    excerpt: "Discover practical strategies to eliminate common calculation mistakes and publish accurate results every term.",
    tag: "School Management",
  },
  {
    title: "Why Every School Should Go Digital",
    excerpt: "The transition from paper to digital isn't just about convenience  it's about survival in a competitive education landscape.",
    tag: "Education Technology",
  },
  {
    title: "5 Ways AI is Helping Teachers Save Time",
    excerpt: "From lesson planning to grading, artificial intelligence is giving teachers back the hours they need to focus on students.",
    tag: "AI for Teachers",
  },
]

export function Blog() {
  return (
    <section id="blog" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-burnt-orange uppercase">
            Blog
          </p>
          <h2 className="mt-4 font-[Georgia,serif] text-3xl font-bold leading-tight text-deep-navy sm:text-4xl">
            Latest from our blog
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {blogPosts.map((post) => (
            <article
              key={post.title}
              className="group cursor-pointer rounded-2xl border border-slate-gray/60 bg-slate-gray/30 p-6 transition-all hover:border-burnt-orange/20 hover:bg-white hover:shadow-lg hover:shadow-burnt-orange/5"
            >
              {/* Image placeholder */}
              <div className="mb-5 h-44 rounded-xl bg-gradient-to-br from-slate-gray to-slate-gray/50" />
              <span className="inline-block rounded-full bg-burnt-orange/10 px-3 py-1 text-xs font-semibold text-burnt-orange">
                {post.tag}
              </span>
              <h3 className="mt-3 text-lg font-semibold leading-snug text-deep-navy transition-colors group-hover:text-burnt-orange">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-deep-navy/60">
                {post.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-burnt-orange">
                Read Article <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button
            variant="outline"
            className="rounded-full border-deep-navy/20 px-8 text-base font-semibold text-deep-navy hover:bg-deep-navy/5"
          >
            View All Articles
          </Button>
        </div>
      </div>
    </section>
  )
}