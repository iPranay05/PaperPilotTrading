import { randomUUID } from 'node:crypto'

const ALPACA_PAPER_BASE_URL = 'https://paper-api.alpaca.markets'

export type AlpacaOrderRequest = {
  symbol: string
  qty: number
  side: 'buy' | 'sell'
  type?: 'market' | 'limit'
  limitPrice?: number
  timeInForce?: 'day' | 'gtc'
  clientOrderId?: string
}

export type AlpacaOrder = {
  id: string
  client_order_id: string
  status: string
  symbol: string
  qty: string
  side: string
  type: string
  time_in_force: string
  submitted_at: string
}

function getCredentials() {
  const key = process.env.ALPACA_PAPER_API_KEY
  const secret = process.env.ALPACA_PAPER_API_SECRET
  if (!key || !secret) throw new Error('Alpaca paper credentials are not configured.')
  return { key, secret }
}

export async function submitAlpacaPaperOrder(order: AlpacaOrderRequest): Promise<AlpacaOrder> {
  const credentials = getCredentials()
  const response = await fetch(`${ALPACA_PAPER_BASE_URL}/v2/orders`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'APCA-API-KEY-ID': credentials.key,
      'APCA-API-SECRET-KEY': credentials.secret,
    },
    body: JSON.stringify({
      symbol: order.symbol,
      qty: String(order.qty),
      side: order.side,
      type: order.type ?? 'market',
      ...(order.limitPrice ? { limit_price: String(order.limitPrice) } : {}),
      time_in_force: order.timeInForce ?? 'day',
      client_order_id: order.clientOrderId ?? `paperpilot-${randomUUID()}`,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Alpaca paper order rejected (${response.status}): ${message.slice(0, 500)}`)
  }

  return response.json() as Promise<AlpacaOrder>
}
