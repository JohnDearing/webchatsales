# WebChatSales Backend API

NestJS backend with OpenAI streaming, MongoDB, and Nodemailer integration.

## Environment Setup

Create a `.env` file in the backend directory with:

```env
# OpenAI Configuration (REQUIRED)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# MongoDB Configuration (REQUIRED)
MONGODB_URI=your_mongodb_connection_string_here

# Email Configuration (SMTP) - REQUIRED
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here

# Admin Email (Optional - falls back to SMTP_EMAIL)
ADMIN_EMAIL=your_admin_email@gmail.com

# Server Configuration
PORT=9000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Server URL (Optional)
SERVER_URL=http://localhost:9000
```

**⚠️ IMPORTANT:** Never commit your `.env` file to git. It contains sensitive API keys and credentials.

## Installation

```bash
cd backend
npm install
```

## Running the Server

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will run on `http://localhost:9000` (or the port specified in PORT env var)

## API Endpoints

### Chat Endpoints

- `POST /api/chat/start` - Start a new conversation
- `POST /api/chat/message` - Send a message (streaming response)
- `GET /api/chat/conversation/:sessionId` - Get conversation history
- `GET /api/chat/conversations` - Get all conversations
- `POST /api/chat/end` - End a conversation

### Email Endpoints

- `POST /api/email/send-beta-invite` - Send beta invite confirmation
- `POST /api/email/send-transcript` - Send conversation transcript

## Features

✅ OpenAI API integration (GPT-4o-mini or custom model)
✅ Real-time streaming responses
✅ MongoDB conversation storage
✅ Nodemailer email integration
✅ CORS enabled for frontend
✅ Session management
✅ Environment variable configuration (no hardcoded secrets)

## Install Abby on a Client Site

Contractors embed Abby with a single script tag. The widget loader lives at `/abby-widget.js` on the frontend (see `frontend/public/abby-widget.js`).

### Prerequisites

1. Client account status is **Test** or **Live** (Draft blocks the widget on external sites).
2. The client's domain is listed in **Allowed domains** (e.g. `theirbusiness.com`).
3. Use the **production** frontend URL in the embed — never `localhost` on a live site.

### Embed snippet

Replace `YOUR_FRONTEND_URL` and `CLIENT_WIDGET_KEY`:

```html
<script src="https://YOUR_FRONTEND_URL/abby-widget.js" data-widget-key="CLIENT_WIDGET_KEY"></script>
```

Production example (frontend + API on separate Vercel projects):

```html
<script
  src="https://www.webchatsales.com/abby-widget.js"
  data-widget-key="wcs_xxxxxxxx"
  data-api-url="https://webchatsales-swart.vercel.app"
></script>
```

Paste **before `</body>`** on every page (or in the site-wide footer).

### Optional: separate API host

If the backend is on a different domain than the frontend:

```html
<script
  src="https://webchatsales.com/abby-widget.js"
  data-widget-key="CLIENT_WIDGET_KEY"
  data-api-url="https://your-backend.vercel.app"
></script>
```

### Platform quick reference

| Platform | Where to paste |
|----------|----------------|
| **WordPress** | Plugin: WPCode / Insert Headers and Footers → Footer. Or `footer.php` before `</body>`. |
| **Custom HTML** | Before `</body>` in your template or `index.html`. |
| **Shopify** | Online Store → Themes → Edit code → `theme.liquid` before `</body>`. |
| **Wix** | Settings → Custom Code → Body end → All pages. |
| **Squarespace** | Settings → Advanced → Code Injection → Footer. |
| **Webflow** | Project Settings → Custom Code → Footer Code. |
| **React / Next.js** | Root layout or `public/index.html`, once before `</body>`. |

### Admin workflow

1. Client completes intake → review in dashboard.
2. Configure Abby prompts, domain, and notifications.
3. Set status to **Test** (staging) or **Live** (production).
4. Copy embed code from **Dashboard → Install Guide** or **Clients → Edit**.
5. Send code to the client; verify chat on their live domain.

### Widget API (public)

- `GET /api/widget/config?widgetKey=...` — theme/position for embed script
- `POST /api/widget/ping` — install detection when script loads on client domain

### Seed platform tenant

```bash
npm run seed:tenants
```

Ensures the webchatsales.com marketing site tenant is flagged and live.

