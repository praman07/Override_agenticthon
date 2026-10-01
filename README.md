# Override AI (Next.js App Router Migration)

Full-stack ChatGPT clone migrated from Express + Vite MERN architecture to a unified Next.js App Router application.

## Migration Architecture

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19 + Tailwind CSS + Redux Toolkit
- **Backend**: Next.js Route Handlers (`app/api/*`)
- **Database**: MongoDB + Mongoose with connection caching for serverless environments
- **Auth**: JWT stored in HTTP-Only cookies with client-side multi-account session management
- **AI Streaming**: Server-Sent Events (`text/event-stream`) streaming responses chunk by chunk
- **File Parsing**: Mistral OCR + Local fallback parsers (PDF, DOCX, PPTX)
- **Vector DB Ready**: Server-side vector interface in `src/lib/vector.js` for subsequent RAG phase

## Directory Structure

```text
next-app/
├── public/                 # Favicons and SVG asset files
├── src/
│   ├── app/
│   │   ├── (auth)/         # Auth route group (login, register)
│   │   ├── (dashboard)/    # Chat interface with sidebar
│   │   ├── api/            # API Route Handlers
│   │   │   ├── auth/       # register, login, logout, me, switch
│   │   │   ├── conversation/ # chat CRUD, SSE streaming, pin, rename
│   │   │   └── health/     # health check
│   │   ├── globals.css     # Global styles & markdown formatting
│   │   └── layout.js       # Root layout with providers & session bootstrap
│   ├── components/         # Providers and AuthBootstrap
│   ├── features/           # Auth and Chat domain features (state, hooks, UI)
│   ├── lib/
│   │   ├── auth.js         # JWT signing & session helpers
│   │   ├── env.js          # Server environment variable parser
│   │   ├── mongodb.js      # Cached Mongoose connection
│   │   └── vector.js       # Vector DB service interface
│   ├── models/             # Mongoose schemas (User, Conversation, Message, Context)
│   ├── services/           # AI streaming & document parsing services
│   └── store.js            # Redux Toolkit store
├── .env.example            # Environment variables specification
└── package.json
```

## Environment Variables

Copy `.env.example` to `.env.local` inside `next-app/`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/genai_chatgpt
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
COOKIE_NAME=token
GEMINI_API_KEY=
MISTRALAI_API_KEY=
```

## Running the Application

```bash
cd next-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Building for Production

```bash
npm run build
npm start
```
