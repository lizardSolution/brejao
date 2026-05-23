import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const MODULOS_DEFAULT = {
  cadastros: { acessar: true, incluir: true, alterar: true, excluir: true }
};

export default function Professionals() {
  const { usuario: user } = useAuth();
  const permMaster = user?.perfil === 'admin' ? MODULOS_DEFAULT : (user?.permissoes || MODULOS_DEFAULT);
  const perms = permMaster.cadastros || { acessar:false, incluir:false, alterar:false, excluir:false };

  const [barbeiros, setBarbeiros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  const [modalBarbeiro, setModalBarbeiro] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [alertMessage, setAlertMessage] = useState(null);
  
  const [formBarbeiro, setFormBarbeiro] = useState({ nome: '', telefone: '', ativo: true, usuario_id: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [bar, usu] = await Promise.all([
        api.get('barbeiros'),
        api.get('usuarios').catch(() => [])
      ]);
      setBarbeiros(bar || []);
      setUsuarios(usu || []);
    } catch (e) {
      console.error('Erro ao buscar barbeiros:', e);
    }
  }

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
    setConfirmDelete({ isOpen: true, id });
  }

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    try {
      await api.delete(`barbeiros/${confirmDelete.id}`);
      setBarbeiros((prev) => prev.filter((b) => b.id !== confirmDelete.id));
      setConfirmDelete({ isOpen: false, id: null });
    } catch(e) { setAlertMessage("Acesso Negado"); console.error(e) }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Profissionais</h1>
      </div>

      <div className="card animate-fadeIn">
        <div className="registers-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Equipe de Profissionais</h2>
          {perms.incluir && (
            <button className="btn btn-primary" onClick={() => abrirModalBarbeiro()}>
              + Novo Profissional
            </button>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="col-hide-mobile">Telefone</th>
                <th className="col-hide-mobile">Usuário de Acesso</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {barbeiros.length === 0 ? (
                <tr><td colSpan="5" className="empty-state-text">Nenhum profissional cadastrado.</td></tr>
              ) : (
                barbeiros.map(b => (
                  <tr key={b.id}>
                    <td style={{fontWeight: 600}}>{b.nome}</td>
                    <td className="col-hide-mobile">{b.telefone || '—'}</td>
                    <td className="col-hide-mobile">{usuarios.find(u => u.id === b.usuario_id)?.nome || <span style={{opacity: 0.5}}>- Sem Acesso -</span>}</td>
                    <td>
                      <span className={`badge ${b.ativo ? 'badge-concluido' : 'badge-cancelado'}`}>
                        {b.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions">
                      {perms.alterar && <button className="btn btn-secondary btn-sm" onClick={() => abrirModalBarbeiro(b)} title="Editar">✏️</button>}
                      {perms.excluir && <button className="btn btn-danger btn-sm" onClick={() => excluirBarbeiro(b.id)} title="Excluir">🗑️</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL BARBEIRO */}
      <Modal isOpen={modalBarbeiro} onClose={() => setModalBarbeiro(false)} title={editandoId ? 'Editar Profissional' : 'Novo Profissional'}
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
          <div className="checkbox-group" style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="checkbox" id="barbeiroAcess" checked={formBarbeiro.ativo} onChange={e => setFormBarbeiro({...formBarbeiro, ativo: e.target.checked})} />
            <label htmlFor="barbeiroAcess">Profissional Livre para Agendamentos (Ativo)</label>
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
          Tem certeza que deseja excluir este profissional?<br/><br/>
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
