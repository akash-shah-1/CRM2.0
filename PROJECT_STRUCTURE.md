# Project Structure

The project follows a feature-based architecture to ensure scalability and maintainability.

```text
src/
  assets/            # Static assets like images, icons, and global fonts
  components/        # Shared components
    common/          # Higher-level shared components (e.g., Layout elements)
    ui/              # Atomic UI components (Buttons, Inputs, Modals)
  features/          # Domain-specific modules
    auth/            # Login, registration, password recovery
    dashboard/       # Main overview and KPIs
    clients/         # Client profiles and management
    teams/           # Employee management and roles
    projects/        # Task tracking and timelines
    calendar/        # Scheduling and event management
    notes/           # Personal and project-specific notes
    documents/       # File storage and management
    credentials/     # Secure vault for API keys and logins
    email/           # Internal email client/module
    chat/            # Team and project-based messaging
    notifications/   # In-app alerts and activities
    settings/        # User profiles and app configuration
  hooks/             # Global reusable custom hooks
  layouts/           # Page layouts (e.g., DashboardLayout, AuthLayout)
  pages/             # Top-level page components for routing
  routes/            # Route definitions and navigation logic
  services/          # API services and external integrations (Firebase/GenAI)
  store/             # State management (Context, Redux, or Zustand)
  utils/             # Utility functions and helpers
  constants/         # Global constants and configuration
  types/             # TypeScript interfaces and enums
```

## Naming Conventions
- **Components**: PascalCase (e.g., `ClientCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Features/Folders**: kebab-case (e.g., `feature-auth`)
- **Files**: PascalCase for components, camelCase for logic/hooks.
- **Variables/Functions**: camelCase.
- **Types/Interfaces**: PascalCase (e.g., `UserRecord.ts`).
