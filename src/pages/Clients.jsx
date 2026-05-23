import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const MODULOS_DEFAULT = {
  cadastros: { acessar: true, incluir: true, alterar: true, excluir: true }
};

export default function Clients() {
  const { usuario: user } = useAuth();
  const permMaster = user?.perfil === 'admin' ? MODULOS_DEFAULT : (user?.permissoes || MODULOS_DEFAULT);
  const perms = permMaster.cadastros || { acessar:false, incluir:false, alterar:false, excluir:false };

  const [clientes, setClientes] = useState([]);
  const [modalCliente, setModalCliente] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [alertMessage, setAlertMessage] = useState(null);
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '', observacoes: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const cli = await api.get('clientes');
      setClientes(cli || []);
    } catch (e) {
      console.error('Erro ao buscar clientes:', e);
    }
  }

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
    setConfirmDelete({ isOpen: true, id });
  }

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    try {
      await api.delete(`clientes/${confirmDelete.id}`);
      setClientes((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setConfirmDelete({ isOpen: false, id: null });
    } catch(e) { setAlertMessage("Acesso Negado"); console.error(e) }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
      </div>

      <div className="card animate-fadeIn">
        <div className="registers-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Lista de Clientes</h2>
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
            <textarea className="form-textarea" value={formCliente.observacoes} onChange={e => setFormCliente({...formCliente, observacoes: e.target.value})} placeholder="Preferências do cliente..." />
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
          Tem certeza que deseja excluir este cliente?<br/><br/>
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
