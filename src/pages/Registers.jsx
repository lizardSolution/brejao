import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import './Registers.css';

const MODULOS_DEFAULT = {
  cadastros: { acessar: true, incluir: true, alterar: true, excluir: true },
  agendamentos: { acessar: true, incluir: true, alterar: true, excluir: true },
  produtos: { acessar: true, incluir: true, alterar: true, excluir: true },
  financeiro: { acessar: true, incluir: true, alterar: true, excluir: true }
};

export default function Registers() {
  const { usuario: user } = useAuth();
  
  // Permissions Check for UI
  const permMaster = user?.perfil === 'admin' ? MODULOS_DEFAULT : (user?.permissoes || MODULOS_DEFAULT);
  const perms = permMaster.cadastros || { acessar:false, incluir:false, alterar:false, excluir:false };

  const [abaAtiva, setAbaAtiva] = useState('clientes');

  // Hooks de estado e dados da API
  const [clientes, setClientes] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  // Modais de state
  const [modalCliente, setModalCliente] = useState(false);
  const [modalBarbeiro, setModalBarbeiro] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);

  // States de Formulário
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, tipo: null, id: null });
  const [alertMessage, setAlertMessage] = useState(null);

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    const { tipo, id } = confirmDelete;
    try {
      if (tipo === 'cliente') {
        await api.delete(`clientes/${id}`);
        setClientes((prev) => prev.filter((c) => c.id !== id));
      } else if (tipo === 'barbeiro') {
        await api.delete(`barbeiros/${id}`);
        setBarbeiros((prev) => prev.filter((b) => b.id !== id));
      } else if (tipo === 'usuario') {
        await api.delete(`usuarios/${id}`);
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
      }
      setConfirmDelete({ isOpen: false, tipo: null, id: null });
    } catch(e) { setAlertMessage("Acesso Negado"); console.error(e) }
  }

  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', observacoes: '' });
  const [formBarbeiro, setFormBarbeiro] = useState({ nome: '', telefone: '', ativo: true, usuario_id: '' });
  const [formUsuario, setFormUsuario] = useState({ nome: '', email: '', senha: '', perfil: 'comum', permissoes: MODULOS_DEFAULT });

  // Carregamento Inicial
  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [cli, bar, usu] = await Promise.all([
        api.get('clientes'),
        api.get('barbeiros'),
        api.get('usuarios') // Note: if the current user isn't admin, maybe they can't even GET usuarios. Backend will return 403.
      ]);
      setClientes(cli || []);
      setBarbeiros(bar || []);
      setUsuarios(usu || []);
    } catch (e) {
      console.error('Erro ao buscar cadastros:', e);
    }
  }

  // --- CRUD CLIENTES ---
  function abrirModalCliente(cliente = null) {
    if (cliente) {
      setEditandoId(cliente.id);
      setFormCliente({ nome: cliente.nome, telefone: cliente.telefone || '', observacoes: cliente.observacoes || '' });
    } else {
      setEditandoId(null);
      setFormCliente({ nome: '', telefone: '', observacoes: '' });
    }
    setModalCliente(true);
  }

  async function salvarCliente(e) {
    e.preventDefault();
    if (!formCliente.nome) return;

    try {
      if (editandoId) {
        const atualizado = await api.put(`clientes/${editandoId}`, formCliente);
        setClientes(prev => prev.map(c => c.id === editandoId ? atualizado : c));
      } else {
        const criado = await api.post('clientes', formCliente);
        setClientes(prev => [...prev, criado]);
      }
      setModalCliente(false);
    } catch(e) { setAlertMessage("Acesso Negado ou Erro"); console.error(e) }
  }

  function excluirCliente(id) {
    setConfirmDelete({ isOpen: true, tipo: 'cliente', id });
  }

  // --- CRUD BARBEIROS ---
  function abrirModalBarbeiro(barbeiro = null) {
    if (barbeiro) {
      setEditandoId(barbeiro.id);
      setFormBarbeiro({ nome: barbeiro.nome, telefone: barbeiro.telefone || '', ativo: barbeiro.ativo, usuario_id: barbeiro.usuario_id || '' });
    } else {
      setEditandoId(null);
      setFormBarbeiro({ nome: '', telefone: '', ativo: true, usuario_id: '' });
    }
    setModalBarbeiro(true);
  }

  async function salvarBarbeiro(e) {
    e.preventDefault();
    if (!formBarbeiro.nome) return;

    // Converte campo text empty pra null pro banco
    const payload = { ...formBarbeiro };
    if (!payload.usuario_id) payload.usuario_id = null;

    try {
      if (editandoId) {
        const atualizado = await api.put(`barbeiros/${editandoId}`, payload);
        setBarbeiros(prev => prev.map(b => b.id === editandoId ? atualizado : b));
      } else {
        const criado = await api.post('barbeiros', payload);
        setBarbeiros(prev => [...prev, criado]);
      }
      setModalBarbeiro(false);
    } catch(e) { setAlertMessage("Acesso Negado"); console.error(e) }
  }

  function excluirBarbeiro(id) {
    setConfirmDelete({ isOpen: true, tipo: 'barbeiro', id });
  }

  // --- CRUD USUÁRIOS ---
  function abrirModalUsuario(usuario = null) {
    if (usuario) {
      setEditandoId(usuario.id);
      setFormUsuario({ 
        nome: usuario.nome, 
        email: usuario.email, 
        senha: '', // Esconde a senha, manda em branco pra n atualizar se n digitado
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
    } catch(e) { setAlertMessage("Acesso Negado/Erro"); console.error(e) }
  }

  function excluirUsuario(id) {
    setConfirmDelete({ isOpen: true, tipo: 'usuario', id });
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
    <div className="registers-page">
      <div className="page-header">
        <h1 className="page-title">
          <span>Cadastros</span>
        </h1>
      </div>

      <div className="tabs">
        <button className={`tab ${abaAtiva === 'clientes' ? 'active' : ''}`} onClick={() => setAbaAtiva('clientes')}>
          Clientes
        </button>
        <button className={`tab ${abaAtiva === 'barbeiros' ? 'active' : ''}`} onClick={() => setAbaAtiva('barbeiros')}>
          Barbeiros
        </button>
        <button className={`tab ${abaAtiva === 'usuarios' ? 'active' : ''}`} onClick={() => setAbaAtiva('usuarios')}>
          Usuários do Sistema
        </button>
      </div>

      {/* --- ABA CLIENTES --- */}
      {abaAtiva === 'clientes' && (
        <div className="registers-section animate-fadeIn">
          <div className="registers-header">
            <h2 className="registers-title">Lista de Clientes</h2>
            {perms.incluir && (
              <button className="btn btn-primary" onClick={() => abrirModalCliente()}>
                + Novo Cliente
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome do Cliente</th>
                  <th>Telefone</th>
                  <th>Observações</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr><td colSpan="4" className="empty-state-text">Nenhum cliente cadastrado.</td></tr>
                ) : (
                  clientes.map(c => (
                    <tr key={c.id}>
                      <td style={{fontWeight: 600}}>{c.nome}</td>
                      <td>{c.telefone || '—'}</td>
                      <td>{c.observacoes || '—'}</td>
                      <td className="actions">
                        {perms.alterar && <button className="btn btn-secondary btn-sm" onClick={() => abrirModalCliente(c)}>Editar</button>}
                        {perms.excluir && <button className="btn btn-danger btn-sm" onClick={() => excluirCliente(c.id)}>Excluir</button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ABA BARBEIROS --- */}
      {abaAtiva === 'barbeiros' && (
        <div className="registers-section animate-fadeIn">
          <div className="registers-header">
            <h2 className="registers-title">Equipe de Barbeiros</h2>
            {perms.incluir && (
              <button className="btn btn-primary" onClick={() => abrirModalBarbeiro()}>
                + Novo Barbeiro
              </button>
            )}
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome do Barbeiro</th>
                  <th>Telefone</th>
                  <th>Usuário App</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {barbeiros.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state-text">Nenhum barbeiro cadastrado.</td></tr>
                ) : (
                  barbeiros.map(b => (
                    <tr key={b.id}>
                      <td style={{fontWeight: 600}}>{b.nome}</td>
                      <td>{b.telefone || '—'}</td>
                      <td>{usuarios.find(u => u.id === b.usuario_id)?.nome || <span style={{opacity: 0.5}}>- Sem Acesso -</span>}</td>
                      <td>
                        <span className={`badge ${b.ativo ? 'badge-concluido' : 'badge-cancelado'}`}>
                          {b.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="actions">
                        {perms.alterar && <button className="btn btn-secondary btn-sm" onClick={() => abrirModalBarbeiro(b)}>Editar</button>}
                        {perms.excluir && <button className="btn btn-danger btn-sm" onClick={() => excluirBarbeiro(b.id)}>Excluir</button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ABA USUÁRIOS --- */}
      {abaAtiva === 'usuarios' && (
        <div className="registers-section animate-fadeIn">
          <div className="registers-header">
            <h2 className="registers-title">Usuários do Sistema (Login)</h2>
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
      )}

      {/* MODAL CLIENTE */}
      <Modal isOpen={modalCliente} onClose={() => setModalCliente(false)} title={editandoId ? 'Editar Cliente' : 'Novo Cliente'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalCliente(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarCliente}>Salvar</button>
          </>
        }
      >
        <form onSubmit={salvarCliente}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input className="form-input" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: e.target.value})} placeholder="(11) 99999-9999" />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={formCliente.observacoes} onChange={e => setFormCliente({...formCliente, observacoes: e.target.value})} placeholder="Pede sempre degradê..." />
          </div>
        </form>
      </Modal>

      {/* MODAL BARBEIRO */}
      <Modal isOpen={modalBarbeiro} onClose={() => setModalBarbeiro(false)} title={editandoId ? 'Editar Barbeiro' : 'Novo Barbeiro'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalBarbeiro(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarBarbeiro}>Salvar</button>
          </>
        }
      >
        <form onSubmit={salvarBarbeiro}>
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={formBarbeiro.nome} onChange={e => setFormBarbeiro({...formBarbeiro, nome: e.target.value})} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={formBarbeiro.telefone} onChange={e => setFormBarbeiro({...formBarbeiro, telefone: e.target.value})} placeholder="(11) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">Vincular Conta de Usuário (Acesso App)</label>
              <select className="form-select" value={formBarbeiro.usuario_id} onChange={e => setFormBarbeiro({...formBarbeiro, usuario_id: e.target.value})}>
                <option value="">- Sem Acesso ao Sistema -</option>
                {usuarios.map(u => (
                   <option key={u.id} value={u.id}>{u.nome} ({u.perfil})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" id="barbeiroAcess" checked={formBarbeiro.ativo} onChange={e => setFormBarbeiro({...formBarbeiro, ativo: e.target.checked})} />
            <label htmlFor="barbeiroAcess">Barbeiro Livre para Agendamentos (Ativo)</label>
          </div>
        </form>
      </Modal>

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
             <p style={{fontSize:'0.8rem', color:'var(--color-text-muted)', marginTop:'8px'}}>Dica: Alterar a matriz de "Administradores" é opcional pois eles ignoram bloqueios sistêmicos.</p>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, tipo: null, id: null })}
        title="Confirmar Exclusão"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete({ isOpen: false, tipo: null, id: null })}>Cancelar</button>
            <button className="btn btn-danger" onClick={confirmarExclusao}>Excluir</button>
          </>
        }
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>
          Tem certeza que deseja excluir este {confirmDelete.tipo}? 
          <br/><br/>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Esta ação não pode ser desfeita.</span>
        </p>
      </Modal>

      {/* Modal Alerta */}
      <Modal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Aviso do Sistema"
        footer={
          <button className="btn btn-primary" onClick={() => setAlertMessage(null)}>OK</button>
        }
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>
          {alertMessage}
        </p>
      </Modal>
    </div>
  );
}
