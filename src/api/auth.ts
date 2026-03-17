import { api, setToken, clearToken, hasToken } from "./client";

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
}

type AuthChangeCallback = (event: string, session: AuthSession | null) => void;

let _session: AuthSession | null = null;
let _listeners: AuthChangeCallback[] = [];

function notifyListeners(event: string, session: AuthSession | null) {
  _session = session;
  _listeners.forEach((cb) => cb(event, session));
}

export const authApi = {
  async getSession(): Promise<{ data: { session: AuthSession | null } }> {
    if (!hasToken()) return { data: { session: null } };
    const { data, error } = await api<{ user: AuthUser; token: string }>("/api/auth/me");
    if (error || !data) {
      clearToken();
      _session = null;
      return { data: { session: null } };
    }
    _session = { user: data.user, access_token: data.token };
    return { data: { session: _session } };
  },

  onAuthStateChange(callback: AuthChangeCallback) {
    _listeners.push(callback);
    // Immediately check current state
    if (hasToken()) {
      authApi.getSession().then(({ data }) => {
        callback("INITIAL_SESSION", data.session);
      });
    } else {
      setTimeout(() => callback("INITIAL_SESSION", null), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            _listeners = _listeners.filter((l) => l !== callback);
          },
        },
      },
    };
  },

  async signInWithPassword(credentials: { email: string; password: string }) {
    const { data, error } = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
    if (error) return { error: { message: error.message } };
    if (data) {
      setToken(data.token);
      notifyListeners("SIGNED_IN", { user: data.user, access_token: data.token });
    }
    return { error: null };
  },

  async signUp(params: { email: string; password: string; options?: any }) {
    const { data, error } = await api<{ message: string }>("/api/auth/signup", {
      method: "POST",
      body: {
        email: params.email,
        password: params.password,
        full_name: params.options?.data?.full_name,
      },
    });
    if (error) return { error: { message: error.message } };
    return { error: null };
  },

  async signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    notifyListeners("SIGNED_OUT", null);
  },

  async updateUser(params: { password?: string }) {
    const { error } = await api("/api/auth/update", { method: "PUT", body: params });
    if (error) return { error: { message: error.message } };
    return { error: null };
  },

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    const { error } = await api("/api/auth/reset-password", {
      method: "POST",
      body: { email, redirectTo: options?.redirectTo },
    });
    if (error) return { error: { message: error.message } };
    return { error: null };
  },
};
