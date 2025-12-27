# RACING SIM

## Overview

A retro-styled 3D racing game built with React, Three.js, and Express. The application features a neon arcade aesthetic with a split-screen layout showing a 3D game view alongside a real-time telemetry dashboard. Players can race on a circular track while adjusting car settings and competing for best lap times, which are persisted to a PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **3D Rendering**: Three.js via @react-three/fiber and @react-three/drei for declarative 3D scene composition
- **State Management**: Zustand for lightweight game state (telemetry, car settings) outside React's render cycle
- **Routing**: Wouter for minimal client-side routing
- **Data Fetching**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom neon/arcade theme variables, shadcn/ui component library (New York style)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints defined in shared route definitions with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Project Structure
```
client/           # Frontend React application
  src/
    components/   # UI components (shadcn/ui + custom)
    game/         # Game logic (RacingGame, GameStore)
    hooks/        # Custom React hooks
    pages/        # Route pages
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route handlers
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared code between client/server
  schema.ts       # Drizzle database schema
  routes.ts       # API route definitions with Zod schemas
```

### Design Patterns
- **Shared Route Definitions**: API routes defined once in `shared/routes.ts` with Zod schemas for type-safe client-server communication
- **Repository Pattern**: `storage.ts` abstracts database operations behind an interface
- **Component Composition**: shadcn/ui provides unstyled, accessible primitives customized with Tailwind

### Key Game Components
- **GameStore (Zustand)**: Manages car settings (horsepower, traction control, drive mode) and real-time telemetry (speed, gear, RPM, lap times)
- **RacingGame**: Three.js canvas component with car physics, track rendering, and camera follow
- **Dashboard**: Real-time display of telemetry data and car configuration controls

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema defined in `shared/schema.ts`, migrations in `/migrations`
- **Schema**: `lap_times` table storing lap time records (id, lapTimeMs, displayTime, createdAt)

### Key NPM Packages
- **Three.js ecosystem**: three, @react-three/fiber, @react-three/drei for 3D graphics
- **UI**: Radix UI primitives, class-variance-authority, tailwind-merge
- **Server**: express, connect-pg-simple for sessions, drizzle-orm/drizzle-kit
- **Validation**: Zod with drizzle-zod for schema-to-validation integration

### Fonts (External)
- Press Start 2P (arcade style)
- Fira Code (monospace)
- Inter (sans-serif)
- DM Sans, Geist Mono (additional options)

### Development Tools
- **Replit Plugins**: vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner for enhanced development experience