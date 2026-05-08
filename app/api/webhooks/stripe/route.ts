import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Tell Next.js not to parse the body — Stripe needs the raw bytes to verify signature
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { eventId, userId } = (session.metadata ?? {}) as { eventId?: string; userId?: string }

    if (!eventId || !userId) {
      console.error('Stripe webhook: missing metadata', session.metadata)
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('event_registrations')
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          stripe_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string' ? session.payment_intent : null,
          amount_paid: session.amount_total,
          currency: session.currency ?? 'usd',
          status: 'completed',
        },
        { onConflict: 'event_id,user_id' }
      )

    if (error) {
      console.error('Stripe webhook: failed to upsert registration', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    console.log(`✅ Registration completed: user ${userId} → event ${eventId}`)
  }

  if (event.type === 'charge.refunded') {
    // Mark registration as refunded when a charge is reversed
    const charge = event.data.object as { payment_intent?: string }
    if (charge.payment_intent) {
      const supabase = createAdminClient()
      await supabase
        .from('event_registrations')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', charge.payment_intent)
    }
  }

  return NextResponse.json({ received: true })
}
