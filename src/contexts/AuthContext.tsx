// Authentication context provider - manages user session state across the app (Hissein 3-21-2026)
// Currently uses a mock user for development; will be replaced with real auth integration
import { createContext, useContext, ReactNode } from "react";

// Type definition for the authentication context values
interface AuthContextType {
  session: { user: { email: string } };
  user: { email: string };
  loading: false;
  signOut: () => Promise<void>;
}

// Mock user object used during development - Hissein
const mockUser = { email: "user@walkthru.app" };
const mockSession = { user: mockUser };

// Create context with default mock values for unauthenticated access
const AuthContext = createContext<AuthContextType>({
  session: mockSession,
  user: mockUser,
  loading: false,
  signOut: async () => {},
});

// Hook for consuming auth context in child components (3-12-2026)
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app tree with authentication state
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthContext.Provider value={{ session: mockSession, user: mockUser, loading: false, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};