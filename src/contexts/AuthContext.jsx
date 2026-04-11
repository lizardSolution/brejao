import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const usuarioSalvo = sessionStorage.getItem('gmscheduler_auth');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
    }
    setCarregando(false);
  }, []);

  const login = async (email, senha) => {
    setCarregando(true);
    try {
      const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3000' : '';
      const response = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro no login');
      }

      setUsuario(data);
      sessionStorage.setItem('gmscheduler_auth', JSON.stringify(data));
      return { sucesso: true };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    } finally {
      setCarregando(false);
    }
  };

  const logout = () => {
    setUsuario(null);
    sessionStorage.removeItem('gmscheduler_auth');
  };

  const value = {
    usuario,
    autenticado: !!usuario,
    login,
    logout,
    carregando
  };

  return (
    <AuthContext.Provider value={value}>
      {!carregando && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
