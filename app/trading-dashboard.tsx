'use client'
//test

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowUpRight, Bot, ChevronDown, CircleHelp, Clock3, Command, LayoutDashboard, ListFilter, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Wallet, X } from 'lucide-react'
import { AgentControlPanels } from './agent-control-panels'
import { DEMO_USD_INR, formatINR, formatQuoteInINR, formatUSDAsINR, getMockNews, MAX_POSITION_EXPOSURE, MAX_RISK_PER_TRADE, runBacktest, sizePaperPosition, STOP_DISTANCE, submitMockExchangeOrder, type AgentDecisionEntry, type PaperPosition, type StrategyMode, type TradeJournalEntry, type TradeSide } from './paper-engine'

type Asset = { symbol: string; name: string; group: 'India' | 'US' | 'Crypto'; currency: '₹' | '$'; price: number; change: number; points: number[] }
type Position = PaperPosition
type OrderRequest = { symbol: string; side: TradeSide; quantity: number; source: 'manual' | 'agent' | 'stop'; strategy: TradeJournalEntry['strategy']; reason: string }
const initialAssets: Asset[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', group: 'India', currency: '₹', price: 1462.8, change: 1.24, points: [31, 25, 29, 20, 24, 15, 18, 11, 20, 13, 16, 7, 10, 4, 8, 1, 5, 0] },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', group: 'India', currency: '₹', price: 1684.35, change: 0.68, points: [28, 32, 25, 27, 20, 24, 15, 17, 11, 14, 8, 10, 6, 12, 5, 8, 2, 4] },
  { symbol: 'TCS', name: 'Tata Consultancy Services', group: 'India', currency: '₹', price: 3288.4, change: -0.36, points: [5, 8, 3, 13, 9, 15, 11, 18, 12, 20, 15, 17, 23, 18, 24, 19, 27, 25] },
  { symbol: 'NIFTY 50', name: 'NIFTY 50 Index', group: 'India', currency: '₹', price: 24856.5, change: 0.42, points: [28, 25, 31, 22, 26, 19, 23, 16, 21, 11, 16, 12, 18, 8, 13, 6, 9, 3] },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', group: 'US', currency: '$', price: 142.87, change: 2.16, points: [34, 30, 33, 22, 25, 18, 21, 15, 20, 9, 13, 10, 15, 5, 10, 3, 7, 0] },
  { symbol: 'AAPL', name: 'Apple Inc.', group: 'US', currency: '$', price: 213.25, change: -0.42, points: [4, 6, 2, 10, 7, 15, 10, 14, 20, 16, 21, 17, 25, 20, 23, 28, 24, 27] },
  { symbol: 'BTC', name: 'Bitcoin', group: 'Crypto', currency: '$', price: 67432.18, change: 1.82, points: [30, 26, 31, 23, 25, 17, 21, 13, 19, 12, 16, 9, 13, 7, 9, 3, 6, 0] },
  { symbol: 'ETH', name: 'Ethereum', group: 'Crypto', currency: '$', price: 3521.74, change: 0.94, points: [29, 25, 27, 18, 22, 16, 20, 11, 16, 10, 13, 6, 12, 5, 8, 1, 5, 0] },
]
const money = (n: number, symbol = '$') => `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const toUSD = (amount: number, currency: '₹' | '$') => currency === '₹' ? amount / DEMO_USD_INR : amount
const defaultPositions: Position[] = [
  { symbol: 'NVDA', side: 'BUY', quantity: 12, entry: 139.42, time: '10:42:18', stopPrice: 136.6316 },
  { symbol: 'BTC', side: 'BUY', quantity: 0.08, entry: 66120, time: '10:28:51', stopPrice: 64797.6 },
  { symbol: 'RELIANCE', side: 'BUY', quantity: 20, entry: 1446.1, time: '09:56:33', stopPrice: 1417.178 },
]
const initialCash = 100000 - defaultPositions.reduce((sum, position) => {
  const asset = initialAssets.find((item) => item.symbol === position.symbol)!
  return sum + toUSD(position.quantity * position.entry, asset.currency)
}, 0)
const localDayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const positionValueUSD = (positions: Position[], assetList: Asset[]) => positions.reduce((sum, position) => {
  const asset = assetList.find((item) => item.symbol === position.symbol)
  return sum + toUSD(position.quantity * (asset?.price ?? position.entry), asset?.currency ?? '$')
}, 0)

export function TradingDashboard() {
  const [assets, setAssets] = useState(initialAssets)
  const [selected, setSelected] = useState('NVDA')
  const [filter, setFilter] = useState('All assets')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('Positions')
  const [activeView, setActiveView] = useState<'overview' | 'agent'>('overview')
  const [running, setRunning] = useState(false)
  const [cash, setCash] = useState(initialCash)
  const [positions, setPositions] = useState(defaultPositions)
  const [portfolioHistory, setPortfolioHistory] = useState<number[]>(Array(24).fill(100000))
  const [trades, setTrades] = useState<Position[]>([])
  const [journal, setJournal] = useState<TradeJournalEntry[]>([])
  const [decisionLog, setDecisionLog] = useState<AgentDecisionEntry[]>([])
  const [killSwitch, setKillSwitch] = useState(false)
  const [dailyLossLimit, setDailyLossLimit] = useState(1000)
  const [dailyLossLimitInputINR, setDailyLossLimitInputINR] = useState('')
  const [maxOrderValueInputINR, setMaxOrderValueInputINR] = useState('')
  const [maxOrderValueINR, setMaxOrderValueINR] = useState<number | null>(null)
  const [riskCapsConfirmed, setRiskCapsConfirmed] = useState(false)
  const [riskPercent, setRiskPercent] = useState(MAX_RISK_PER_TRADE)
  const [dayStartEquity, setDayStartEquity] = useState(100000)
  const [tradingDay, setTradingDay] = useState(localDayKey())
  const [strategy, setStrategy] = useState<StrategyMode>('Adaptive')
  const [lastSignal, setLastSignal] = useState('Waiting for a qualifying setup')
  const [hydrated, setHydrated] = useState(false)
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState('1')
  const [notice, setNotice] = useState('')
  const assetsRef = useRef(assets)
  const accountRef = useRef({ cash, positions, running, killSwitch, dailyLossLimit, riskPercent, dayStartEquity, tradingDay, strategy, journal, maxOrderValueINR, riskCapsConfirmed })
  const pendingStopsRef = useRef(new Set<string>())
  const agentCycleInFlightRef = useRef(false)
  const orderExecutorRef = useRef<(request: OrderRequest) => Promise<boolean>>(() => Promise.resolve(false))
  assetsRef.current = assets
  const chosen = assets.find((asset) => asset.symbol === selected) ?? assets[0]

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('alphaagent-account-v2')
      if (saved) {
        const data = JSON.parse(saved)
        const savedCash = typeof data.cash === 'number' ? data.cash : initialCash
        const savedPositions: Position[] = Array.isArray(data.positions) ? data.positions.map((position: Position) => ({ ...position, stopPrice: typeof position.stopPrice === 'number' ? position.stopPrice : position.entry * (1 - STOP_DISTANCE) })) : defaultPositions
        if (typeof data.cash === 'number') setCash(data.cash)
        setPositions(savedPositions)
        if (Array.isArray(data.trades)) setTrades(data.trades)
        if (Array.isArray(data.journal)) setJournal(data.journal.map((entry: TradeJournalEntry) => ({ ...entry, currency: entry.currency ?? initialAssets.find((asset) => asset.symbol === entry.symbol)?.currency ?? '$' })))
        if (Array.isArray(data.decisionLog)) setDecisionLog(data.decisionLog.slice(0, 100).map((entry: AgentDecisionEntry) => ({ ...entry, confidence: typeof entry.confidence === 'number' ? entry.confidence : 0, model: typeof entry.model === 'string' ? entry.model : 'Local rules (legacy)' })))
        const savedHistory = Array.isArray(data.portfolioHistory) ? data.portfolioHistory.filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)).slice(-40) : []
        const initialMark = savedCash + positionValueUSD(savedPositions, initialAssets)
        setPortfolioHistory(savedHistory.length ? savedHistory : Array(24).fill(initialMark))
        const savedDailyLossLimit = typeof data.dailyLossLimit === 'number' ? Math.min(100_000_000 / DEMO_USD_INR, Math.max(100 / DEMO_USD_INR, data.dailyLossLimit)) : dailyLossLimit
        setDailyLossLimit(savedDailyLossLimit)
        const savedMaxOrderValueINR = typeof data.maxOrderValueINR === 'number' && Number.isFinite(data.maxOrderValueINR) && data.maxOrderValueINR > 0 ? data.maxOrderValueINR : null
        setMaxOrderValueINR(savedMaxOrderValueINR)
        setMaxOrderValueInputINR(typeof data.maxOrderValueInputINR === 'string' ? data.maxOrderValueInputINR : savedMaxOrderValueINR === null ? '' : String(savedMaxOrderValueINR))
        setDailyLossLimitInputINR(typeof data.dailyLossLimitInputINR === 'string' ? data.dailyLossLimitInputINR : typeof data.dailyLossLimit === 'number' ? String(Math.round(savedDailyLossLimit * DEMO_USD_INR)) : '')
        const hasConfirmedRiskCaps = data.agentEngineVersion === 1 && data.riskCapsConfirmed === true && savedMaxOrderValueINR !== null
        setRiskCapsConfirmed(hasConfirmedRiskCaps)
        setRunning(hasConfirmedRiskCaps && data.running === true)
        if (typeof data.killSwitch === 'boolean') setKillSwitch(data.killSwitch)
        if (typeof data.riskPercent === 'number') setRiskPercent(Math.min(MAX_RISK_PER_TRADE, Math.max(0.001, data.riskPercent)))
        if (data.strategy === 'Adaptive' || data.strategy === 'Momentum' || data.strategy === 'Mean reversion') setStrategy(data.strategy)
        const today = localDayKey()
        setTradingDay(today)
        if (data.tradingDay === today && typeof data.dayStartEquity === 'number') setDayStartEquity(data.dayStartEquity)
        else setDayStartEquity(savedCash + positionValueUSD(savedPositions, initialAssets))
      }
    } catch { /* Keep the default demo account if browser storage is unavailable. */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem('alphaagent-account-v2', JSON.stringify({ schemaVersion: 4, agentEngineVersion: 1, cash, positions, portfolioHistory, trades, journal, decisionLog, running, killSwitch, dailyLossLimit, dailyLossLimitInputINR, maxOrderValueInputINR, maxOrderValueINR, riskCapsConfirmed, riskPercent, dayStartEquity, tradingDay, strategy }))
  }, [cash, positions, portfolioHistory, trades, journal, decisionLog, running, killSwitch, dailyLossLimit, dailyLossLimitInputINR, maxOrderValueInputINR, maxOrderValueINR, riskCapsConfirmed, riskPercent, dayStartEquity, tradingDay, strategy, hydrated])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setInterval(() => {
      const nextAssets = assetsRef.current.map((asset) => {
        const delta = (Math.random() - 0.485) * asset.price * (asset.group === 'Crypto' ? 0.0008 : 0.00035)
        return { ...asset, price: Math.max(0.01, asset.price + delta), points: [...asset.points.slice(1), Math.max(2, Math.min(32, asset.points[asset.points.length - 1] + (Math.random() - 0.51) * 5))] }
      })
      assetsRef.current = nextAssets
      setAssets(nextAssets)
      const markedEquity = accountRef.current.cash + positionValueUSD(accountRef.current.positions, nextAssets)
      setPortfolioHistory((history) => [...history, markedEquity].slice(-40))
      accountRef.current.positions.forEach((position) => {
        const asset = nextAssets.find((item) => item.symbol === position.symbol)
        if (!asset || asset.price > position.stopPrice || pendingStopsRef.current.has(position.symbol)) return
        pendingStopsRef.current.add(position.symbol)
        void orderExecutorRef.current({ symbol: position.symbol, side: 'SELL', quantity: position.quantity, source: 'stop', strategy: 'Stop loss', reason: `Protective stop triggered at ${asset.currency}${position.stopPrice.toFixed(2)} after the simulated quote crossed the 2% risk stop.` })
        pendingStopsRef.current.delete(position.symbol)
      })
    }, 2200)
    return () => window.clearInterval(timer)
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return

    const runAgentCycle = async () => {
      const account = accountRef.current
      const today = localDayKey()
      if (account.tradingDay !== today) {
        const equity = account.cash + positionValueUSD(account.positions, assetsRef.current)
        setTradingDay(today)
        setDayStartEquity(equity)
        setLastSignal('New trading day — daily risk budget reset')
        return
      }
      if (!account.running || account.killSwitch || !account.riskCapsConfirmed || account.maxOrderValueINR === null || agentCycleInFlightRef.current) return

      const currentAssets = assetsRef.current
      const equity = account.cash + positionValueUSD(account.positions, currentAssets)
      const lossUsed = Math.max(0, account.dayStartEquity - equity)
      const remainingDailyLoss = Math.max(0, account.dailyLossLimit - lossUsed)
      if (lossUsed >= account.dailyLossLimit) {
        setRunning(false)
        setLastSignal('Daily loss cap reached — new entries locked')
        return
      }

      const snapshot = currentAssets.map((asset) => ({
        symbol: asset.symbol,
        name: asset.name,
        group: asset.group,
        currency: asset.currency,
        price: asset.price,
        change: asset.change,
        trend: asset.points[asset.points.length - 1] - asset.points[asset.points.length - 4],
        news: getMockNews(asset.symbol),
        backtests: {
          momentum: runBacktest(asset.symbol, 'Momentum'),
          meanReversion: runBacktest(asset.symbol, 'Mean reversion'),
        },
        position: account.positions.find((position) => position.symbol === asset.symbol) ?? null,
      }))
      const fallbackAsset = currentAssets[0]
      const fallbackNews = getMockNews(fallbackAsset.symbol)
      const fallbackTrend = fallbackAsset.points[fallbackAsset.points.length - 1] - fallbackAsset.points[fallbackAsset.points.length - 4]
      const fallbackStrategy: Exclude<StrategyMode, 'Adaptive'> = account.strategy === 'Mean reversion' ? 'Mean reversion' : 'Momentum'
      const fallbackBacktest = runBacktest(fallbackAsset.symbol, fallbackStrategy)
      agentCycleInFlightRef.current = true
      setLastSignal('AI scan in progress…')

      try {
        const response = await fetch('/api/paper-agent/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            strategyMode: account.strategy,
            assets: snapshot.map(({ backtests, news, position, ...asset }) => ({
              ...asset,
              news: { headline: news.headline, sentiment: news.sentiment },
              position: position ? { quantity: position.quantity, entry: position.entry, stopPrice: position.stopPrice } : null,
              backtests: {
                momentum: { strategyReturn: backtests.momentum.strategyReturn, buyAndHoldReturn: backtests.momentum.buyAndHoldReturn, maxDrawdown: backtests.momentum.maxDrawdown },
                meanReversion: { strategyReturn: backtests.meanReversion.strategyReturn, buyAndHoldReturn: backtests.meanReversion.buyAndHoldReturn, maxDrawdown: backtests.meanReversion.maxDrawdown },
              },
            })),
            account: {
              equityINR: equity * DEMO_USD_INR,
              cashINR: account.cash * DEMO_USD_INR,
              dailyLossUsedINR: lossUsed * DEMO_USD_INR,
              dailyLossLimitINR: account.dailyLossLimit * DEMO_USD_INR,
              maxOrderValueINR: account.maxOrderValueINR,
              riskPercent: account.riskPercent,
            },
          }),
        })
        const responseBody = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(typeof responseBody?.error === 'string' ? responseBody.error : 'AI Gateway did not return a decision.')
        }

        const decision = responseBody?.decision
        const model = typeof responseBody?.model === 'string' ? responseBody.model : 'Vercel AI Gateway'
        const validAction = decision?.action === 'BUY' || decision?.action === 'SELL' || decision?.action === 'HOLD'
        const validStrategy = decision?.strategy === 'Momentum' || decision?.strategy === 'Mean reversion'
        const validConfidence = typeof decision?.confidence === 'number' && Number.isFinite(decision.confidence) && decision.confidence >= 0 && decision.confidence <= 1
        const validRationale = typeof decision?.rationale === 'string' && decision.rationale.trim().length > 0
        const debate = Array.isArray(decision?.debate) && decision.debate.length === 3 ? decision.debate : null
        const validDebate = Boolean(debate && debate.every((entry: any) => ['technical analyst', 'risk officer', 'skeptic'].includes(entry?.role) && ['BUY', 'SELL', 'HOLD'].includes(entry?.stance) && typeof entry?.confidence === 'number' && typeof entry?.evidence === 'string'))
        const inputAsset = snapshot.find((asset) => asset.symbol === decision?.symbol)
        if (!validAction || !validStrategy || !validConfidence || !validRationale || !validDebate || !inputAsset) {
          throw new Error('AI Gateway returned an invalid structured decision. No paper order was sent.')
        }

        const selectedAsset = assetsRef.current.find((asset) => asset.symbol === decision.symbol)
        if (!selectedAsset) throw new Error('The selected simulated asset is no longer available.')
        const latestAccount = accountRef.current
        const latestEquity = latestAccount.cash + positionValueUSD(latestAccount.positions, assetsRef.current)
        const latestLossUsed = Math.max(0, latestAccount.dayStartEquity - latestEquity)
        const latestRemainingLoss = Math.max(0, latestAccount.dailyLossLimit - latestLossUsed)
        const strategy = decision.strategy as Exclude<StrategyMode, 'Adaptive'>
        const news = inputAsset.news
        const strategyBacktest = runBacktest(selectedAsset.symbol, strategy)
        const benchmarkGap = strategyBacktest.strategyReturn - strategyBacktest.buyAndHoldReturn
        const backtestApproved = benchmarkGap >= -0.02 && strategyBacktest.maxDrawdown <= 0.2
        const quoteDrift = Math.abs(selectedAsset.price - inputAsset.price) / inputAsset.price
        const recordDecision = (action: AgentDecisionEntry['action'], rationale: string, riskGate: AgentDecisionEntry['riskGate']) => {
          const entry: AgentDecisionEntry = {
            id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            symbol: selectedAsset.symbol,
            currency: selectedAsset.currency,
            strategy,
            action,
            price: selectedAsset.price,
            trend: inputAsset.trend,
            newsHeadline: news.headline,
            newsSentiment: news.sentiment,
            backtestReturn: strategyBacktest.strategyReturn,
            benchmarkReturn: strategyBacktest.buyAndHoldReturn,
            riskGate,
            confidence: decision.confidence,
            model,
            rationale,
            consensus: typeof decision.consensus === 'string' ? decision.consensus : undefined,
            debate: debate ?? undefined,
          }
          setDecisionLog((entries) => [entry, ...entries].slice(0, 100))
        }

        if (!latestAccount.running || latestAccount.killSwitch || !latestAccount.riskCapsConfirmed || latestAccount.maxOrderValueINR === null) {
          recordDecision('BLOCKED', 'The agent was paused or its risk caps changed while the model was responding. No paper order was sent.', 'BLOCKED')
          setLastSignal('AI decision discarded — agent or risk caps changed')
          return
        }
        if (latestLossUsed >= latestAccount.dailyLossLimit) {
          recordDecision('BLOCKED', `Daily loss cap reached at ${formatUSDAsINR(latestLossUsed)}. No paper order was sent.`, 'BLOCKED')
          setRunning(false)
          setLastSignal('Daily loss cap reached — new entries locked')
          return
        }
        if (quoteDrift > 0.01) {
          recordDecision('BLOCKED', 'The simulated quote moved more than 1% while the AI decision was in flight. The stale decision was discarded.', 'BLOCKED')
          setLastSignal(`SKIP ${selectedAsset.symbol} · quote changed during AI scan`)
          return
        }

        const position = latestAccount.positions.find((item) => item.symbol === selectedAsset.symbol)
        const rationale = decision.rationale.trim()
        if (decision.action === 'HOLD') {
          recordDecision('HOLD', rationale, 'NOT CHECKED')
          setLastSignal(`HOLD ${selectedAsset.symbol} · ${Math.round(decision.confidence * 100)}% model confidence`)
          return
        }
        if (decision.action === 'BUY' && position) {
          recordDecision('BLOCKED', `The AI proposed a new entry while a paper position is already open. No duplicate entry was sent. Model rationale: ${rationale}`, 'BLOCKED')
          setLastSignal(`BLOCKED ${selectedAsset.symbol} · position already open`)
          return
        }
        if (decision.action === 'SELL' && !position) {
          recordDecision('BLOCKED', `The AI proposed an exit without an open paper position. No sell was sent. Model rationale: ${rationale}`, 'BLOCKED')
          setLastSignal(`BLOCKED ${selectedAsset.symbol} · no open position to sell`)
          return
        }
        if (decision.action === 'BUY' && !backtestApproved) {
          recordDecision('BLOCKED', `The AI proposed an entry, but the independent 90-session backtest gate failed (${(strategyBacktest.strategyReturn * 100).toFixed(2)}% strategy return vs ${(strategyBacktest.buyAndHoldReturn * 100).toFixed(2)}% buy-and-hold, ${(strategyBacktest.maxDrawdown * 100).toFixed(2)}% max drawdown). Model rationale: ${rationale}`, 'BLOCKED')
          setLastSignal(`BLOCKED ${selectedAsset.symbol} · backtest risk gate failed`)
          return
        }

        if (decision.action === 'SELL' && position) {
          const reason = `AI ${strategy.toLowerCase()} exit at ${Math.round(decision.confidence * 100)}% model confidence. ${rationale}`
          const placed = await orderExecutorRef.current({ symbol: selectedAsset.symbol, side: 'SELL', quantity: position.quantity, source: 'agent', strategy, reason })
          recordDecision(placed ? 'SELL' : 'BLOCKED', placed ? `${reason} The simulated paper position was closed.` : `${reason} The paper engine rejected the exit.`, placed ? 'PASSED' : 'BLOCKED')
          setLastSignal(placed ? `SELL ${selectedAsset.symbol} · AI decision` : `BLOCKED ${selectedAsset.symbol} · paper exit unavailable`)
          return
        }

        const size = sizePaperPosition({
          priceUSD: toUSD(selectedAsset.price, selectedAsset.currency),
          equityUSD: latestEquity,
          remainingDailyLossUSD: latestRemainingLoss,
          isCrypto: selectedAsset.group === 'Crypto',
          riskPercent: latestAccount.riskPercent,
          maxOrderValueUSD: latestAccount.maxOrderValueINR / DEMO_USD_INR,
        })
        if (size.quantity <= 0) {
          recordDecision('BLOCKED', `The AI proposed an entry, but risk sizing returned no tradable quantity within the ${formatINR(latestAccount.maxOrderValueINR)} per-entry cap and remaining daily loss budget. Model rationale: ${rationale}`, 'BLOCKED')
          setLastSignal(`BLOCKED ${selectedAsset.symbol} · risk sizing returned zero`)
          return
        }
        const reason = `AI ${strategy.toLowerCase()} entry at ${Math.round(decision.confidence * 100)}% model confidence. ${rationale} The independent backtest returned ${(strategyBacktest.strategyReturn * 100).toFixed(2)}% versus ${(strategyBacktest.buyAndHoldReturn * 100).toFixed(2)}% buy-and-hold; risk-based quantity is capped by the confirmed ${formatINR(latestAccount.maxOrderValueINR)} entry limit and daily loss budget.`
        const placed = await orderExecutorRef.current({ symbol: selectedAsset.symbol, side: 'BUY', quantity: size.quantity, source: 'agent', strategy, reason })
        recordDecision(placed ? 'BUY' : 'BLOCKED', placed ? `${reason} The simulated paper order was filled.` : `${reason} The paper risk guards rejected the order.`, placed ? 'PASSED' : 'BLOCKED')
        setLastSignal(placed ? `BUY ${size.quantity} ${selectedAsset.symbol} · AI decision` : `BLOCKED ${selectedAsset.symbol} · paper risk guard blocked entry`)
      } catch (error) {
        const latestAccount = accountRef.current
        const failureMessage = error instanceof Error ? error.message : 'AI decision unavailable.'
        const entry: AgentDecisionEntry = {
          id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          symbol: fallbackAsset.symbol,
          currency: fallbackAsset.currency,
          strategy: fallbackStrategy,
          action: 'BLOCKED',
          price: fallbackAsset.price,
          trend: fallbackTrend,
          newsHeadline: fallbackNews.headline,
          newsSentiment: fallbackNews.sentiment,
          backtestReturn: fallbackBacktest.strategyReturn,
          benchmarkReturn: fallbackBacktest.buyAndHoldReturn,
          riskGate: 'BLOCKED',
          confidence: 0,
          model: 'Vercel AI Gateway',
          rationale: `${failureMessage} No paper order was sent.`,
        }
        if (latestAccount.running) setDecisionLog((entries) => [entry, ...entries].slice(0, 100))
        setRunning(false)
        setLastSignal(`AI scan failed · ${failureMessage}`)
      } finally {
        agentCycleInFlightRef.current = false
      }
    }

    const timer = window.setInterval(() => { void runAgentCycle() }, 60_000)
    void runAgentCycle()
    return () => window.clearInterval(timer)
  }, [hydrated])

  const filtered = useMemo(() => assets.filter((asset) => (filter === 'All assets' || asset.group === filter) && `${asset.symbol} ${asset.name}`.toLowerCase().includes(search.toLowerCase())), [assets, filter, search])
  const positionValue = positions.reduce((sum, position) => {
    const asset = assets.find((item) => item.symbol === position.symbol)
    return sum + toUSD(position.quantity * (asset?.price ?? position.entry), asset?.currency ?? '$')
  }, 0)
  const total = cash + positionValue
  const totalReturn = total - 100000
  const dailyPnl = total - dayStartEquity
  const dailyLoss = Math.max(0, -dailyPnl)
  const dailyLossCapValue = Number(dailyLossLimitInputINR)
  const maxOrderCapValue = Number(maxOrderValueInputINR)
  const riskCapsAreValid = dailyLossLimitInputINR.trim() !== '' && maxOrderValueInputINR.trim() !== '' && Number.isFinite(dailyLossCapValue) && Number.isFinite(maxOrderCapValue) && dailyLossCapValue >= 100 && dailyLossCapValue <= 100_000_000 && maxOrderCapValue >= 100 && maxOrderCapValue <= 100_000_000
  const updateDailyLossCapInput = (value: string) => { setDailyLossLimitInputINR(value); setRiskCapsConfirmed(false); setRunning(false) }
  const updateMaxOrderCapInput = (value: string) => { setMaxOrderValueInputINR(value); setRiskCapsConfirmed(false); setRunning(false) }
  const confirmRiskCaps = () => {
    if (!riskCapsAreValid) return
    setDailyLossLimit(Number(dailyLossLimitInputINR) / DEMO_USD_INR)
    setMaxOrderValueINR(Number(maxOrderValueInputINR))
    setRiskCapsConfirmed(true)
    setNotice('Paper risk caps confirmed. The AI agent remains paused until you start it.')
  }

  const resetPaperDay = () => {
    const equity = cash + positionValueUSD(positions, assets)
    setRunning(false)
    setKillSwitch(false)
    setTradingDay(localDayKey())
    setDayStartEquity(equity)
    setNotice('Paper day reset. Existing positions were preserved and the daily loss baseline starts from current equity.')
  }
  const closedJournal = journal.filter((entry) => entry.realizedPnl !== null)
  const winRate = closedJournal.length ? closedJournal.filter((entry) => (entry.realizedPnl ?? 0) > 0).length / closedJournal.length : 0
  const backtest = useMemo(() => runBacktest(chosen.symbol, strategy), [chosen.symbol, strategy])
  const chartValues = [...portfolioHistory.slice(-39), total]
  const chartMinimum = Math.min(...chartValues)
  const chartMaximum = Math.max(...chartValues)
  const chartPadding = Math.max((chartMaximum - chartMinimum) * 0.12, 50)
  const chartFloor = chartMinimum - chartPadding
  const chartCeiling = chartMaximum + chartPadding
  const chartCoordinates = chartValues.map((value, index) => ({
    x: chartValues.length === 1 ? 700 : index / (chartValues.length - 1) * 700,
    y: 155 - ((value - chartFloor) / (chartCeiling - chartFloor)) * 135,
  }))
  const performancePath = chartCoordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const performanceAreaPath = `${performancePath} L700 180 L0 180 Z`
  const latestChartPoint = chartCoordinates[chartCoordinates.length - 1]
  const chartAxisValues = Array.from({ length: 5 }, (_, index) => chartCeiling - (chartCeiling - chartFloor) * (index / 4))
  const agentActive = running && riskCapsConfirmed && !killSwitch && dailyLoss < dailyLossLimit

  accountRef.current = { cash, positions, running, killSwitch, dailyLossLimit, riskPercent, dayStartEquity, tradingDay, strategy, journal, maxOrderValueINR, riskCapsConfirmed }

    const executePaperOrder = async (request: OrderRequest): Promise<boolean> => {
    const account = accountRef.current
    const asset = assetsRef.current.find((item) => item.symbol === request.symbol)
    if (!asset || !Number.isFinite(request.quantity) || request.quantity <= 0) return false
    if (asset.group !== 'Crypto' && !Number.isInteger(request.quantity)) {
      if (request.source === 'manual') setNotice('Stock and index orders must use whole units.')
      return false
    }
    if (request.source === 'agent' && (!account.running || !account.riskCapsConfirmed)) return false
    if (request.source !== 'stop' && request.side === 'BUY' && account.killSwitch) {
      if (request.source === 'manual') setNotice('Trading is halted. Lift the kill switch before placing a new entry.')
      return false
    }

    const marketPrice = asset.price
    const unitPriceUSD = toUSD(marketPrice, asset.currency)
    const orderValueUSD = request.quantity * unitPriceUSD
    if (request.source === 'agent' && request.side === 'BUY' && (account.maxOrderValueINR === null || orderValueUSD * DEMO_USD_INR > account.maxOrderValueINR + 1)) return false
    const equity = account.cash + positionValueUSD(account.positions, assetsRef.current)
    const lossUsed = Math.max(0, account.dayStartEquity - equity)
    const currentPosition = account.positions.find((position) => position.symbol === request.symbol)

    if (request.side === 'BUY') {
      if (lossUsed >= account.dailyLossLimit) {
        setRunning(false)
        if (request.source === 'manual') setNotice('Daily loss limit reached. New entries are locked until the next trading day.')
        return false
      }
      if (account.positions.length >= 8 && !currentPosition) {
        if (request.source === 'manual') setNotice('The demo account is limited to eight open positions.')
        return false
      }
      const remainingRisk = Math.max(0, account.dailyLossLimit - lossUsed)
      const permittedRisk = Math.min(equity * Math.min(account.riskPercent, MAX_RISK_PER_TRADE), remainingRisk)
      const orderRisk = orderValueUSD * STOP_DISTANCE
      if (orderRisk > permittedRisk + 0.000001) {
        if (request.source === 'manual') setNotice(`Order blocked by risk sizing. Maximum planned loss for this entry is ${formatUSDAsINR(permittedRisk)}.`)
        return false
      }
      const symbolExposure = (currentPosition?.quantity ?? 0) * unitPriceUSD + orderValueUSD
      if (symbolExposure > equity * MAX_POSITION_EXPOSURE + 0.01) {
        if (request.source === 'manual') setNotice('Order blocked: this asset would exceed the 15% per-position exposure cap.')
        return false
      }
      if (orderValueUSD > account.cash) {
        if (request.source === 'manual') setNotice('Not enough paper cash for this order.')
        return false
      }
    } else if (!currentPosition || currentPosition.quantity + 0.0000001 < request.quantity) {
      if (request.source === 'manual') setNotice('Not enough shares in this paper position.')
      return false
    }

    let brokerOrderId: string | undefined
    if (request.source === 'agent' && asset.group !== 'India') {
      // Attempt Alpaca paper order for US + crypto — failure does NOT block the simulated fill
      const brokerSymbol = asset.group === 'Crypto' ? `${request.symbol}/USD` : request.symbol
      try {
        const brokerResponse = await fetch('/api/alpaca/paper/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: brokerSymbol, qty: request.quantity, side: request.side.toLowerCase(), type: 'market', timeInForce: asset.group === 'Crypto' ? 'gtc' : 'day', estimatedValueUSD: orderValueUSD, approvalToken: 'PAPER_AUTONOMOUS_APPROVED' }),
        })
        if (brokerResponse.ok) {
          const brokerOrder = await brokerResponse.json() as { id?: string }
          brokerOrderId = brokerOrder.id
        }
      } catch {
        // Alpaca unavailable — continue with simulated fill only
      }
    }

    const fill = submitMockExchangeOrder({ symbol: request.symbol, side: request.side, quantity: request.quantity, marketPrice })
    const price = fill.price
    const fillPriceUSD = toUSD(price, asset.currency)
    const timestamp = new Date(fill.filledAt).toLocaleTimeString('en-US', { hour12: false })
    const quantity = fill.quantity
    const nextCash = account.cash + (request.side === 'BUY' ? -1 : 1) * quantity * fillPriceUSD
    const nextPositions = request.side === 'BUY'
      ? currentPosition
        ? account.positions.map((position) => position.symbol === request.symbol ? {
            ...position,
            quantity: position.quantity + quantity,
            entry: (position.entry * position.quantity + price * quantity) / (position.quantity + quantity),
            stopPrice: ((position.entry * position.quantity + price * quantity) / (position.quantity + quantity)) * (1 - STOP_DISTANCE),
          } : position)
        : [{ symbol: request.symbol, side: 'BUY' as const, quantity, entry: price, time: timestamp, stopPrice: price * (1 - STOP_DISTANCE) }, ...account.positions]
      : account.positions.flatMap((position) => {
          if (position.symbol !== request.symbol) return [position]
          const remaining = position.quantity - quantity
          return remaining <= 0.000001 ? [] : [{ ...position, quantity: remaining }]
        })
    const realizedPnl = request.side === 'SELL' ? toUSD((price - currentPosition!.entry) * quantity, asset.currency) : null
    const stopPrice = request.side === 'BUY' ? price * (1 - STOP_DISTANCE) : currentPosition!.stopPrice
    const journalEntry: TradeJournalEntry = {
      id: fill.orderId,
      symbol: request.symbol,
      currency: asset.currency,
      side: request.side,
      quantity,
      price,
      time: timestamp,
      strategy: request.strategy,
      reason: brokerOrderId ? `${request.reason} Alpaca paper order ${brokerOrderId}.` : request.reason,
      stopPrice,
      ...(brokerOrderId ? { brokerOrderId } : {}),
      realizedPnl,
    }
    const tradeRecord: Position = { symbol: request.symbol, side: request.side, quantity, entry: price, time: timestamp, stopPrice }
    const nextJournal = [journalEntry, ...account.journal].slice(0, 100)

    accountRef.current = { ...account, cash: nextCash, positions: nextPositions, journal: nextJournal }
    setCash(nextCash)
    setPositions(nextPositions)
    setTrades((items) => [tradeRecord, ...items].slice(0, 50))
    setJournal(nextJournal)
    if (request.source === 'manual') {
      setNotice(`${request.side} paper order filled · ${quantity} ${request.symbol}`)
      window.setTimeout(() => setNotice(''), 3000)
    }
    return true
  }

  orderExecutorRef.current = executePaperOrder

  useEffect(() => {
    if (!hydrated || dailyLoss < dailyLossLimit || !running) return
    setRunning(false)
    setLastSignal('Daily loss limit reached — new entries locked')
    setNotice('Daily loss limit reached. New entries are locked until the next trading day.')
  }, [hydrated, dailyLoss, dailyLossLimit, running])

  const placeOrder = () => {
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) { setNotice('Enter a quantity greater than zero.'); return }
    const reason = orderSide === 'BUY'
      ? `Manual paper entry. Quantity is checked against the ${Math.min(riskPercent * 100, MAX_RISK_PER_TRADE * 100).toFixed(2)}% per-trade risk cap and the 2% protective stop.`
      : 'Manual paper exit requested by the user.'
    void executePaperOrder({ symbol: chosen.symbol, side: orderSide, quantity: qty, source: 'manual', strategy: 'Manual', reason })
  }

  return (
    <main className="terminal">
      <aside className="sidebar">
        <a className="brand" href="#overview"><span className="brand-mark"><Activity size={17} strokeWidth={2.5} /></span><span>paper<span className="brand-light">pilot</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className={`side-link ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')}><LayoutDashboard size={17} /> Overview</button>
        <button className={`side-link ${activeView === 'agent' ? 'active' : ''}`} onClick={() => setActiveView('agent')}><Bot size={17} /> Agent activity</button>
        <button className="side-link" onClick={() => { setActiveView('overview'); setActiveTab('Positions'); setTimeout(() => document.querySelector('.activity-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) }}><Wallet size={17} /> Portfolio</button>
        <button className="side-link" onClick={() => { setActiveView('overview'); setFilter('All assets'); setTimeout(() => document.querySelector('.markets-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) }}><Activity size={17} /> Markets <span className="side-count">8</span></button>
        <div className="side-divider" />
        <div className="workspace-label">YOUR ACCOUNT</div>
        <div className="account-card"><span className="account-avatar">A</span><span className="account-copy"><strong>Alex Morgan</strong><small>Paper account</small></span><ChevronDown size={14} /></div>
        <div className="sidebar-bottom"><div className="sandbox-card"><div className="sandbox-icon"><ShieldCheck size={15} /></div><div><strong>Safe sandbox</strong><p>Trades use virtual cash only.</p></div></div><button className="side-link"><Settings2 size={17} /> Settings</button><button className="side-link"><CircleHelp size={17} /> Help & support</button></div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{activeView === 'overview' ? 'Overview' : 'Agent activity'}</strong></div><div className="top-actions"><span className="market-status"><i /> Market simulation <span className="status-dot" /></span><button className="icon-button" aria-label="Search markets"><Search size={17} /></button><button className="avatar-small" aria-label="User profile">A</button></div></header>
        <div className="dashboard-content">
          <div className="page-heading"><div><div className="eyebrow">PAPER ACCOUNT <span className="heading-dot">·</span> SIMULATED MARKET SESSION</div><h1>{activeView === 'overview' ? <>Good morning, Alex <span aria-hidden="true">✳</span></> : 'Agent activity'}</h1><p>{activeView === 'overview' ? 'Here’s what’s happening in your paper portfolio today.' : 'Start the AI paper agent and inspect each model decision, risk check, and simulated order.'}</p></div><button className="outline-button" onClick={() => setActiveView(activeView === 'overview' ? 'agent' : 'overview')}><Clock3 size={15} />{activeView === 'overview' ? 'Agent activity' : 'Back to overview'}</button></div>

          <div className="notice-strip"><span className="notice-icon"><CircleHelp size={15} /></span><span><strong>Simulation mode</strong> — All orders are paper-only. Balances and risk limits use INR; overseas quotes use a fixed demo rate of ₹83.20 per $1. Prices and headlines are synthetic; the AI model chooses paper actions and only simulated fills are recorded. No broker or live-money orders are connected.</span><button onClick={() => setNotice('INR values use an illustrative fixed ₹83.20/USD conversion. Market prices, headlines, orders, and agent decisions are simulated.')}>Learn more</button></div>

          <div className="dashboard-tabs" role="tablist" aria-label="Paper account sections" onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const nextView = activeView === 'overview' ? 'agent' : 'overview'; setActiveView(nextView); document.getElementById(`${nextView}-tab`)?.focus() } }}>
            <button id="overview-tab" type="button" role="tab" aria-selected={activeView === 'overview'} aria-controls="overview-panel" tabIndex={activeView === 'overview' ? 0 : -1} className={activeView === 'overview' ? 'dashboard-tab active-dashboard-tab' : 'dashboard-tab'} onClick={() => setActiveView('overview')}><LayoutDashboard size={15} /> Overview</button>
            <button id="agent-tab" type="button" role="tab" aria-selected={activeView === 'agent'} aria-controls="agent-panel" tabIndex={activeView === 'agent' ? 0 : -1} className={activeView === 'agent' ? 'dashboard-tab active-dashboard-tab' : 'dashboard-tab'} onClick={() => setActiveView('agent')}><Bot size={15} /> Agent activity <span className="tab-count">{decisionLog.length}</span></button>
          </div>

          <section id="overview-panel" className="workspace-view" role="tabpanel" aria-labelledby="overview-tab" hidden={activeView !== 'overview'}>
          <section className="metric-grid" aria-label="Portfolio summary">
            <article className="metric-card"><div className="metric-top"><span>Total account value</span><span className="metric-icon"><Wallet size={16} /></span></div><div className="metric-value">{formatUSDAsINR(total)}</div><div className="metric-foot"><span className={totalReturn >= 0 ? 'positive' : 'negative'}>{totalReturn >= 0 ? '+' : '−'}{(totalReturn / 100000 * 100).toFixed(2)}%</span><span> vs. ₹83.2L starting balance</span><span className="period-pill">All time</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Today&apos;s P&amp;L</span><span className="metric-icon green"><ArrowUpRight size={16} /></span></div><div className={`metric-value ${dailyPnl >= 0 ? 'positive-text' : 'negative-text'}`}>{dailyPnl >= 0 ? '+' : ''}{formatUSDAsINR(dailyPnl)}</div><div className="metric-foot"><span className={dailyPnl >= 0 ? 'positive' : 'negative'}>{dailyPnl >= 0 ? '+' : ''}{(dailyPnl / Math.max(dayStartEquity, 1) * 100).toFixed(2)}%</span><span> realized + unrealized · simulated</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Available to trade</span><span className="metric-icon blue"><Command size={15} /></span></div><div className="metric-value">{formatUSDAsINR(cash)}</div><div className="metric-foot"><span className="muted-dot" /> Cash balance <span className="period-pill">INR base</span></div></article>
            <article className="metric-card"><div className="metric-top"><span>Open positions</span><span className="metric-icon violet"><SlidersHorizontal size={15} /></span></div><div className="metric-value">{positions.length}<span className="value-suffix"> / 8</span></div><div className="metric-foot"><span>{positions.length} assets</span><span> across stocks &amp; crypto</span></div></article>
          </section>

          <div className="content-grid">
            <section className="panel chart-panel"><div className="panel-heading"><div><div className="panel-kicker">PORTFOLIO PERFORMANCE</div><h2>Account value</h2></div><button className="select-button">All assets <ChevronDown size={13} /></button></div><div className="chart-summary"><strong>{formatUSDAsINR(total)}</strong><span className={totalReturn >= 0 ? 'positive' : 'negative'}>{totalReturn >= 0 ? '+' : ''}{formatUSDAsINR(totalReturn)} ({(totalReturn / 100000 * 100).toFixed(2)}%)</span></div><div className="large-chart"><div className="chart-axis">{chartAxisValues.map((value, index) => <span key={index}>₹{((value * DEMO_USD_INR) / 100000).toFixed(1)}L</span>)}</div><div className="chart-main"><div className="chart-gridline"/><div className="chart-gridline"/><div className="chart-gridline"/><div className="chart-gridline"/><svg className="performance-chart" viewBox="0 0 700 180" preserveAspectRatio="none" role="img" aria-label="Recent simulated paper-account marks"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#45d6aa" stopOpacity=".18"/><stop offset="100%" stopColor="#45d6aa" stopOpacity="0"/></linearGradient></defs><path d={performanceAreaPath} fill="url(#chartFill)"/><path d={performancePath} fill="none" stroke="#45d6aa" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/><circle cx={latestChartPoint.x} cy={latestChartPoint.y} r="4" fill="#45d6aa" stroke="#151b21" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chart-times"><span>Older marks</span><span>Most recent</span></div></div></div><div className="range-row"><span className="chart-footnote">Latest 40 paper marks · locally saved simulated history</span></div></section>

            <section className="panel agent-panel"><div className="agent-header"><div className="agent-title"><div className="agent-icon"><Bot size={19} /></div><div><h2>AI paper-trading agent</h2><span className="agent-subtitle"><i className={agentActive ? 'online-dot' : 'offline-dot'} /> {killSwitch ? 'Kill switch engaged' : !riskCapsConfirmed ? 'Risk caps required' : dailyLoss >= dailyLossLimit ? 'Daily limit reached' : running ? 'AI agent running' : 'AI agent paused'}</span></div></div><button className={`toggle-button ${agentActive ? 'is-running' : ''}`} onClick={() => setActiveView('agent')} aria-label="Open agent activity tab" title="Open agent activity to manage the paper agent"><ArrowUpRight size={14} /></button></div><div className="strategy-card"><div className="strategy-top"><span>ACTIVE STRATEGY</span><span className="risk-tag">{(riskPercent * 100).toFixed(2)}% RISK</span></div><strong>AI-directed {strategy.toLowerCase()} decisions</strong><p>Model evaluates sample quotes and demo headlines; deterministic risk controls size every paper entry.</p><div className="strategy-tags"><span>Stocks</span><span>Crypto</span><span>60s AI scan</span></div></div><div className="agent-stats"><div><span>Closed paper trades</span><strong>{closedJournal.length}</strong></div><div><span>Win rate</span><strong>{closedJournal.length ? `${(winRate * 100).toFixed(0)}%` : '—'}</strong></div><div><span>Last signal</span><strong className="last-signal">{lastSignal}</strong></div></div><div className="agent-warning"><ShieldCheck size={14} /><span>Paper trading only. No real orders are placed.</span></div><button className="agent-settings" onClick={() => document.querySelector('.safety-panel')?.scrollIntoView({ behavior: 'smooth' })}> <Settings2 size={14} /> Risk &amp; strategy controls <span>↓</span></button></section>
          </div>

          <div className="lower-grid"><section className="panel markets-panel"><div className="panel-heading market-heading"><div><div className="panel-kicker">YOUR WATCHLIST</div><h2>Markets <span className="market-count">{filtered.length}</span></h2></div><button className="icon-button subtle" aria-label="Filter markets"><ListFilter size={16} /></button></div><div className="market-toolbar"><div className="market-tabs">{['All assets', 'India', 'US', 'Crypto'].map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'market-tab selected-tab' : 'market-tab'}>{item}</button>)}</div><label className="search-field"><Search size={14} /><input aria-label="Search markets" placeholder="Search..." value={search} onChange={(event) => setSearch(event.target.value)} /></label></div><div className="asset-table"><div className="table-row table-head"><span>ASSET</span><span>PRICE · INR EQ.</span><span>24H CHANGE</span><span>TREND</span><span></span></div>{filtered.map((asset) => <button key={asset.symbol} className={`table-row asset-row ${selected === asset.symbol ? 'selected-asset' : ''}`} onClick={() => setSelected(asset.symbol)}><span className="asset-identity"><span className={`asset-logo logo-${asset.group.toLowerCase()}`}>{asset.symbol === 'BTC' ? '₿' : asset.symbol === 'ETH' ? '◆' : asset.group === 'India' ? 'IN' : asset.symbol.slice(0, 1)}</span><span><strong>{asset.symbol}</strong><small>{asset.name}</small></span></span><span className="price-stack"><strong className="price-value">{money(asset.price, asset.currency)}</strong><small>{asset.currency === '₹' ? 'INR quote' : `≈ ${formatQuoteInINR(asset.price, asset.currency)}`}</small></span><span className={asset.change >= 0 ? 'change-positive' : 'change-negative'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</span><svg className="sparkline" viewBox="0 0 86 28" preserveAspectRatio="none" aria-label={`Trend ${asset.change >= 0 ? 'up' : 'down'}`}><polyline points={asset.points.map((point, i) => `${i * 5},${point * .8}`).join(' ')} fill="none" stroke={asset.change >= 0 ? '#45d6aa' : '#f17676'} strokeWidth="1.7" vectorEffect="non-scaling-stroke" /></svg><span className="row-arrow">↗</span></button>)}</div><button className="view-markets" onClick={() => setNotice('All available demo markets are shown in this watchlist.')}>View all markets <span>→</span></button></section>

            <section className="panel order-panel"><div className="panel-heading"><div><div className="panel-kicker">QUICK TRADE <span className="sim-badge">SIM</span></div><h2>Place an order</h2></div><button className="icon-button subtle" aria-label="More order options"><MoreHorizontal size={18} /></button></div><label className="field-label" htmlFor="selectedAsset">Asset</label><button className="asset-picker" id="selectedAsset" onClick={() => { setFilter('All assets'); setNotice('Select an asset from the Markets watchlist.') }}><span className={`asset-logo logo-${chosen.group.toLowerCase()}`}>{chosen.symbol === 'BTC' ? '₿' : chosen.symbol === 'ETH' ? '◆' : chosen.group === 'India' ? 'IN' : chosen.symbol.slice(0, 1)}</span><span className="picker-name"><strong>{chosen.symbol}</strong><small>{chosen.name}</small></span><span className="picker-price">{money(chosen.price, chosen.currency)}<small className={chosen.change >= 0 ? 'change-positive' : 'change-negative'}>{chosen.change >= 0 ? '+' : ''}{chosen.change.toFixed(2)}%</small>{chosen.currency === '$' && <small className="currency-conversion">≈ {formatQuoteInINR(chosen.price, chosen.currency)}</small>}</span><ChevronDown size={15} /></button><div className="field-label order-label">Order type <span>Market</span></div><div className="side-toggle"><button onClick={() => setOrderSide('BUY')} className={orderSide === 'BUY' ? 'buy-active' : ''}>Buy</button><button onClick={() => setOrderSide('SELL')} className={orderSide === 'SELL' ? 'sell-active' : ''}>Sell</button></div><label className="field-label quantity-label" htmlFor="quantity">Quantity <span>{formatQuoteInINR(chosen.price, chosen.currency)} / unit</span></label><div className="quantity-input"><input id="quantity" type="number" min={chosen.group === 'Crypto' ? '0.0001' : '1'} step={chosen.group === 'Crypto' ? '0.0001' : '1'} value={quantity} onChange={(event) => setQuantity(event.target.value)} /><span>{chosen.symbol}</span></div><div className="order-total"><span>Estimated total · INR</span><strong>{formatQuoteInINR((Number(quantity) || 0) * chosen.price, chosen.currency)}</strong></div><p className="fx-note">{chosen.currency === '₹' ? 'Indian market quote · account values in INR' : 'USD market quote converted at demo FX ₹83.20 / $1'}</p><button className={`submit-order ${orderSide === 'SELL' ? 'submit-sell' : ''}`} onClick={placeOrder} disabled={(orderSide === 'BUY' && (killSwitch || dailyLoss >= dailyLossLimit)) || (orderSide === 'SELL' && !positions.some((position) => position.symbol === chosen.symbol))}>{orderSide} {chosen.symbol} <span>→</span></button><p className="order-disclaimer"><ShieldCheck size={12} /> Simulated order · No real money</p></section></div>

          <section className="panel activity-panel"><div className="panel-heading activity-heading"><div><div className="panel-kicker">YOUR PAPER ACCOUNT</div><h2>Portfolio activity</h2></div><button className="select-button" onClick={() => setActiveTab(activeTab === 'Positions' ? 'Orders' : 'Positions')}>{activeTab}<ChevronDown size={13} /></button></div><div className="activity-tabs"><button className={activeTab === 'Positions' ? 'activity-tab active-activity' : 'activity-tab'} onClick={() => setActiveTab('Positions')}>Positions <span>{positions.length}</span></button><button className={activeTab === 'Orders' ? 'activity-tab active-activity' : 'activity-tab'} onClick={() => setActiveTab('Orders')}>Recent trades <span>{trades.length}</span></button></div><div className="activity-table"><div className="activity-row activity-head"><span>{activeTab === 'Positions' ? 'ASSET' : 'TIME'}</span><span>TYPE</span><span>QUANTITY</span><span>{activeTab === 'Positions' ? 'AVG. ENTRY' : 'EXECUTION'}</span><span>{activeTab === 'Positions' ? 'MARKET VALUE' : 'STATUS'}</span><span>{activeTab === 'Positions' ? 'UNREALIZED P&L' : ''}</span></div>{(activeTab === 'Positions' ? positions : trades).length === 0 ? <div className="empty-row">No {activeTab === 'Positions' ? 'open positions' : 'trades yet'} — try a paper order above.</div> : (activeTab === 'Positions' ? positions : trades).slice(0, 6).map((position, index) => { const asset = assets.find((item) => item.symbol === position.symbol) ?? initialAssets[0]; const pnl = toUSD((asset.price - position.entry) * position.quantity, asset.currency); return <div className="activity-row" key={`${position.symbol}-${position.time}-${index}`}><span className="activity-asset">{activeTab === 'Positions' ? <><span className={`asset-logo logo-${asset.group.toLowerCase()}`}>{asset.symbol.slice(0, 1)}</span><strong>{position.symbol}<small>{asset.name}{activeTab === 'Positions' ? ` · Stop ${formatQuoteInINR(position.stopPrice, asset.currency)}` : ''}</small></strong></> : position.time}</span><span className={position.side === 'BUY' ? 'trade-type' : 'trade-type sell-type'}>{position.side}</span><span>{position.quantity}</span><span>{formatQuoteInINR(position.entry, asset.currency)}</span><span>{activeTab === 'Positions' ? formatQuoteInINR(asset.price * position.quantity, asset.currency) : <span className="filled-badge">Filled</span>}</span><span className={pnl >= 0 ? 'positive' : 'negative'}>{activeTab === 'Positions' ? `${pnl >= 0 ? '+' : '−'}${formatUSDAsINR(Math.abs(pnl))}` : ''}</span></div> })}</div></section>

          </section>
          <section id="agent-panel" className="workspace-view agent-workbench" role="tabpanel" aria-labelledby="agent-tab" hidden={activeView !== 'agent'}>
            <AgentControlPanels running={running} startDisabledReason={!riskCapsConfirmed || maxOrderValueINR === null ? 'Enter and confirm a maximum new-entry value and daily loss cap in Hard risk controls before starting.' : killSwitch ? 'Kill switch engaged. Turn it off in Hard risk controls to resume.' : dailyLoss >= dailyLossLimit ? `Daily loss cap reached: ${formatUSDAsINR(dailyLoss)} used of ${formatUSDAsINR(dailyLossLimit)}. Raise the cap or wait until the next trading day.` : null} onRunningChange={setRunning} dailyPnl={dailyPnl} dailyLoss={dailyLoss} dailyLossLimit={dailyLossLimit} dailyLossLimitInputINR={dailyLossLimitInputINR} maxOrderValueInputINR={maxOrderValueInputINR} riskCapsConfirmed={riskCapsConfirmed} riskCapsAreValid={riskCapsAreValid} onDailyLossLimitInputChange={updateDailyLossCapInput} onMaxOrderValueInputChange={updateMaxOrderCapInput} onConfirmRiskCaps={confirmRiskCaps} onResetPaperDay={resetPaperDay} riskPercent={riskPercent} onRiskPercentChange={setRiskPercent} killSwitch={killSwitch} onKillSwitchChange={(active) => { setKillSwitch(active); if (active) setRunning(false) }} strategy={strategy} selectedSymbol={chosen.symbol} onStrategyChange={setStrategy} lastSignal={lastSignal} journal={journal} decisionLog={decisionLog} backtest={backtest} />
          </section>

          <footer className="footer"><span><span className="footer-dot" /> Paper markets · simulated indicative prices <span className="footer-separator">·</span> Auto-refreshing</span><span>AlphaAgent <span className="footer-separator">·</span> For educational use only</span></footer>
        </div>
      </section>
      {notice && <div className="toast" role="status"><Sparkles size={15} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></div>}
      {activeView === 'overview' && <button className="mobile-add" type="button" onClick={() => document.querySelector('.order-panel')?.scrollIntoView({ behavior: 'smooth' })}><Plus size={17} /> Trade</button>}
    </main>
  )
}
