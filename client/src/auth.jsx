import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const sampleUser = { name: "Alex" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(sampleUser);
  const [loading, setLoading] = useState(true);


  const login = () => {
    setUser(sampleUser);
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
