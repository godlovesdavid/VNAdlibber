# Architecture Documentation

## 1. Overview

This repository contains a full-stack web application for creating AI-generated visual novels. The application allows users to define basic information about their visual novel, develop concepts, create characters, establish paths, plot out the story, and finally generate the complete visual novel. The generated visual novels can be played within the application and shared with others.

The application follows a client-server architecture with React on the frontend and Express.js on the backend. It integrates with AI services for content generation and uses a PostgreSQL database for persistent storage.

## 2. System Architecture

The system follows a modern web application architecture with distinct frontend and backend components:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Frontend ├────────►│  Express Server ├────────►│  PostgreSQL DB  │
│                 │         │                 │         │                 │
└────────┬────────┘         └────────┬────────┘         └─────────────────┘
         │                           │                            
         │                           │                            
         ▼                           ▼                            
┌─────────────────┐         ┌─────────────────┐                   
│                 │         │                 │                   
│   TailwindCSS   │         │   AI Services   │                   
│   UI Components │         │   (Gemini API)  │                   
│                 │         │                 │                   
└─────────────────┘         └─────────────────┘                   
```

### Key Architectural Patterns

1. **Model-View-Controller (MVC)**: The application separates data models (Drizzle schema), views (React components), and controllers (Express routes).

2. **Component-Based Architecture**: The frontend is built using reusable React components, promoting modularity and maintainability.

3. **RESTful API**: The backend provides RESTful endpoints for the frontend to interact with database resources.

4. **Context API for State Management**: React's Context API is used for global state management instead of Redux or other state management libraries.

## 3. Key Components

### 3.1 Frontend (Client)

The frontend is built with React and organized in a feature-based directory structure:

- **src/components/**: Contains reusable UI components, including shadcn/ui components
- **src/context/**: Contains React Context providers for state management
- **src/hooks/**: Custom React hooks for shared functionality
- **src/lib/**: Utility functions and service integrations
- **src/pages/**: Page components corresponding to different routes
- **src/types/**: TypeScript type definitions

Key design patterns:
- Use of React hooks and functional components
- Context API for state management
- Component composition for UI building

### 3.2 Backend (Server)

The backend is built with Express.js and provides:
- API endpoints for data operations
- Integration with AI services for content generation
- Static file serving
- Database interactions

Key components:
- **server/index.ts**: The main entry point for the Express server
- **server/routes.ts**: API route definitions
- **server/db.ts**: Database connection setup
- **server/storage.ts**: Data access layer
- **server/image-generator.ts**: Service for generating images using AI

### 3.3 Data Model

The data model is defined using Drizzle ORM in the `shared/schema.ts` file:

- **users**: User accounts for authentication
- **vnProjects**: Visual novel projects with stages of development
- **vnStories**: Exported stories for playback

The schema uses PostgreSQL-specific types and supports complex JSON data storage for different stages of the visual novel creation process.

### 3.4 AI Integration

The application integrates with Google's Gemini API for text generation and RunPod API for image generation:

- Text generation uses Gemini 2.0 Flash Lite or Gemini 2.5 Flash Preview models
- Image generation leverages Stable Diffusion via RunPod

## 4. Data Flow

### 4.1 Visual Novel Creation Flow

1. **Basic Information**: Users define the theme, tone, genre, and setting.
2. **Concept Development**: Users create or generate a title, tagline, and premise.
3. **Character Creation**: Users define or generate characters with personalities, appearances, etc.
4. **Path Definition**: Users create branching story paths and relationships.
5. **Plot Development**: Users outline the story structure across multiple acts.
6. **VN Generation**: The system uses AI to generate complete visual novel scenes.

### 4.2 API Communication Flow

1. Frontend components make requests to backend API endpoints
2. Backend validates requests and interacts with the database
3. For content generation, backend calls AI services
4. Results are returned to the frontend for rendering

### 4.3 Data Persistence Flow

1. VN project data is stored in the context state during editing
2. Data is persisted to the database when explicitly saved
3. Generated stories are stored separately from projects for sharing

## 5. External Dependencies

### 5.1 UI Framework and Components

- **TailwindCSS**: For utility-first styling
- **shadcn/ui**: Component library based on Radix UI
- **Lucide Icons**: For iconography

### 5.2 State Management and Data Fetching

- **React Context API**: For global state management
- **TanStack Query (React Query)**: For data fetching and cache management

### 5.3 Database and ORM

- **PostgreSQL**: Primary database
- **Drizzle ORM**: Type-safe database toolkit
- **Neon Serverless Postgres**: For serverless PostgreSQL connection

### 5.4 AI Services

- **Google Generative AI (Gemini)**: For text generation
- **RunPod AI**: For image generation

### 5.5 Build Tools

- **Vite**: For frontend build and development
- **TypeScript**: For type safety
- **ESBuild**: For server-side code bundling

## 6. Deployment Strategy

The application is configured for deployment on Replit with the following strategy:

### 6.1 Development Environment

- **Development Mode**: Uses Vite's development server with HMR
- **Database**: Connects to a provisioned PostgreSQL instance
- **Ports**: Serves the application on port 5000

### 6.2 Production Build

The build process:
1. Builds the frontend using Vite (`vite build`)
2. Bundles the server using ESBuild
3. Outputs to the `dist` directory

### 6.3 Production Deployment

- **Deployment Target**: Autoscale on Replit
- **Build Command**: `npm run build`
- **Run Command**: `npm run start`
- **Port Mapping**: Maps internal port 5000 to external port 80

### 6.4 Database Management

- Uses Drizzle Kit for schema migrations (`drizzle-kit push`)
- Connects to a Neon PostgreSQL database via connection string

## 7. Future Considerations

### 7.1 Authentication Improvements

The current authentication system is basic. Future improvements could include:
- OAuth integration for social login
- JWT-based authentication
- Session management improvements

### 7.2 Scaling Considerations

For scaling the application:
- Implement caching layer for AI-generated content
- Add rate limiting for AI service usage
- Optimize database queries for larger datasets

### 7.3 Monitoring and Logging

Adding structured logging and monitoring would improve operational visibility:
- Error tracking service integration
- Performance monitoring
- Usage analytics