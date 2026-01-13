import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) return;
    initialized.current = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only update state synchronously
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // Clear any pending refresh timeout
        if (refreshTimeout.current) {
          clearTimeout(refreshTimeout.current);
          refreshTimeout.current = null;
        }

        // Schedule proactive token refresh before expiry (5 minutes before)
        if (currentSession?.expires_at) {
          const expiresAt = currentSession.expires_at * 1000;
          const refreshTime = expiresAt - Date.now() - 5 * 60 * 1000;
          
          if (refreshTime > 0) {
            refreshTimeout.current = setTimeout(() => {
              supabase.auth.refreshSession();
            }, refreshTime);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);

      // Schedule initial refresh if session exists
      if (existingSession?.expires_at) {
        const expiresAt = existingSession.expires_at * 1000;
        const refreshTime = expiresAt - Date.now() - 5 * 60 * 1000;
        
        if (refreshTime > 0) {
          refreshTimeout.current = setTimeout(() => {
            supabase.auth.refreshSession();
          }, refreshTime);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}