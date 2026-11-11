# 🚀 Vercel Deployment Guide for PaperPilot

## Quick Deploy (5 minutes)

### Option 1: GitHub Integration (Recommended)

1. **Push your code to GitHub**
```bash
git init
git add .
git commit -m "Initial commit - PaperPilot"
git branch -M main
git remote add origin https://github.com/yourusername/PaperPilot.git
git push -u origin main
```

2. **Deploy to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your PaperPilot repo
   - Click "Import"

3. **Add Environment Variables**
   - In the Vercel import screen, expand "Environment Variables"
   - Add these three variables:
     ```
     GROQ_API_KEY = gsk_your_groq_api_key_here
     ALPACA_PAPER_API_KEY = your_alpaca_key (optional)
     ALPACA_PAPER_API_SECRET = your_alpaca_secret (optional)
     ```
   - Click "Deploy"

4. **Wait for deployment** (usually 2-3 minutes)

5. **Your app is live!** 🎉
   - Vercel will give you a URL like: `https://paper-pilot.vercel.app`

---

### Option 2: Vercel CLI

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
vercel --prod
```

4. **Add environment variables when prompted**, or add them later via dashboard

---

## Environment Variables Setup (Detailed)

### In Vercel Dashboard:

1. Go to your project: https://vercel.com/yourusername/paperpilot
2. Click "Settings" tab
3. Click "Environment Variables" in left sidebar
4. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `GROQ_API_KEY` | `gsk_your_actual_key` | Production, Preview, Development |
| `ALPACA_PAPER_API_KEY` | `your_alpaca_key` | Production, Preview, Development |
| `ALPACA_PAPER_API_SECRET` | `your_alpaca_secret` | Production, Preview, Development |

5. **Important**: After adding env vars, go to "Deployments" tab and click "Redeploy" on the latest deployment

---

## Getting API Keys

### 1. Groq API Key (Required)
- Go to: https://console.groq.com/keys
- Sign up for free account
- Click "Create API Key"
- Copy the key (starts with `gsk_`)
- Free tier includes:
  - 250K tokens per minute
  - 14,400 requests per day
  - No credit card required

### 2. Alpaca Paper Trading (Optional)
- Go to: https://app.alpaca.markets/signup
- Create free paper trading account
- Go to dashboard → "Your API Keys"
- Generate paper trading keys
- Copy both API Key and Secret Key

---

## Vercel Build Configuration

The `vercel.json` file is already configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**No additional configuration needed!**

---

## Custom Domain (Optional)

1. Go to project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS setup instructions
5. Your app will be live at your domain in ~10 minutes

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Common issue: Missing dependencies
  - Solution: Run `npm install` locally and commit `package-lock.json`

### Environment Variables Not Working
- Make sure variables are added for "Production" environment
- Click "Redeploy" after adding variables
- Check runtime logs in Vercel dashboard

### AI Scan Fails in Production
- Verify `GROQ_API_KEY` is correctly set in Vercel
- Check Groq console for quota/rate limits
- Test API key locally first

### Rate Limit Errors
- Groq free tier: 250K tokens/min
- Agent makes 4 calls per cycle (3 agents + judge)
- Each cycle is 50-60 seconds apart (naturally avoids rate limits)
- If hitting limits: slightly increase `minimumRequestIntervalMs` in route

---

## Performance Optimization

Vercel automatically handles:
- ✅ CDN caching for static assets
- ✅ Edge functions for API routes
- ✅ Automatic HTTPS
- ✅ Image optimization
- ✅ Analytics

No additional config needed!

---

## Monitoring

### Built-in Vercel Analytics
- Go to project → "Analytics" tab
- View page views, load times, and errors

### Check AI Agent Logs
1. Go to project → "Deployments"
2. Click on your deployment
3. Click "Runtime Logs"
4. Filter for `/api/paper-agent/decision` to see AI decisions

---

## Updating Your Deployment

### Automatic (with GitHub integration):
```bash
git add .
git commit -m "Update: improved agent prompts"
git push
```
Vercel auto-deploys on every push to `main` branch!

### Manual (with Vercel CLI):
```bash
vercel --prod
```

---

## Production Checklist

Before going live, ensure:

- ✅ All environment variables are set in Vercel
- ✅ `.env.local` is in `.gitignore` (DON'T commit secrets!)
- ✅ Groq API key is valid and has quota remaining
- ✅ Test the app locally with `npm run build && npm start`
- ✅ README.md has your actual GitHub repo URL
- ✅ Update ALPACA_PAPER_API_KEY if you want real Alpaca orders

---

## Cost Breakdown

| Service | Tier | Cost |
|---------|------|------|
| Vercel Hosting | Hobby | **FREE** |
| Groq AI | Free | **FREE** (250K tok/min) |
| Alpaca Paper | Free | **FREE** (unlimited paper trades) |
| **Total** | | **$0/month** 🎉 |

---

## Support

If you encounter issues:
1. Check Vercel build logs
2. Check browser console for errors
3. Check Groq console for API quota
4. Test locally first: `npm run dev`

---

## 🎯 Hackathon Pro Tips

1. **Deploy early** - Don't wait until last minute
2. **Test live URL** - Share with judges/teammates
3. **Enable Vercel Analytics** - Shows real usage stats
4. **Custom domain** - Makes it look more professional (optional)
5. **Monitor logs** - Catch errors before demo

---

**Your deployment should take < 5 minutes!** 🚀

Questions? Check Vercel docs: https://vercel.com/docs
