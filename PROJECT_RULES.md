# Coding Standards
- No single file > 800 lines: Keep components modular and focused.
- No business logic in UI components: Logic should be extracted to custom hooks or services.
- No inline API calls inside pages: Use dedicated service layers for data fetching.
- Reusable components mandatory: Avoid duplication; extract common UI patterns.
- Feature-based folders: Organize by domain (e.g., auth, projects) rather than just technical type.

# React Standards
- Functional components: Use hooks and modern React patterns.
- Hooks: Prefer custom hooks for complex state or side effects.
- Lazy loading: Use React.lazy and Suspense for route-based code splitting.
- Reusable forms: Implement agnostic form components to handle various inputs.

# UI Rules
- Minimal: Avoid clutter; focus on essential information.
- Professional: Use a business-focused aesthetic (Technical/Minimal).
- Responsive: Ensure the app works perfectly on mobile (bottom nav) and desktop (sidebar).
- Sidebar desktop: Navigation is persistent on the left for wide screens.
- Bottom nav mobile: Quick access to core features on small screens.

# Performance Rules
- Code splitting: Split code at the route level to minimize initial bundle size.
- Optimized rendering: Use useMemo, useCallback, and React.memo where appropriate to prevent unnecessary re-renders.

# Architecture Rules
- Shared utilities centralized: Common helpers go in `src/utils`.
- Services separated: API interactions and external SDKs reside in `src/services`.
