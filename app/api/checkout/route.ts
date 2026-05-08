import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await req.json()
  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  // Load the event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, title, description, price, currency, is_paid, status')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  if (!event.is_paid || !event.price) {
    return NextResponse.json({ error: 'Event is not a paid event' }, { status: 400 })
  }
  if (event.status !== 'published') {
    return NextResponse.json({ error: 'Event is not available' }, { status: 400 })
  }

  // Check if already registered
  const { data: existing } = await db
    .from('event_registrations')
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.status === 'completed') {
    return NextResponse.json({ error: 'Already registered for this event' }, { status: 400 })
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000'

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: event.currency ?? 'usd',
          unit_amount: event.price,
          product_data: {
            name: event.title,
            description: event.description ?? undefined,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      eventId,
      userId: user.id,
    },
    success_url: `${origin}/events/${eventId}?registered=true`,
    cancel_url: `${origin}/events/${eventId}`,
  })

  return NextResponse.json({ url: session.url })
}
