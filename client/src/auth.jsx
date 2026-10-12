import { createContext, useContext, useState, useEffect } from 'react';
import { serverLogin, serverCurrentUser, serverLogout } from './api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serverCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const loggedInUser = await serverLogin(email, password);
    setUser(loggedInUser);
  };

  const logout = () => {
    serverLogout();
    setUser(null);
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
