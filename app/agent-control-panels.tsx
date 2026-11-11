'use client'

import { Activity, BookOpenCheck, ChartNoAxesCombined, CircleAlert, Newspaper, Pause, Play, Power, ShieldCheck } from 'lucide-react'
import { formatQuoteInINR, formatUSDAsINR, mockNewsTape, type AgentDecisionEntry, type BacktestSummary, type StrategyMode, type TradeJournalEntry } from './paper-engine'

type AgentControlPanelsProps = {
  running: boolean
  startDisabledReason: string | null
  onRunningChange: (running: boolean) => void
  dailyPnl: number
  dailyLoss: number
  dailyLossLimit: number
  dailyLossLimitInputINR: string
  maxOrderValueInputINR: string
  riskCapsConfirmed: boolean
  riskCapsAreValid: boolean
  onDailyLossLimitInputChange: (value: string) => void
  onMaxOrderValueInputChange: (value: string) => void
  onConfirmRiskCaps: () => void
  onResetPaperDay: () => void
  riskPercent: number
  onRiskPercentChange: (value: number) => void
  killSwitch: boolean
  onKillSwitchChange: (active: boolean) => void
  strategy: StrategyMode
  selectedSymbol: string
  onStrategyChange: (value: StrategyMode) => void
  lastSignal: string
  journal: TradeJournalEntry[]
  decisionLog: AgentDecisionEntry[]
  backtest: BacktestSummary
}

const percent = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(2)}%`

export function AgentControlPanels({
  running,
  startDisabledReason,
  onRunningChange,
  dailyPnl,
  dailyLoss,
  dailyLossLimit,
  dailyLossLimitInputINR,
  maxOrderValueInputINR,
  riskCapsConfirmed,
  riskCapsAreValid,
  onDailyLossLimitInputChange,
  onMaxOrderValueInputChange,
  onConfirmRiskCaps,
  onResetPaperDay,
  riskPercent,
  onRiskPercentChange,
  killSwitch,
  onKillSwitchChange,
  strategy,
  selectedSymbol,
  onStrategyChange,
  lastSignal,
  journal,
  decisionLog,
  backtest,
}: AgentControlPanelsProps) {
  const lossProgress = riskCapsConfirmed ? Math.min(100, dailyLoss / dailyLossLimit * 100) : 0

  return (
    <>
      <section className="panel agent-runbar" aria-label="Agent run controls">
        <div className="agent-run-copy">
          <span className={`agent-run-state ${running ? 'is-live' : startDisabledReason ? 'is-locked' : ''}`}><i />{running ? 'Agent running' : 'Agent paused'}</span>
          <p>Gemini 2.5 Flash reviews simulated quotes every 60 seconds while this page is open. Each scan runs three independent AI roles before a moderator decides.</p>
          {!running && startDisabledReason && <p className="agent-block-reason" role="status"><CircleAlert size={13} />{startDisabledReason}</p>}
        </div>
        <button className={`agent-run-button ${running ? 'pause-agent' : ''}`} type="button" aria-pressed={running} disabled={!running && Boolean(startDisabledReason)} onClick={() => onRunningChange(!running)}>
          {running ? <Pause size={15} /> : <Play size={15} />}{running ? 'Pause agent' : 'Start agent'}
        </button>
      </section>
      <section className="agent-research-grid" aria-label="Agent risk, backtest, and news controls">
        <article className="panel safety-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">CAPITAL PROTECTION</div><h2>Hard risk controls</h2></div>
            <span className="panel-icon"><ShieldCheck size={16} /></span>
          </div>
          <div className="safety-status"><span className="safe-check"><ShieldCheck size={14} /></span><span>Paper-only execution</span><strong>ENFORCED</strong></div>
          <div className="risk-meter-copy"><span>Today P&amp;L · simulated</span><strong className={dailyPnl >= 0 ? 'positive-text' : 'negative-text'}>{formatUSDAsINR(dailyPnl)}</strong></div>
          <div className="risk-meter-copy"><span>Daily loss used</span><strong className={dailyLoss >= dailyLossLimit && riskCapsConfirmed ? 'negative-text' : ''}>{formatUSDAsINR(dailyLoss)} / {riskCapsConfirmed ? formatUSDAsINR(dailyLossLimit) : 'Awaiting cap confirmation'}</strong></div>
          <div className="risk-meter" role="progressbar" aria-label="Daily loss limit used" aria-valuenow={Math.round(lossProgress)} aria-valuemin={0} aria-valuemax={100}>
            <span className={lossProgress >= 80 ? 'risk-meter-fill danger' : 'risk-meter-fill'} style={{ width: `${lossProgress}%` }} />
          </div>
          <div className="risk-cap-fields">
            <label className="risk-cap-field" htmlFor="max-order-value"><span>Maximum new-entry value</span><div className="risk-cap-input"><span aria-hidden="true">₹</span><input id="max-order-value" type="number" min="100" max="100000000" step="1" inputMode="numeric" value={maxOrderValueInputINR} onChange={(event) => onMaxOrderValueInputChange(event.target.value)} aria-label="Maximum paper entry value in rupees" /></div></label>
            <label className="risk-cap-field" htmlFor="daily-loss-cap"><span>Maximum daily loss</span><div className="risk-cap-input"><span aria-hidden="true">₹</span><input id="daily-loss-cap" type="number" min="100" max="100000000" step="1" inputMode="numeric" value={dailyLossLimitInputINR} onChange={(event) => onDailyLossLimitInputChange(event.target.value)} aria-label="Maximum daily loss in rupees" /></div></label>
          </div>
          <div className="risk-cap-confirm-row"><p>{riskCapsConfirmed ? 'Confirmed for the paper agent.' : 'Set both exact limits, then confirm to enable the AI agent.'}</p><button type="button" className="risk-cap-confirm-button" disabled={!riskCapsAreValid} aria-pressed={riskCapsConfirmed} onClick={onConfirmRiskCaps}>{riskCapsConfirmed ? 'Update caps' : 'Confirm caps'}</button></div>
          <p className="risk-cap-note">The cap applies to new entries. Simulated sell and stop-loss exits remain available to reduce risk.</p>
          <button type="button" className="secondary-action-button" onClick={onResetPaperDay}>Reset paper day</button>
          <label className="risk-setting" htmlFor="risk-per-trade"><span>Risk per trade</span><strong>{(riskPercent * 100).toFixed(2)}%</strong></label>
          <input id="risk-per-trade" aria-label="Maximum risk per trade" type="range" min={0.001} max={0.005} step={0.001} value={riskPercent} onChange={(event) => onRiskPercentChange(Number(event.target.value))} />
          <label className="risk-setting" htmlFor="strategy-mode"><span>Strategy mode</span></label>
          <select id="strategy-mode" value={strategy} onChange={(event) => onStrategyChange(event.target.value as StrategyMode)}>
            <option value="Adaptive">Adaptive · select per signal</option>
            <option value="Momentum">Momentum</option>
            <option value="Mean reversion">Mean reversion</option>
          </select>
          <button className={`kill-switch-button ${killSwitch ? 'engaged' : ''}`} type="button" aria-pressed={killSwitch} onClick={() => onKillSwitchChange(!killSwitch)}>
            <Power size={15} />{killSwitch ? 'Kill switch engaged' : 'Engage kill switch'}
          </button>
          <p className="kill-switch-note"><CircleAlert size={13} /> Halts new entries; protective stops and manual exits remain available.</p>
          <div className="last-signal"><span>LAST AGENT DECISION</span><p aria-live="polite">{lastSignal}</p></div>
        </article>

        <article className="panel backtest-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">STRATEGY CHECK</div><h2>Backtest vs. buy &amp; hold</h2></div>
            <span className="panel-icon"><ChartNoAxesCombined size={16} /></span>
          </div>
          <p className="panel-subtitle">90-session synthetic replay · {selectedSymbol} versus buy and hold</p>
          <div className="backtest-returns">
            <div className="backtest-return-row"><span>{strategy === 'Adaptive' ? 'Adaptive strategy' : `${strategy} strategy`}</span><strong className={backtest.strategyReturn >= 0 ? 'positive-text' : 'negative-text'}>{percent(backtest.strategyReturn)}</strong></div>
            <div className="backtest-return-row"><span>Buy &amp; hold</span><strong className={backtest.buyAndHoldReturn >= 0 ? 'positive-text' : 'negative-text'}>{percent(backtest.buyAndHoldReturn)}</strong></div>
            <div className="backtest-return-row"><span>Difference vs. benchmark</span><strong className={backtest.strategyReturn >= backtest.buyAndHoldReturn ? 'positive-text' : 'negative-text'}>{percent(backtest.strategyReturn - backtest.buyAndHoldReturn)}</strong></div>
          </div>
          <div className="backtest-stats">
            <div><span>Max drawdown</span><strong className="negative-text">−{(backtest.maxDrawdown * 100).toFixed(2)}%</strong></div>
            <div><span>Signal changes</span><strong>{backtest.trades}</strong></div>
            <div><span>Winning exits</span><strong>{(backtest.winRate * 100).toFixed(0)}%</strong></div>
          </div>
          <div className="backtest-disclaimer"><CircleAlert size={13} /><span>Illustrative only. Uses generated price paths, not historical or live data; past simulation does not predict results.</span></div>
        </article>

        <article className="panel news-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">SENTIMENT INPUT</div><h2>Demo news tape</h2></div>
            <span className="panel-icon"><Newspaper size={16} /></span>
          </div>
          <p className="panel-subtitle">Sample headlines supplied to the AI model as simulated context.</p>
          <div className="news-list">
            {mockNewsTape.slice(0, 4).map((item) => (
              <article className="news-item" key={item.symbol}>
                <div className="news-item-meta"><strong>{item.symbol}</strong><span className={item.sentiment > 0.1 ? 'sentiment-positive' : item.sentiment < -0.1 ? 'sentiment-negative' : 'sentiment-neutral'}>{item.sentiment > 0.1 ? 'Positive' : item.sentiment < -0.1 ? 'Cautious' : 'Neutral'} · {item.published}</span></div>
                <p>{item.headline}</p>
              </article>
            ))}
          </div>
          <p className="feed-warning"><CircleAlert size={13} /> Sample content only; no external news provider is connected.</p>
        </article>
      </section>

      <section className="panel decision-log-panel" aria-labelledby="decision-log-title">
        <div className="panel-heading">
          <div><div className="eyebrow">SIGNAL AUDIT</div><h2 id="decision-log-title">Agent decision trace</h2></div>
          <div className="journal-count"><Activity size={14} /> {decisionLog.length} decisions</div>
        </div>
        <p className="panel-subtitle">Model action, evidence, confidence, backtest, deterministic risk gate, and concise rationale. This audit trail does not expose private chain-of-thought.</p>
        <details className="debate-preview debate-preview-persistent" open>
          <summary>Multi-agent debate system</summary>
          <p>Every new scan runs three independent roles, then a moderator resolves the vote. Expand any decision below to inspect the auditable evidence summaries.</p>
          <div className="debate-role-grid"><span><strong>Technical analyst</strong>Trend, price, news</span><span><strong>Risk officer</strong>Caps, exposure, stops</span><span><strong>Skeptic</strong>Challenges the thesis</span></div>
        </details>
        {decisionLog.length === 0 ? (
          <div className="journal-empty decision-empty-state"><Activity size={18} /><span>Start the agent to record every simulated buy, sell, hold, and blocked setup here.</span><details className="debate-preview" open><summary>Multi-agent debate is ready</summary><p>Each scan asks three independent roles for an auditable summary before a moderator chooses BUY, SELL, or HOLD.</p><div className="debate-role-grid"><span><strong>Technical analyst</strong>Trend, price, news</span><span><strong>Risk officer</strong>Caps, exposure, stops</span><span><strong>Skeptic</strong>Challenges the thesis</span></div></details></div>
        ) : (
          <div className="decision-log-list">
            {decisionLog.map((entry) => (
              <article className="decision-log-entry" key={entry.id}>
                <div className="decision-log-top">
                  <div className="decision-log-title"><span className={`decision-action decision-${entry.action.toLowerCase()}`}>{entry.action}</span><strong>{entry.symbol}</strong><span className="strategy-chip">{entry.strategy}</span></div>
                  <div className="decision-model-meta"><span>{entry.model}</span><span>{Math.round(entry.confidence * 100)}% confidence</span><time>{entry.time}</time></div>
                </div>
                <p className="decision-rationale">{entry.rationale}</p>
                {entry.debate && <details className="decision-debate">
                  <summary>Multi-agent debate · {entry.consensus ?? 'Consensus recorded'}</summary>
                  <div className="debate-report-list">
                    {entry.debate.map((report) => <div className="debate-report" key={report.role}><div><strong>{report.role}</strong><span className={`decision-action decision-${report.stance.toLowerCase()}`}>{report.stance}</span><span>{Math.round(report.confidence * 100)}%</span></div><p>{report.evidence}</p></div>)}
                  </div>
                </details>}
                <div className="decision-metrics">
                  <span>Quote {formatQuoteInINR(entry.price, entry.currency)}</span>
                  <span>Trend {entry.trend.toFixed(1)}</span>
                  <span>News {entry.newsSentiment >= 0 ? '+' : ''}{entry.newsSentiment.toFixed(2)}</span>
                  <span>Replay {percent(entry.backtestReturn)} vs {percent(entry.benchmarkReturn)}</span>
                  <span className={entry.riskGate === 'BLOCKED' ? 'negative-text' : entry.riskGate === 'PASSED' ? 'positive-text' : 'decision-neutral-text'}>Risk {entry.riskGate.toLowerCase()}</span>
                </div>
                <p className="decision-news">Sample headline: {entry.newsHeadline}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel journal-panel" aria-labelledby="journal-title">
        <div className="panel-heading">
          <div><div className="eyebrow">AUDIT TRAIL</div><h2 id="journal-title">Paper trade journal</h2></div>
          <div className="journal-count"><BookOpenCheck size={14} /> {journal.length} entries</div>
        </div>
        {journal.length === 0 ? (
          <div className="journal-empty"><Activity size={18} /><span>Every simulated fill will be recorded here with its strategy, risk stop, and plain-language rationale.</span></div>
        ) : (
          <div className="journal-list">
            {journal.map((entry) => (
              <article className="journal-entry" key={entry.id}>
                <div className="journal-entry-top">
                  <div className="journal-trade-title"><span className={`trade-side ${entry.side === 'BUY' ? 'buy' : 'sell'}`}>{entry.side}</span><strong>{entry.symbol}</strong><span className="strategy-chip">{entry.strategy}</span></div>
                  <time>{entry.time}</time>
                </div>
                <p>{entry.reason}</p>
                <div className="journal-entry-foot"><span>{entry.quantity} units · fill {formatQuoteInINR(entry.price, entry.currency)}</span><span>Stop {formatQuoteInINR(entry.stopPrice, entry.currency)}</span>{entry.brokerOrderId && <span>Alpaca {entry.brokerOrderId.slice(0, 10)}…</span>}{entry.realizedPnl !== null && <strong className={entry.realizedPnl >= 0 ? 'positive-text' : 'negative-text'}>{formatUSDAsINR(entry.realizedPnl)} realized</strong>}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
