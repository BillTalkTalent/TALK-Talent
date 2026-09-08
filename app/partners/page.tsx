import Link from 'next/link'
import { Users, Megaphone, BadgeCheck, ArrowRight } from 'lucide-react'
import VendorApplyForm from './vendor-apply-form'

const N = {
  navA: '#0F1F35',
  navB: '#162D4A',
  red: '#E8503A',
  pageBg: '#F5F8FC',
  text: '#0F1F35',
  muted: '#5A7090',
}

const benefits = [
  {
    icon: Users,
    title: 'Reach real TA leaders',
    desc: 'Your listing goes in front of thousands of talent acquisition leaders and practitioners actively using TALK every week.',
  },
  {
    icon: BadgeCheck,
    title: 'A managed listing, not a static ad',
    desc: 'Edit your own description, logo, and contact info any time — no waiting on us to make a change.',
  },
  {
    icon: Megaphone,
    title: 'Share updates with the community',
    desc: 'Post news, resources, or announcements that show up right on your listing page for members to see.',
  },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen font-sans" style={{ background: N.pageBg, color: N.text }}>
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: `linear-gradient(90deg, ${N.navA}, ${N.navB})` }}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-baseline" style={{ fontFamily: 'var(--font-poppins), system-ui', fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em' }}>
            <span style={{ color: N.red }}>TA</span>
            <span style={{ color: 'white' }}>LK</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            Back to TALK
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${N.navA} 0%, ${N.navB} 55%, #1A3A5C 100%)` }}>
        <div className="relative max-w-3xl mx-auto text-center pt-36 pb-20 px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold mb-6 tracking-wide uppercase" style={{ borderColor: '#2563EB50', background: '#2563EB20', color: '#93C5FD' }}>
            Vendor Partner Program
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Get in front of the TA leaders<br className="hidden sm:block" /> who choose your tools
          </h1>
          <p className="mt-5 text-white/70 text-lg leading-relaxed">
            TALK&apos;s vendor directory is where talent acquisition leaders discover, compare, and review
            recruiting tools. Apply below to become a listed partner.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 -mt-10 pb-24">
        <div className="grid sm:grid-cols-3 gap-5 mb-14">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white border p-6 shadow-sm" style={{ borderColor: '#DDE6F0' }}>
              <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${N.red}15` }}>
                <Icon className="size-5" style={{ color: N.red }} />
              </div>
              <p className="font-bold mb-1.5">{title}</p>
              <p className="text-sm leading-relaxed" style={{ color: N.muted }}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto rounded-2xl bg-white border p-8 shadow-sm" style={{ borderColor: '#DDE6F0' }}>
          <h2 className="text-xl font-bold mb-1">Apply as a vendor partner</h2>
          <p className="text-sm mb-6" style={{ color: N.muted }}>
            Tell us a bit about your company — we&apos;ll follow up to talk pricing and next steps.
          </p>
          <VendorApplyForm />
        </div>

        <p className="text-center text-sm mt-8" style={{ color: N.muted }}>
          Already a partner?{' '}
          <Link href="/vendor-portal/login" className="font-semibold hover:underline" style={{ color: N.text }}>
            Vendor Partner Login <ArrowRight className="inline size-3.5" />
          </Link>
        </p>
      </section>
    </div>
  )
}
