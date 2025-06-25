import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SESSION_COOKIE_NAME = "fiszki_session";

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Load current user from session on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            setCurrentUser(userData.user);
          }
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  // Helper function to set session cookie
  const setSessionCookie = (userId) => {
    const sessionData = { userId, timestamp: Date.now() };
    document.cookie = `${SESSION_COOKIE_NAME}=${JSON.stringify(sessionData)}; path=/; secure; samesite=strict; max-age=2592000`; // 30 days
  };

  // Helper function to clear session cookie
  const clearSessionCookie = () => {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  };

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCurrentUser(result.user);
        setSessionCookie(result.user.id);
        return { success: true, user: result.user };
      } else {
        setError(result.error || "Login failed");
        return { success: false, error: result.error || "Login failed" };
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error during login");
      return { success: false, error: "Network error during login" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setCurrentUser(null);
      setError(null);
      clearSessionCookie();
      router.push("/login");
      return true;
    } catch (err) {
      console.error("Logout error:", err);
      // Still clear local state even if API call fails
      setCurrentUser(null);
      setError(null);
      clearSessionCookie();
      router.push("/login");
      return false;
    }
  }, [router]);

  // Function to update user progress (e.g., after a session)
  const updateProgress = useCallback(
    async (studySetId, sessionStats, flashcardUpdates) => {
      if (!currentUser) return false;

      try {
        const requestBody = { studySetId, sessionStats };
        if (flashcardUpdates) {
          requestBody.flashcardUpdates = flashcardUpdates;
        }

        const response = await fetch("/api/auth/progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setCurrentUser(result.user);
            return true;
          }
        }
        return false;
      } catch (err) {
        console.error("Failed to update progress:", err);
        return false;
      }
    },
    [currentUser],
  );

  return {
    currentUser,
    loading,
    error,
    login,
    logout,
    updateProgress,
  };
};

export default useAuth;
