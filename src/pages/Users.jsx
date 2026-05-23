import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const MODULOS_DEFAULT = {
  cadastros: { acessar: true, incluir: true, alterar: true, excluir: true },
  agendamentos: { acessar: true, incluir: true, alterar: true, excluir: true },
  produtos: { acessar: true, incluir: true, alterar: true, excluir: true },
  financeiro: { acessar: true, incluir: true, alterar: true, excluir: true }
};

export default function Users() {
  const { usuario: user } = useAuth();
  const permMaster = user?.perfil === 'admin' ? MODULOS_DEFAULT : (user?.permissoes || MODULOS_DEFAULT);
  const perms = permMaster.cadastros || { acessar:false, incluir:false, alterar:false, excluir:false };

  const [usuarios, setUsuarios] = useState([]);
  
  const [modalUsuario, setModalUsuario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [alertMessage, setAlertMessage] = useState(null);
  
  const [formUsuario, setFormUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'comum', permissoes: MODULOS_DEFAULT });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const usu = await api.get('usuarios');
      setUsuarios(usu || []);
    } catch (e) {
      console.error('Erro ao buscar usuários:', e);
    }
  }

  function abrirModalUsuario(usuario = null) {
    if (usuario) {
      setEditandoId(usuario.id);
      setFormUsuario({ 
        nome: usuario.nome, 
        email: usuario.email, 
        senha: '', 
        perfil: usuario.perfil || 'comum',
        permissoes: usuario.permissoes ? { ...MODULOS_DEFAULT, ...usuario.permissoes } : MODULOS_DEFAULT
      });
    } else {
      setEditandoId(null);
      setFormUsuario({ nome: '', email: '', senha: '', perfil: 'comum', permissoes: MODULOS_DEFAULT });
    }
    setModalUsuario(true);
  }

  async function salvarUsuario(e) {
    e.preventDefault();
    if (!formUsuario.nome || !formUsuario.email) return;

    try {
      if (editandoId) {
        const atualizado = await api.put(`usuarios/${editandoId}`, formUsuario);
        setUsuarios(prev => prev.map(u => u.id === editandoId ? atualizado : u));
      } else {
        const criado = await api.post('usuarios', formUsuario);
        setUsuarios(prev => [...prev, criado]);
      }
      setModalUsuario(false);
    } catch(e) { setAlertMessage("Acesso Negado ou Erro"); console.error(e) }
  }

  function excluirUsuario(id) {
    setConfirmDelete({ isOpen: true, id });
  }

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    try {
      await api.delete(`usuarios/${confirmDelete.id}`);
      setUsuarios((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete({ isOpen: false, id: null });
    } catch(e) { setAlertMessage("Acesso Negado"); console.error(e) }
  }

  const handlePermChange = (modulo, acao, isChecked) => {
    setFormUsuario(prev => ({
      ...prev,
      permissoes: {
        ...prev.permissoes,
        [modulo]: {
          ...prev.permissoes[modulo],
          [acao]: isChecked
        }
      }
    }));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Usuários de Sistema</h1>
      </div>

      <div className="card animate-fadeIn">
        <div className="registers-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Lista de Usuários (Login)</h2>
          {perms.incluir && (
            <button className="btn btn-primary" onClick={() => abrirModalUsuario()}>
              + Novo Usuário
            </button>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan="4" className="empty-state-text">Nenhum usuário cadastrado.</td></tr>
              ) : (
                usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{fontWeight: 600}}>{u.nome}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge badge-${u.perfil === 'admin' ? 'concluido' : 'confirmado'}`}>{u.perfil.toUpperCase()}</span></td>
                    <td className="actions">
                      {perms.alterar && <button className="btn btn-secondary btn-sm" onClick={() => abrirModalUsuario(u)}>Editar</button>}
                      {perms.excluir && <button className="btn btn-danger btn-sm" onClick={() => excluirUsuario(u.id)}>Excluir</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL USUÁRIO */}
      <Modal isOpen={modalUsuario} onClose={() => setModalUsuario(false)} title={editandoId ? 'Editar Usuário' : 'Novo Usuário'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalUsuario(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarUsuario}>Salvar Login</button>
          </>
        }
      >
        <form onSubmit={salvarUsuario}>
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input className="form-input" value={formUsuario.nome} onChange={e => setFormUsuario({...formUsuario, nome: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail (Usado no Login) *</label>
            <input type="email" className="form-input" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Senha {editandoId && '(Opcional)'}</label>
              <input type="password" placeholder={editandoId ? 'Deixe em branco para ignorar' : '******'} className="form-input" value={formUsuario.senha} onChange={e => setFormUsuario({...formUsuario, senha: e.target.value})} required={!editandoId} />
            </div>
            <div className="form-group">
              <label className="form-label">Perfil Mestre</label>
              <select className="form-select" value={formUsuario.perfil} onChange={e => setFormUsuario({...formUsuario, perfil: e.target.value})}>
                <option value="admin">Administrador (Poder Total)</option>
                <option value="barbeiro">Barbeiro (Limitado por Padrão)</option>
                <option value="comum">Usuário Comum</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
             <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Matriz de Permissões (ACL)</h3>
             <div className="table-container">
               <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Módulo do App</th>
                      <th style={{textAlign: 'center'}}>Acessar (Ler)</th>
                      <th style={{textAlign: 'center'}}>Inserir (Criar)</th>
                      <th style={{textAlign: 'center'}}>Alterar (Editar)</th>
                      <th style={{textAlign: 'center'}}>Excluir (Apagar)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(MODULOS_DEFAULT).map(mod => (
                      <tr key={mod}>
                        <td style={{textTransform:'capitalize'}}>{mod}</td>
                        <td style={{textAlign: 'center'}}><input type="checkbox" checked={formUsuario.permissoes[mod].acessar} onChange={e => handlePermChange(mod, 'acessar', e.target.checked)} /></td>
                        <td style={{textAlign: 'center'}}><input type="checkbox" checked={formUsuario.permissoes[mod].incluir} onChange={e => handlePermChange(mod, 'incluir', e.target.checked)} /></td>
                        <td style={{textAlign: 'center'}}><input type="checkbox" checked={formUsuario.permissoes[mod].alterar} onChange={e => handlePermChange(mod, 'alterar', e.target.checked)} /></td>
                        <td style={{textAlign: 'center'}}><input type="checkbox" checked={formUsuario.permissoes[mod].excluir} onChange={e => handlePermChange(mod, 'excluir', e.target.checked)} /></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
             <p style={{fontSize:'0.8rem', color:'var(--color-text-muted)', marginTop:'8px'}}>Dica: Alterar a matriz de "Administradores" é opcional pois eles ignoram bloqueios sistêmicos.</p>
          </div>
        </form>
      </Modal>

      {/* Modal Exclusão */}
      <Modal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete({ isOpen: false, id: null })} title="Confirmar Exclusão"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete({ isOpen: false, id: null })}>Cancelar</button>
            <button className="btn btn-danger" onClick={confirmarExclusao}>Excluir</button>
          </>
        }
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>
          Tem certeza que deseja excluir este usuário?<br/><br/>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Esta ação não pode ser desfeita.</span>
        </p>
      </Modal>

      {/* Modal Alerta */}
      <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Aviso do Sistema"
        footer={<button className="btn btn-primary" onClick={() => setAlertMessage(null)}>OK</button>}
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>{alertMessage}</p>
      </Modal>
    </div>
  );
}
