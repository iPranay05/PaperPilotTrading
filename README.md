# 🤖 PaperPilot - Agentic Paper Trading Bot

An autonomous AI-powered paper trading system that uses multi-agent debate to make real-time trading decisions on stocks, crypto, and indices.

## 🎯 Overview

PaperPilot simulates a professional trading desk with three specialized AI agents debating every trade decision:
- **Technical Analyst**: Analyzes price trends, momentum, and news sentiment
- **Risk Officer**: Enforces position sizing, loss limits, and risk caps
- **Skeptic**: Challenges assumptions and prefers HOLD when uncertain

A fourth **Judge Agent** moderates the debate and makes the final BUY/SELL/HOLD decision.

## 🚀 Features

- ✅ **Fully Autonomous Trading** - 60-second decision cycles with zero human intervention
- ✅ **Multi-Agent AI Debate** - 3 specialized agents + 1 judge powered by Groq AI
- ✅ **8 Diverse Assets** - Indian stocks (RELIANCE, HDFCBANK, TCS, NIFTY 50), US tech (NVDA, AAPL), crypto (BTC, ETH)
- ✅ **Real-Time News Sentiment** - Synthetic news analysis with sentiment scoring
- ✅ **Dual-Strategy Backtesting** - Momentum & Mean Reversion backtests per asset
- ✅ **Advanced Risk Management** - Daily loss limits, position sizing, stop losses, exposure caps
- ✅ **Alpaca Integration** - Real paper trading API calls (with mock exchange fallback)
- ✅ **Live Portfolio Tracking** - Real-time P&L, win rate, drawdown, performance charts

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **AI**: Groq AI (gpt-oss-120b model), Vercel AI SDK
- **Trading**: Alpaca Paper Trading API
- **Deployment**: Vercel

## 📦 Installation

### Prerequisites
- Node.js 18+ or pnpm
- Groq API key (free): https://console.groq.com/keys
- Alpaca Paper Trading account (free): https://app.alpaca.markets

### Setup Steps

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/PaperPilot.git
cd PaperPilot
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory:

```env
# Groq AI API Key (required)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Alpaca Paper Trading API (optional - uses mock exchange if not provided)
ALPACA_PAPER_API_KEY=your_alpaca_key
ALPACA_PAPER_API_SECRET=your_alpaca_secret
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open http://localhost:3000**

## 🎮 Usage

1. **Set Risk Caps**
   - Daily Loss Limit (INR): `5000` - `10000`
   - Max Order Value (INR): `10000` - `20000`
   - Risk % per trade: `0.5` (0.5% of equity)
   - Click "Confirm Caps"

2. **Start the Agent**
   - Click the green "Start Agent" button
   - Agent will scan markets every 60 seconds

3. **Watch the AI Debate**
   - View real-time agent discussions
   - See confidence levels and evidence
   - Monitor autonomous trade executions

4. **Track Performance**
   - Live portfolio value chart
   - P&L breakdown per position
   - Win rate and trade journal

## 🚢 Deployment to Vercel

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/PaperPilot)

### Manual Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Add Environment Variables in Vercel Dashboard**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add:
     - `GROQ_API_KEY` = your Groq API key
     - `ALPACA_PAPER_API_KEY` = your Alpaca key (optional)
     - `ALPACA_PAPER_API_SECRET` = your Alpaca secret (optional)

5. **Redeploy** after adding env vars

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Trading Dashboard UI              │
│  (React + Next.js + TailwindCSS)           │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│      Paper Trading Engine (Client)          │
│  • Portfolio state management               │
│  • Risk validation & position sizing        │
│  • Order execution & P&L tracking          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│    AI Decision Route (API)                  │
│  POST /api/paper-agent/decision             │
│                                             │
│  1. Rate limiting (50s cooldown)           │
│  2. Market snapshot validation             │
│  3. Generate 3 agent reports (parallel)    │
│  4. Judge synthesizes final decision       │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   Groq AI    │   │ Alpaca API   │
│ (gpt-oss-120b)   │ (Paper Trading)
└──────────────┘   └──────────────┘
```

## 📊 Key Algorithms

### 1. Multi-Agent Debate System
- **3 Parallel Agent Calls**: Each agent independently analyzes the market snapshot
- **Structured Output**: Uses Vercel AI SDK's `Output.object()` with Zod schemas
- **Judge Moderator**: Resolves conflicts and enforces risk rules

### 2. Risk Management
- **Position Sizing**: Max 0.5% risk per trade
- **Daily Loss Limit**: Pauses trading if exceeded
- **Stop Loss**: Auto-calculated at 8% below entry
- **Exposure Cap**: Max 15% of equity per symbol
- **Max Positions**: Limited to 8 concurrent positions

### 3. Backtesting Engine
- **Momentum Strategy**: Buys uptrends, shorts downtrends
- **Mean Reversion**: Buys oversold, sells overbought
- **Performance Metrics**: Strategy return vs buy-and-hold, max drawdown

## 🔧 Configuration

### Agent Cycle Timing
Edit `minimumRequestIntervalMs` in `app/api/paper-agent/decision/route.ts`:
```typescript
const minimumRequestIntervalMs = 50_000 // 50 seconds default
```

### Risk Parameters
Adjust constants in `app/trading-dashboard.tsx`:
```typescript
const STOP_DISTANCE = 0.08 // 8% stop loss
const MAX_POSITION_EXPOSURE = 0.15 // 15% per position
const MAX_RISK_PER_TRADE = 0.005 // 0.5% max risk
```

### Supported Assets
Edit `allowedSymbols` in `app/api/paper-agent/decision/route.ts`:
```typescript
const allowedSymbols = [
  'RELIANCE', 'HDFCBANK', 'TCS', 'NIFTY 50', // India
  'NVDA', 'AAPL', // US
  'BTC', 'ETH' // Crypto
]
```

## 🐛 Troubleshooting

### "AI scan failed" errors
- **Check Groq API key** is valid in `.env.local`
- **Verify model availability**: `openai/gpt-oss-120b` is the current model
- **Rate limits**: Free tier has 250K tokens/min (resets every 60s)

### Trades not executing
- Ensure **"Start Agent"** button is clicked
- Check **risk caps are confirmed**
- Verify **daily loss limit** not exceeded
- Check browser console for API errors

### Alpaca orders failing
- Alpaca failures won't block trades (mock exchange takes over)
- Verify API keys are correct
- Check Alpaca paper trading account status

## 📝 License

MIT License - feel free to use for learning and hackathons!

## 🙏 Acknowledgments

- **Groq** for blazing-fast LLM inference
- **Alpaca** for paper trading API
- **Vercel** for AI SDK and hosting
- **shadcn/ui** for beautiful components

## 📧 Contact

Built for Hack4Hack hackathon  
Submission deadline: [Your Date]

---

⭐ Star this repo if you found it helpful!
#   P a p e r P i l o t T r a d i n g  
 