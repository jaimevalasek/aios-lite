---
name: landing-page-deploy
description: Deploy workflows for landing pages and static sites — Vercel (Git-connected, CDN) and Hostinger VPS (LiteSpeed). Load when the user asks to deploy a site or when project_type=site is ready for production.
---

# Landing Page Deploy

Two production-ready deploy paths. Choose based on where your domain is registered and your cost preference.

---

## Path A — Vercel (recommended for Cloudflare domains + automated CI/CD)

**Requirements:**
- Vercel account (Pro plan minimum — $20/mo — for custom domain on production)
- Domain registered in Cloudflare (or any DNS provider with CNAME/A record access)
- Git repository (GitHub, GitLab, or Bitbucket)

### Step A1 — Create Vercel project
```bash
# If Vercel CLI is installed
vercel login
vercel --prod
```

Or via dashboard: vercel.com → New Project → Import Git Repository

### Step A2 — Configure project settings
- Framework Preset: `Other` (for plain HTML) or the correct framework
- Build Command: leave blank for plain HTML
- Output Directory: `.` or `dist` (wherever index.html lives)
- Install Command: leave blank for plain HTML

### Step A3 — Connect domain (Cloudflare DNS)
1. In Vercel: Settings → Domains → Add `yourdomain.com` and `www.yourdomain.com`
2. Vercel shows you DNS records to add
3. In Cloudflare: DNS → Add records as shown by Vercel
   - Type A: `@` → Vercel IP (proxied OFF — orange cloud OFF for Vercel)
   - Type CNAME: `www` → `cname.vercel-dns.com`
4. Wait for propagation (5–30 min)

### Step A4 — Verify SSL
Vercel auto-provisions SSL via Let's Encrypt. Verify:
- `https://yourdomain.com` loads without warnings
- `https://www.yourdomain.com` redirects correctly

### Step A5 — Set environment variables (if needed)
Vercel Dashboard → Settings → Environment Variables
Add tracking IDs, API keys as env vars — never hardcode them.

### Step A6 — Post-deploy validation checklist
- [ ] Production URL loads correctly
- [ ] SSL certificate active (green padlock)
- [ ] www → non-www redirect working (or vice versa — consistent)
- [ ] Preview URL from Vercel PR/branch works
- [ ] Analytics receiving data (Vercel Analytics or GA)
- [ ] Meta Pixel fires on production URL (verify with Pixel Helper)
- [ ] GTM fires on production URL (verify with Tag Assistant)
- [ ] Test UTM: `https://yourdomain.com?utm_source=test` → check sessionStorage

### Vercel MCP integration (for automated deploy from Claude Code)
If the Vercel MCP is configured in Claude Code:
```
# Deploy current project to Vercel production
vercel deploy --prod
```
Claude Code can trigger deploys directly via MCP without leaving the session.

---

## Path B — Hostinger VPS (recommended for BRL billing + Brazilian users)

**Requirements:**
- Hostinger VPS plan (R$29.90+/mo, includes free domain on some plans)
- Domain registered in Hostinger (or any DNS provider)
- SSH access to the VPS

### Step B1 — Prepare VPS
```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install LiteSpeed (or use OpenLiteSpeed — pre-installed on some plans)
# Check if already installed
litespeed -v

# Create site directory
mkdir -p /var/www/yourdomain.com/public_html
```

### Step B2 — Upload site files
```bash
# From local machine — upload entire site folder
scp -r ./dist/* root@YOUR_VPS_IP:/var/www/yourdomain.com/public_html/

# Or use rsync for incremental updates
rsync -avz --delete ./dist/ root@YOUR_VPS_IP:/var/www/yourdomain.com/public_html/
```

### Step B3 — Configure virtual host (LiteSpeed)
Via Hostinger hPanel → Websites → Add Website → point to your folder.

Or via CLI if you have direct LiteSpeed access:
```
# /usr/local/lsws/conf/vhosts/yourdomain.com/vhconf.conf
docRoot /var/www/yourdomain.com/public_html/
```

### Step B4 — SSL certificate
```bash
# Using Let's Encrypt via certbot
apt install certbot python3-certbot-apache -y
certbot --apache -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

Or use Hostinger's built-in SSL (hPanel → SSL → Free SSL).

### Step B5 — Set up domain DNS
In Hostinger hPanel → Domains → DNS Zone:
- Type A: `@` → your VPS IP
- Type A: `www` → your VPS IP

Or in Cloudflare if domain is there:
- Type A: `@` → VPS IP (proxied ON for DDoS protection)
- Type A: `www` → VPS IP (proxied ON)

### Step B6 — Start web service
```bash
# LiteSpeed
service lsws start

# Verify site is accessible
curl -I https://yourdomain.com
```

### Step B7 — Post-deploy validation checklist
- [ ] Production URL loads correctly
- [ ] SSL active (no mixed content warnings)
- [ ] PageSpeed score ≥ 90 (LiteSpeed cache helps significantly)
- [ ] `curl -I https://yourdomain.com` returns `200 OK`
- [ ] Meta Pixel fires on production URL
- [ ] GTM fires on production URL
- [ ] UTM capture working end-to-end
- [ ] Form submissions go to the correct endpoint

---

## Deploy decision matrix

| Factor | Vercel | Hostinger VPS |
|---|---|---|
| Domain in Cloudflare | ✓ Best | Works |
| Domain in Hostinger | Works | ✓ Best |
| Pay in BRL | ✗ USD only | ✓ BRL |
| Automated CI/CD | ✓ Git-push deploys | Manual rsync |
| MCP integration | ✓ Available | SSH only |
| Serverless functions | ✓ Edge functions | ✗ Not native |
| Cache/CDN | Vercel Edge Network | LiteSpeed cache |
| Cheapest option | $20/mo USD | R$29.90/mo BRL |
| Best for Brazilian users | Both | LiteSpeed + BR server |

---

## Deploy from within Claude Code (no manual steps)

### Vercel via MCP
If Vercel MCP is connected in Claude Code settings, the agent can deploy directly:
```
Deploy this project to Vercel production with domain yourdomain.com
```

### Hostinger via SSH
Claude Code can SSH into the VPS and run the deploy:
```bash
# The agent executes this sequence
ssh root@VPS_IP "cd /var/www/yourdomain.com/public_html && rm -rf *"
scp -r ./dist/* root@VPS_IP:/var/www/yourdomain.com/public_html/
ssh root@VPS_IP "service lsws restart"
```

### Post-deploy automated check
After any deploy, run:
```bash
curl -o /dev/null -s -w "%{http_code}" https://yourdomain.com
# Should return 200
```
