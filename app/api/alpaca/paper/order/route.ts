import { z } from 'zod'
import { submitAlpacaPaperOrder } from '@/app/lib/alpaca-paper'

export const runtime = 'nodejs'

const MAX_ORDER_VALUE_USD = 500
const MAX_QUANTITY = 100
const orderSchema = z.object({
  symbol: z.string().trim().regex(/^[A-Z0-9.\-/]{1,20}$/),
  qty: z.number().finite().positive().max(MAX_QUANTITY),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']).default('market'),
  limitPrice: z.number().finite().positive().max(MAX_ORDER_VALUE_USD).optional(),
  timeInForce: z.enum(['day', 'gtc']).default('day'),
  estimatedValueUSD: z.number().finite().positive().max(MAX_ORDER_VALUE_USD),
  approvalToken: z.literal('PAPER_AUTONOMOUS_APPROVED'),
}).strict()

export async function POST(request: Request) {

  let input: unknown
  try { input = await request.json() } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const parsed = orderSchema.safeParse(input)
  if (!parsed.success) return Response.json({ error: 'Order failed server-side validation.' }, { status: 400 })

  if (parsed.data.type === 'limit' && parsed.data.limitPrice === undefined) {
    return Response.json({ error: 'Limit orders require a limit price.' }, { status: 400 })
  }

  try {
    const order = await submitAlpacaPaperOrder(parsed.data)
    return Response.json({ paperOnly: true, order }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Alpaca paper order was rejected.' }, { status: 502 })
  }
}
