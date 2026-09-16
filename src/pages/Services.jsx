import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatarMoeda } from '../utils/helpers';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
// ponytail: reaproveita o CSS de Produtos, os cards são os mesmos
import './Products.css';

const MODULOS_DEFAULT = {
  cadastros: { acessar: true, incluir: true, alterar: true, excluir: true }
};

export default function Services() {
  const { usuario: user } = useAuth();
  const permMaster = user?.perfil === 'admin' ? MODULOS_DEFAULT : (user?.permissoes || MODULOS_DEFAULT);
  const perms = permMaster.cadastros || { acessar: false, incluir: false, alterar: false, excluir: false };

  const [servicos, setServicos] = useState([]);
  const [modalServico, setModalServico] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [alertMessage, setAlertMessage] = useState(null);
  const [formServico, setFormServico] = useState({ nome: '', preco: '', duracao: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const srv = await api.get('servicos');
      setServicos(srv || []);
    } catch (e) {
      console.error('Erro ao buscar serviços:', e);
    }
  }

  function abrirModalServico(servico = null) {
    if (servico) {
      setEditandoId(servico.id);
      setFormServico({
        nome: servico.nome,
        preco: String(servico.preco),
        duracao: String(servico.duracao ?? ''),
      });
    } else {
      setEditandoId(null);
      setFormServico({ nome: '', preco: '', duracao: '' });
    }
    setModalServico(true);
  }

  async function salvarServico(e) {
    e.preventDefault();
    if (!formServico.nome.trim() || !formServico.preco) {
      setAlertMessage('Nome e preço são obrigatórios.');
      return;
    }

    const payload = {
      nome: formServico.nome,
      preco: parseFloat(formServico.preco),
      duracao: parseInt(formServico.duracao) || 30,
    };

    try {
      if (editandoId) {
        const atualizado = await api.put(`servicos/${editandoId}`, payload);
        setServicos((prev) => prev.map((s) => (s.id === editandoId ? atualizado : s)));
      } else {
        const criado = await api.post('servicos', payload);
        setServicos((prev) => [...prev, criado]);
      }
      setModalServico(false);
    } catch (e) { setAlertMessage('Acesso Negado ou Erro'); console.error(e); }
  }

  function excluirServico(id) {
    setConfirmDelete({ isOpen: true, id });
  }

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    try {
      await api.delete(`servicos/${confirmDelete.id}`);
      setServicos((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      setConfirmDelete({ isOpen: false, id: null });
    } catch (e) { setAlertMessage('Acesso Negado'); console.error(e); }
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <h1 className="page-title">
          <span>Serviços</span>
        </h1>
        {perms.incluir && (
          <button className="btn btn-primary" onClick={() => abrirModalServico()}>
            + Novo Serviço
          </button>
        )}
      </div>

      <div className="products-grid">
        {servicos.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">—</div>
            <p className="empty-state-text">Nenhum serviço cadastrado</p>
            {perms.incluir && (
              <button className="btn btn-primary" onClick={() => abrirModalServico()}>
                + Adicionar Serviço
              </button>
            )}
          </div>
        ) : (
          servicos.map((s, i) => (
            <div className="product-card" key={s.id} style={{ animationDelay: `${i * 0.05}s` }}>
              <h3 className="product-name">{s.nome}</h3>
              <div className="product-price">{formatarMoeda(s.preco)}</div>
              <div className="product-stock">
                <span>{s.duracao || 30} min</span>
              </div>
              <div className="product-actions">
                {perms.alterar && (
                  <button className="btn btn-secondary btn-sm" onClick={() => abrirModalServico(s)} title="Editar">✏️</button>
                )}
                {perms.excluir && (
                  <button className="btn btn-danger btn-sm" onClick={() => excluirServico(s.id)} title="Excluir">🗑️</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Serviço */}
      <Modal
        isOpen={modalServico}
        onClose={() => setModalServico(false)}
        title={editandoId ? 'Editar Serviço' : 'Novo Serviço'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalServico(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarServico}>Salvar</button>
          </>
        }
      >
        <form onSubmit={salvarServico}>
          <div className="form-group">
            <label className="form-label">Nome do Serviço *</label>
            <input
              className="form-input"
              placeholder="Ex: Corte Degradê"
              value={formServico.nome}
              onChange={(e) => setFormServico({ ...formServico, nome: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Preço *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formServico.preco}
                onChange={(e) => setFormServico({ ...formServico, preco: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Duração (min)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="30"
                value={formServico.duracao}
                onChange={(e) => setFormServico({ ...formServico, duracao: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        title="Confirmar Exclusão"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete({ isOpen: false, id: null })}>Cancelar</button>
            <button className="btn btn-danger" onClick={confirmarExclusao}>Excluir</button>
          </>
        }
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>
          Tem certeza que deseja excluir este serviço?
          <br /><br />
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Agendamentos já lançados mantêm o nome e o valor gravados.
          </span>
        </p>
      </Modal>

      {/* Modal Alerta */}
      <Modal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Aviso do Sistema"
        footer={<button className="btn btn-primary" onClick={() => setAlertMessage(null)}>OK</button>}
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>{alertMessage}</p>
      </Modal>
    </div>
  );
}
