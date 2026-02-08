# 🚀 Deployment to Render - Complete Guide

## Status
✅ **Code pushed to GitHub**
- Latest commit: Image publishing with Unsplash integration
- Ready for Render deployment

## Step 1: Set Up Render Service

1. Go to [render.com](https://render.com)
2. Sign in with GitHub account
3. Click **"New +"** → **"Web Service"**
4. Select repository: **sofievpdev/SMM_bot**
5. Fill in settings:
   - **Name:** `smm-bot` (or your preference)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free or Paid (Free tier works for testing)

## Step 2: Set Environment Variables

Click **"Environment"** and add ALL these variables:

```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_API_ID=your_api_id_from_my.telegram.org
TELEGRAM_API_HASH=your_api_hash_from_my.telegram.org
TELEGRAM_PHONE=your_phone_number

TARGET_CHANNEL_1=@sofismm22
TARGET_CHANNEL_2=@sofiesmm

CLAUDE_API_KEY=your_claude_api_key

SMM_MEDIA_API_KEY=your_smm_media_key

UNSPLASH_ACCESS_KEY=A8k-d48mvVznQdOdJcO5k9KN_2I3r7DzVBHhthfuVZA

NODE_ENV=production

PUBLISH_TIMES=["08:00","19:00"]
```

### ⚠️ Important Variables

**UNSPLASH_ACCESS_KEY:** (Already configured)
```
A8k-d48mvVznQdOdJcO5k9KN_2I3r7DzVBHhthfuVZA
```

**SMM_MEDIA_API_KEY:** (Your reactions boost API)
```
phz6vfCCFo9WehwJ4P9OcUIBXaDHMePg1VzNhgY22UZYUYfjEgL7tzZPIFOhgADF3L9VxKp4f9qNz8t7TA2k1Nes2j
```

**CLAUDE_API_KEY:** (Your Anthropic API key)
```
Get from: https://console.anthropic.com
```

**TELEGRAM_BOT_TOKEN:** (From @BotFather)
```
Get from: https://t.me/BotFather → /newbot
```

## Step 3: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Start the bot
   - Keep it running 24/7

## Step 4: Monitor Logs

1. Go to your service dashboard on Render
2. Click **"Logs"** to see real-time output
3. Check for:
   - `✓ Bot initialized successfully`
   - `Testing publish cycle in 5 seconds...`
   - Scheduled posts at 08:00 and 19:00 Cyprus time

## 📊 Workflow After Deployment

Every day at **08:00** and **19:00 (Cyprus Time UTC+2)**:

```
Schedule triggered
    ↓
Determine day theme (Mon=oncology, Tue=nutrition, etc.)
    ↓
Scrape articles from 9 sources
    ↓
Translate EN → RU
    ↓
Generate professional post (Claude AI)
    ↓
Search for image (Unsplash by theme + title)
    ↓
Publish to Telegram
    ├─ With image: sendPhoto API
    └─ Fallback to text: sendMessage API
    ↓
Boost 20 reactions via SMM.media
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not starting | Check all env variables are filled in |
| No posts published | Check Telegram bot is admin in channels |
| Images not showing | Verify UNSPLASH_ACCESS_KEY is valid |
| Reactions not added | Check SMM_MEDIA_API_KEY and balance |
| Wrong publish time | Verify Cyprus timezone (UTC+2) and PUBLISH_TIMES format |

## 📝 Publishing Times

Bot publishes at **08:00** and **19:00 Cyprus Time (UTC+2)**

To change times, update on Render:
- Find `PUBLISH_TIMES` environment variable
- Change to: `["HH:MM","HH:MM"]` (24-hour format)
- Example: `["06:00","18:00"]` for 6am and 6pm

## 🔄 Updates & Redeployment

To update the bot after making changes:

```bash
# Local development
git add .
git commit -m "Your changes"
git push origin main

# Render automatically redeploys within seconds
# Check logs to confirm deployment
```

## 💾 Backup & Monitoring

- **Logs:** Visible in Render dashboard
- **GitHub:** All code backed up automatically
- **Database:** None (stateless bot)

## 📞 Support

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Telegram Bot API:** [core.telegram.org/bots/api](https://core.telegram.org/bots/api)
- **Claude API Docs:** [docs.anthropic.com](https://docs.anthropic.com)

---

**✅ Your bot is ready for production!** 🎉
