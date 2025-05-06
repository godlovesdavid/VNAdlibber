# Architecture Documentation

## Overview

This application is a Visual Novel creation platform that leverages AI technologies for content generation. It enables users to create, save, and share visual novel experiences through a guided, step-by-step process with AI assistance for generating plots, characters, and images.

The application follows a modern client-server architecture with a clear separation between frontend and backend. It uses React for the frontend, Express.js for the backend API, PostgreSQL for data persistence, and integrates with multiple AI services for content generation.

## System Architecture

The system follows a typical three-tier architecture:

1. **Presentation Layer**: React-based single-page application (SPA) with a component-based UI system using shadcn/ui components
2. **Application Layer**: Express.js server handling API requests, AI integration, and business logic
3. **Data Layer**: PostgreSQL database accessed via Drizzle ORM for data persistence

### Key Architecture Decisions

- **Monorepo Structure**: The codebase is organized as a monorepo with client, server, and shared code, facilitating code sharing while maintaining clear boundaries
- **Server-Side Rendering**: The application uses a hybrid approach with client-side React combined with server-side Vite integration
- **API-First Backend**: The server primarily serves as a REST API that the client consumes
- **AI Integration**: External AI services (Google's Gemini, Anthropic's Claude) are used for text generation
- **Schema Sharing**: Database schema definitions are shared between client and server to ensure type safety
- **Serverless Database**: Uses Neon's serverless PostgreSQL database for scalability and ease of management

## Key Components

### Frontend

- **React SPA**: Single-page application built with React
- **TailwindCSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Component library built on Radix UI for accessible UI components
- **React Query**: Data fetching and state management
- **wouter**: Lightweight router for navigation
- **Context API**: For global state management (visual novel context, ad context)

### Backend

- **Express.js**: Web server framework for handling HTTP requests
- **API Routes**: RESTful API endpoints for CRUD operations and AI generation requests
- **Image Generation**: Integration with RunPod for AI image generation
- **Text Generation**: Integration with Google's Gemini API for text content
- **Database Connection**: Connection to PostgreSQL via Drizzle ORM and Neon's serverless client

### Data Storage

- **PostgreSQL**: Primary database for storing user data, projects, and stories
- **Drizzle ORM**: Type-safe database toolkit for TypeScript
- **Schema Design**: Well-defined schema for users, visual novel projects, and stories
- **Memory Storage Option**: Fallback in-memory storage implementation for development/testing

### Shared Code

- **TypeScript Types**: Shared type definitions between frontend and backend
- **Schema Validation**: Zod schemas for validation across the stack
- **Database Schema**: Common schema definitions using Drizzle

## Data Flow

1. **Creation Flow**:
   - User progresses through a sequential step-by-step form process (basic → concept → characters → paths → plot → generation)
   - Each step saves data to the context and optionally to the database
   - AI generation requests are sent to the backend which proxies to external AI services

2. **Playing Flow**:
   - User selects a story to play
   - Story data is loaded from the database
   - The visual novel player renders scenes, dialogue, and choices
   - Player progress and choices are tracked in context

3. **Sharing Flow**:
   - Users can share their visual novels via generated links
   - Shared stories are publicly accessible via a share ID

## External Dependencies

### AI Services
- **Google Gemini**: Used for text generation (story plots, characters, dialogue)
- **Anthropic's Claude**: Alternative AI model for text generation
- **RunPod**: For AI image generation of scene backgrounds

### Infrastructure
- **Neon Database**: Serverless PostgreSQL database
- **Replit**: Development and deployment platform

## Deployment Strategy

The application is configured for deployment on Replit with the following approach:

1. **Build Process**:
   - Frontend: Vite builds the React application into static assets
   - Backend: ESBuild compiles TypeScript server code to JavaScript
   - The Express server serves both the API and the static frontend assets

2. **Runtime Configuration**:
   - Environment variables for database connections and API keys
   - Different configurations for development and production environments

3. **Database Management**:
   - Database migrations using Drizzle Kit
   - Connection to Neon's serverless PostgreSQL instance

4. **Scaling Considerations**:
   - The application is designed for autoscaling on Replit
   - Serverless database allows for on-demand scaling
   - Short-lived image generation tasks are offloaded to external services

## Security Considerations

- **API Key Management**: External service keys are stored as environment variables
- **Input Validation**: Form inputs are validated on both client and server sides
- **Rate Limiting**: API endpoints implement rate limiting to prevent abuse
- **Content Moderation**: AI-generated content includes constraints to ensure appropriate content

## Future Architectural Considerations

- **Authentication**: Adding user authentication for personalized experiences
- **Caching**: Implementing caching for AI-generated content to reduce API costs
- **Offline Support**: Adding PWA capabilities for offline story playing
- **Advanced Analytics**: Tracking user engagement with the created stories