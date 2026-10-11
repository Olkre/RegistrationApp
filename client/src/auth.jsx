import { createContext, useContext, useState } from 'react';
import { serverLogin } from './api';
const AuthContext = createContext(null);

const sampleUser = { name: "Alex", email: "demo@t.com" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  const login = async (email, password) => {
    const loggedInUser = await serverLogin(email, password);
    setUser(loggedInUser);
  };

  const logout = () => {
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
