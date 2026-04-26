import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const { login, carregando } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!email || !senha) {
      setErro('Preencha todos os campos');
      return;
    }

    const resultado = await login(email, senha);
    if (resultado.sucesso) {
      navigate('/agendamentos');
    } else {
      setErro(resultado.erro || 'Credenciais inválidas');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-orb"></div>
        <div className="login-bg-orb"></div>
        <div className="login-bg-orb"></div>
      </div>

      <div className="login-card">
        <div className="login-card-inner">
          <div className="login-logo" style={{ marginBottom: '16px' }}>
            <img 
              src="/img/logo.png" 
              alt="Logo Lizard Solutions" 
              style={{ display: 'block', margin: '0 auto 8px auto', width: '90px', height: 'auto', objectFit: 'contain', borderRadius: '12px' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="login-logo-icon" style={{ display: 'none' }}>LS</div>
            <h1 className="login-title">Lizard Solutions</h1>
            <p className="login-subtitle">Sistema de Gestão para Barbearia</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {erro && (
              <div className="login-error">
                <span>!</span>
                <span>{erro}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={carregando}
            >
              {carregando ? (
                <span className="login-btn-loading">
                  <span className="login-spinner"></span>
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Acesso demo: <strong>admin@barbearia.com</strong> / <strong>admin123</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}
