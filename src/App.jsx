import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Appointments from './pages/Appointments';
import Financial from './pages/Financial';
import Products from './pages/Products';
import Registers from './pages/Registers';

// Rota protegida
function RotaProtegida({ children }) {
  const { autenticado } = useAuth();
  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="page-layout">
      <Sidebar />
      <main className="page-content">{children}</main>
    </div>
  );
}

// Rota de login (redireciona se já logado)
function RotaLogin() {
  const { autenticado } = useAuth();
  if (autenticado) {
    return <Navigate to="/agendamentos" replace />;
  }
  return <Login />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RotaLogin />} />
          <Route
            path="/agendamentos"
            element={
              <RotaProtegida>
                <Appointments />
              </RotaProtegida>
            }
          />
          <Route
            path="/financeiro"
            element={
              <RotaProtegida>
                <Financial />
              </RotaProtegida>
            }
          />
          <Route
            path="/produtos"
            element={
              <RotaProtegida>
                <Products />
              </RotaProtegida>
            }
          />
          <Route
            path="/cadastros"
            element={
              <RotaProtegida>
                <Registers />
              </RotaProtegida>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
