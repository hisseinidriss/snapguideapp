// Authentication context - SnapGuide
import { createContext, useContext, ReactNode } from "react";

interface AuthContextType {
  session: { user: { email: string } };
  user: { email: string };
  loading: false;
  signOut: () => Promise<void>;
}

const mockUser = { email: "user@snapguide.app" };
const mockSession = { user: mockUser };

const AuthContext = createContext<AuthContextType>({
  session: mockSession,
  user: mockUser,
  loading: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AuthContext.Provider value={{ session: mockSession, user: mockUser, loading: false, signOut: async () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};
