export type StrategyMode = 'Adaptive' | 'Momentum' | 'Mean reversion'
export type TradeSide = 'BUY' | 'SELL'

export type MockNewsItem = {
  symbol: string
  headline: string
  source: string
  sentiment: number
  published: string
}

export type PaperPosition = {
  symbol: string
  side: TradeSide
  quantity: number
  entry: number
  time: string
  stopPrice: number
}

export type QuoteCurrency = '₹' | '$'

export type TradeJournalEntry = {
  id: string
  symbol: string
  currency: QuoteCurrency
  side: TradeSide
  quantity: number
  price: number
  time: string
  strategy: StrategyMode | 'Manual' | 'Stop loss'
  reason: string
  stopPrice: number
  realizedPnl: number | null
  brokerOrderId?: string
}

export type AgentDecisionEntry = {
  id: string
  time: string
  symbol: string
  currency: QuoteCurrency
  strategy: Exclude<StrategyMode, 'Adaptive'>
  action: 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED'
  price: number
  trend: number
  newsHeadline: string
  newsSentiment: number
  backtestReturn: number
  benchmarkReturn: number
  riskGate: 'PASSED' | 'BLOCKED' | 'NOT CHECKED'
  confidence: number
  model: string
  rationale: string
  consensus?: string
  debate?: Array<{ role: 'technical analyst' | 'risk officer' | 'skeptic'; stance: 'BUY' | 'SELL' | 'HOLD'; confidence: number; evidence: string; thinking?: string }>
  judgeThinking?: string
}

export type BacktestSummary = {
  strategyReturn: number
  buyAndHoldReturn: number
  maxDrawdown: number
  trades: number
  winRate: number
}

export const MAX_RISK_PER_TRADE = 0.005
export const MAX_POSITION_EXPOSURE = 0.15
export const STOP_DISTANCE = 0.02
export const DEMO_USD_INR = 83.2

export function formatINR(value: number) {
  const sign = value < 0 ? '−' : ''
  return `${sign}₹${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatUSDAsINR = (valueUSD: number) => formatINR(valueUSD * DEMO_USD_INR)
export const formatQuoteInINR = (value: number, currency: QuoteCurrency) => formatINR(currency === '₹' ? value : value * DEMO_USD_INR)

export type MockExchangeFill = {
  orderId: string
  status: 'FILLED'
  price: number
  quantity: number
  filledAt: string
}

export function submitMockExchangeOrder(order: { symbol: string; side: TradeSide; quantity: number; marketPrice: number }): MockExchangeFill {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return { orderId: `paper-${id}`, status: 'FILLED', price: order.marketPrice, quantity: order.quantity, filledAt: new Date().toISOString() }
}

export const mockNewsTape: MockNewsItem[] = [
  { symbol: 'NVDA', headline: 'Chip-sector demand outlook firms up in the demo news tape', source: 'Market brief · sample', sentiment: 0.65, published: '4m' },
  { symbol: 'AAPL', headline: 'Large-cap tech sentiment steadies after a quiet session', source: 'Market brief · sample', sentiment: 0.2, published: '11m' },
  { symbol: 'RELIANCE', headline: 'Indian energy and retail names see mixed simulated flows', source: 'Market brief · sample', sentiment: -0.1, published: '7m' },
  { symbol: 'HDFCBANK', headline: 'Banking shares hold a modest positive tone in sample coverage', source: 'Market brief · sample', sentiment: 0.35, published: '18m' },
  { symbol: 'TCS', headline: 'IT-services outlook remains cautious in the sample news feed', source: 'Market brief · sample', sentiment: -0.45, published: '13m' },
  { symbol: 'BTC', headline: 'Crypto risk appetite improves slightly in simulated coverage', source: 'Market brief · sample', sentiment: 0.4, published: '2m' },
  { symbol: 'ETH', headline: 'Digital-asset flows are mixed in the sample news tape', source: 'Market brief · sample', sentiment: 0.05, published: '9m' },
  { symbol: 'NIFTY 50', headline: 'Broad Indian index tone is neutral in the demo feed', source: 'Market brief · sample', sentiment: 0, published: '5m' },
]

export function getMockNews(symbol: string) {
  return mockNewsTape.find((item) => item.symbol === symbol) ?? mockNewsTape[mockNewsTape.length - 1]
}

export function sizePaperPosition({
  priceUSD,
  equityUSD,
  remainingDailyLossUSD,
  isCrypto,
  riskPercent = MAX_RISK_PER_TRADE,
  maxOrderValueUSD,
}: {
  priceUSD: number
  equityUSD: number
  remainingDailyLossUSD: number
  isCrypto: boolean
  riskPercent?: number
  maxOrderValueUSD?: number
}) {
  const boundedRiskPercent = Math.min(MAX_RISK_PER_TRADE, Math.max(0, riskPercent))
  const riskBudgetUSD = Math.max(0, Math.min(equityUSD * boundedRiskPercent, remainingDailyLossUSD))
  const unitRiskUSD = priceUSD * STOP_DISTANCE
  const maxByStop = unitRiskUSD > 0 ? riskBudgetUSD / unitRiskUSD : 0
  const maxByExposure = priceUSD > 0 ? (equityUSD * MAX_POSITION_EXPOSURE) / priceUSD : 0
  const maxByOrder = maxOrderValueUSD !== undefined && priceUSD > 0 ? maxOrderValueUSD / priceUSD : Number.POSITIVE_INFINITY
  const step = isCrypto ? 0.0001 : 1
  const quantity = Math.floor(Math.min(maxByStop, maxByExposure, maxByOrder) / step) * step

  return {
    quantity,
    stopPrice: priceUSD * (1 - STOP_DISTANCE),
    riskBudgetUSD,
    plannedRiskUSD: quantity * unitRiskUSD,
    exposureUSD: quantity * priceUSD,
  }
}

export function runBacktest(symbol: string, mode: StrategyMode, startingEquity = 100_000): BacktestSummary {
  const seed = [...symbol].reduce((total, char) => total + char.charCodeAt(0), 0)
  const dailyReturns = Array.from({ length: 90 }, (_, index) => (
    Math.sin((index + seed) * 0.47) * 0.008
    + Math.cos((index + seed) * 0.19) * 0.004
    + 0.00012
  ))

  let strategyEquity = startingEquity
  let buyAndHoldEquity = startingEquity
  let strategyPeak = startingEquity
  let maxDrawdown = 0
  let invested = false
  let trades = 0
  let winningTrades = 0
  let openTradeStart = startingEquity

  dailyReturns.forEach((dayReturn, index) => {
    const recent = dailyReturns.slice(Math.max(0, index - 4), index + 1)
    const momentum = recent.reduce((sum, item) => sum + item, 0) / recent.length
    const adaptiveMode: StrategyMode = Math.abs(momentum) > 0.0025 ? 'Momentum' : 'Mean reversion'
    const activeMode = mode === 'Adaptive' ? adaptiveMode : mode
    const signal = activeMode === 'Momentum' ? momentum : -momentum
    const shouldInvest = signal > 0.00025

    if (shouldInvest !== invested) {
      if (invested) {
        if (strategyEquity > openTradeStart) winningTrades += 1
      } else {
        openTradeStart = strategyEquity
      }
      trades += 1
      invested = shouldInvest
      strategyEquity *= 0.9995
    }

    if (invested) strategyEquity *= 1 + dayReturn
    buyAndHoldEquity *= 1 + dayReturn
    strategyPeak = Math.max(strategyPeak, strategyEquity)
    maxDrawdown = Math.max(maxDrawdown, (strategyPeak - strategyEquity) / strategyPeak)
  })

  if (invested && strategyEquity > openTradeStart) winningTrades += 1

  return {
    strategyReturn: strategyEquity / startingEquity - 1,
    buyAndHoldReturn: buyAndHoldEquity / startingEquity - 1,
    maxDrawdown,
    trades,
    winRate: trades ? winningTrades / Math.ceil(trades / 2) : 0,
  }
}
