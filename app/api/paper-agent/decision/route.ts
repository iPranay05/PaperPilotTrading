import { generateText, Output } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

export const runtime = 'nodejs'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
const modelId = 'groq/openai/gpt-oss-120b'
const model = groq('openai/gpt-oss-120b')

const allowedSymbols = ['RELIANCE', 'HDFCBANK', 'TCS', 'NIFTY 50', 'NVDA', 'AAPL', 'BTC', 'ETH'] as const
const currencySchema = z.enum(['₹', '$'])
const strategySchema = z.enum(['Adaptive', 'Momentum', 'Mean reversion'])
const backtestSchema = z.object({
  strategyReturn: z.number().finite(),
  buyAndHoldReturn: z.number().finite(),
  maxDrawdown: z.number().min(0).max(1),
}).strict()

const scanRequestSchema = z.object({
  strategyMode: strategySchema,
  assets: z.array(z.object({
    symbol: z.enum(allowedSymbols),
    name: z.string().max(80),
    group: z.enum(['India', 'US', 'Crypto']),
    currency: currencySchema,
    price: z.number().positive().finite(),
    change: z.number().finite(),
    trend: z.number().finite(),
    news: z.object({
      headline: z.string().max(240),
      sentiment: z.number().min(-1).max(1),
    }).strict(),
    backtests: z.object({
      momentum: backtestSchema,
      meanReversion: backtestSchema,
    }).strict(),
    position: z.object({
      quantity: z.number().positive().finite(),
      entry: z.number().positive().finite(),
      stopPrice: z.number().positive().finite(),
    }).strict().nullable(),
  }).strict()).min(1).max(8),
  account: z.object({
    equityINR: z.number().nonnegative().finite(),
    cashINR: z.number().nonnegative().finite(),
    dailyLossUsedINR: z.number().nonnegative().finite(),
    dailyLossLimitINR: z.number().positive().finite(),
    maxOrderValueINR: z.number().positive().finite(),
    riskPercent: z.number().positive().max(0.005),
  }).strict(),
}).strict()

const debateEntrySchema = z.object({
  role: z.enum(['technical analyst', 'risk officer', 'skeptic']),
  stance: z.enum(['BUY', 'SELL', 'HOLD']),
  confidence: z.number().min(0).max(1),
  evidence: z.string().trim().min(1).max(240),
}).strict()

const decisionSchema = z.object({
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  symbol: z.enum(allowedSymbols),
  strategy: z.enum(['Momentum', 'Mean reversion']),
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().min(1).max(320),
  debate: z.array(debateEntrySchema).length(3),
  consensus: z.string().trim().min(1).max(240),
}).strict()

const lastRequestByAddress = new Map<string, number>()
const minimumRequestIntervalMs = 50_000
const maximumBodyBytes = 24_000

/** Retry once on schema/output validation failures. */
async function generateWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (!msg.includes('schema') && !msg.includes('object generated') && !msg.includes('No object')) throw err
    await new Promise((r) => setTimeout(r, 1500))
    return fn()
  }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim()
  const host = forwardedHost || request.headers.get('host')
  if (!origin) return true
  if (!host) return false
  try { return new URL(origin).host === host } catch { return false }
}

function jsonError(message: string, status: number, retryAfter?: number) {
  return Response.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store', ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) } },
  )
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError('Same-origin requests only.', 403)

  const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const nextAllowedAt = lastRequestByAddress.get(address) ?? 0
  if (now < nextAllowedAt) {
    return jsonError('The paper agent is limited to one model scan per 50 seconds.', 429, Math.ceil((nextAllowedAt - now) / 1000))
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > maximumBodyBytes) return jsonError('The market snapshot is too large.', 413)

  let rawBody: string
  try { rawBody = await request.text() }
  catch { return jsonError('Unable to read the market snapshot.', 400) }
  if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) return jsonError('The market snapshot is too large.', 413)

  let rawData: unknown
  try { rawData = JSON.parse(rawBody) }
  catch { return jsonError('The market snapshot must be valid JSON.', 400) }

  const parsed = scanRequestSchema.safeParse(rawData)
  if (!parsed.success) return jsonError('The market snapshot did not match the paper-agent schema.', 400)

  lastRequestByAddress.set(address, now + minimumRequestIntervalMs)
  for (const [key, allowedAt] of lastRequestByAddress) {
    if (allowedAt <= now) lastRequestByAddress.delete(key)
  }

  let output: z.infer<typeof decisionSchema> | undefined
  try {
    const snapshot = JSON.stringify(parsed.data)
    const roles = [
      { role: 'technical analyst' as const, brief: 'Focus on trend, price action, news sentiment, and the requested strategy.' },
      { role: 'risk officer' as const, brief: 'Focus on INR loss limits, open positions, sizing constraints, drawdown, and whether risk permits an action.' },
      { role: 'skeptic' as const, brief: 'Challenge the bullish and bearish cases, identify missing or conflicting evidence, and prefer HOLD when uncertain.' },
    ]

    const reports = await Promise.all(roles.map(({ role, brief }) =>
      generateWithRetry(async () => {
        const result = await generateText({
          model,
          output: Output.object({ schema: debateEntrySchema }),
          system: [
            `You are the ${role} on a three-agent debate for a PAPER-ONLY trading simulator.`,
            brief,
            'Use only the supplied synthetic snapshot. Do not fetch data or invent facts. Return an auditable stance and concise evidence, never private chain-of-thought.',
          ].join(' '),
          prompt: snapshot,
        })
        return { ...result.output, role }
      })
    ))

    const judge = await generateWithRetry(() => generateText({
      model,
      output: Output.object({ schema: decisionSchema }),
      system: [
        'You are the final moderator for a PAPER-ONLY trading simulator.',
        'Review the three independent reports, resolve disagreements, and return exactly one listed symbol with BUY, SELL, or HOLD.',
        'BUY only when evidence supports it and the supplied risk context permits it. SELL only when that symbol has an open position. Prefer HOLD when reports conflict or evidence is weak.',
        'Never choose order quantity. The paper engine independently applies caps, daily loss, cash, exposure, and stop checks.',
        'Return an auditable rationale, a one-sentence consensus, and the three reports. Do not expose private chain-of-thought.',
      ].join(' '),
      prompt: JSON.stringify({ snapshot: parsed.data, reports }),
    }))
    output = judge.output
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return jsonError(`The multi-agent decision could not be generated. ${detail}`, 502)
  }

  if (!output) return jsonError('The AI debate returned no valid paper decision.', 502)

  return Response.json(
    { decision: output, model: modelId, agents: output.debate },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
