import { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { formatarMoeda, formatarDataHora, dataHoje } from '../utils/helpers';
import Modal from '../components/Modal';
import './Products.css';

export default function Products() {
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [abaAtiva, setAbaAtiva] = useState('catalogo');
  const [modalProduto, setModalProduto] = useState(false);
  const [modalVenda, setModalVenda] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [alertMessage, setAlertMessage] = useState(null);

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    try {
      await api.delete(`produtos/${confirmDelete.id}`);
      setProdutos((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setConfirmDelete({ isOpen: false, id: null });
    } catch (e) { console.error(e); }
  }

  const [formProduto, setFormProduto] = useState({
    nome: '', preco: '', estoque: '', categoria: '',
  });

  const [formVenda, setFormVenda] = useState({
    produtoId: '', quantidade: 1, cliente: '',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [prod, ven, cli] = await Promise.all([
        api.get('produtos'),
        api.get('vendas'),
        api.get('clientes')
      ]);
      setProdutos(prod);
      setVendas(ven);
      setClientes(cli);
    } catch (e) {
      console.error(e);
    }
  }

  // Produto selecionado para venda
  const produtoVenda = useMemo(() => {
    return produtos.find((p) => p.id === formVenda.produtoId);
  }, [produtos, formVenda.produtoId]);

  const totalVenda = produtoVenda
    ? produtoVenda.preco * formVenda.quantidade
    : 0;

  // Estatísticas
  const stats = useMemo(() => {
    const totalProdutos = produtos.length;
    const totalEstoque = produtos.reduce((sum, p) => sum + Number(p.estoque), 0);
    const estoquesBaixos = produtos.filter((p) => p.estoque <= 5).length;
    // O banco salva preco_unitario e valor_total
    const totalVendas = vendas.reduce((sum, v) => sum + Number(v.valor_total || 0), 0);
    return { totalProdutos, totalEstoque, estoquesBaixos, totalVendas };
  }, [produtos, vendas]);

  function getStockLevel(estoque) {
    if (estoque > 10) return 'high';
    if (estoque > 5) return 'medium';
    return 'low';
  }

  function abrirNovoProduto() {
    setEditandoId(null);
    setFormProduto({ nome: '', preco: '', estoque: '', categoria: '' });
    setModalProduto(true);
  }

  function abrirEditarProduto(produto) {
    setEditandoId(produto.id);
    setFormProduto({
      nome: produto.nome,
      preco: String(produto.preco),
      estoque: String(produto.estoque),
      categoria: produto.categoria || '',
    });
    setModalProduto(true);
  }

  async function salvarProduto(e) {
    e.preventDefault();
    if (!formProduto.nome || !formProduto.preco) return;

    const payload = {
      nome: formProduto.nome,
      preco: parseFloat(formProduto.preco),
      estoque: parseInt(formProduto.estoque) || 0,
      categoria: formProduto.categoria,
    };

    try {
      if (editandoId) {
        const atualizado = await api.put(`produtos/${editandoId}`, payload);
        setProdutos((prev) => prev.map((p) => p.id === editandoId ? atualizado : p));
      } else {
        const criado = await api.post('produtos', payload);
        setProdutos((prev) => [...prev, criado]);
      }
      setModalProduto(false);
    } catch (e) { console.error(e); }
  }

  function excluirProduto(id) {
    setConfirmDelete({ isOpen: true, id });
  }

  function abrirVenda() {
    setFormVenda({
      produtoId: produtos.find(p => p.estoque > 0)?.id || '',
      quantidade: 1,
      cliente: '',
    });
    setModalVenda(true);
  }

  async function realizarVenda(e) {
    e.preventDefault();
    if (!formVenda.produtoId || formVenda.quantidade < 1) return;

    const produto = produtos.find((p) => p.id === formVenda.produtoId);
    if (!produto) return;

    if (produto.estoque < formVenda.quantidade) {
      setAlertMessage('Estoque insuficiente!');
      return;
    }

    try {
      // 1. Atualizar estoque (no backend e state)
      const novoEstoque = parseInt(produto.estoque) - parseInt(formVenda.quantidade);
      const prodAtualizado = await api.put(`produtos/${produto.id}`, { ...produto, estoque: novoEstoque });
      
      // 2. Registrar Venda
      const vendaPayload = {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: formVenda.quantidade,
        preco_unitario: produto.preco,
        valor_total: produto.preco * formVenda.quantidade,
        cliente: formVenda.cliente || 'Venda Balcão'
      };
      const vendaInserida = await api.post('vendas', vendaPayload);
      
      // 3. Gerar conta a receber
      const contaPayload = {
        descricao: `${produto.nome} x${formVenda.quantidade} - ${formVenda.cliente || 'Balcão'}`,
        origem: 'Produto',
        valor: vendaPayload.valor_total,
        data_vencimento: dataHoje(),
        status: 'recebido',
        data_recebimento: dataHoje()
      };
      await api.post('contas_receber', contaPayload);

      setProdutos(prev => prev.map(p => p.id === produto.id ? prodAtualizado : p));
      setVendas(prev => [vendaInserida, ...prev]); // reverse ordering
      setModalVenda(false);

    } catch (e) {
      console.error(e);
      setAlertMessage('Erro ao realizar a venda');
    }
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <h1 className="page-title">
          <span>Produtos</span>
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={abrirVenda}>
            Nova Venda
          </button>
          <button className="btn btn-primary" onClick={abrirNovoProduto}>
            + Novo Produto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-icon">—</div>
          <div className="stats-card-label">Total de Produtos</div>
          <div className="stats-card-value">{stats.totalProdutos}</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon">—</div>
          <div className="stats-card-label">Itens em Estoque</div>
          <div className="stats-card-value">{stats.totalEstoque}</div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon">—</div>
          <div className="stats-card-label">Estoque Baixo</div>
          <div className={`stats-card-value ${stats.estoquesBaixos > 0 ? 'negative' : ''}`}>
            {stats.estoquesBaixos}
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-card-icon">—</div>
          <div className="stats-card-label">Total em Vendas</div>
          <div className="stats-card-value gold">{formatarMoeda(stats.totalVendas)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${abaAtiva === 'catalogo' ? 'active' : ''}`} onClick={() => setAbaAtiva('catalogo')}>
          Catálogo
        </button>
        <button className={`tab ${abaAtiva === 'vendas' ? 'active' : ''}`} onClick={() => setAbaAtiva('vendas')}>
          Histórico de Vendas
        </button>
      </div>

      {/* Catálogo */}
      {abaAtiva === 'catalogo' && (
        <div className="products-grid">
          {produtos.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">—</div>
              <p className="empty-state-text">Nenhum produto cadastrado</p>
              <button className="btn btn-primary" onClick={abrirNovoProduto}>
                + Adicionar Produto
              </button>
            </div>
          ) : (
            produtos.map((p, i) => (
              <div
                className="product-card"
                key={p.id}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {p.categoria && <span className="product-category">{p.categoria}</span>}
                <h3 className="product-name">{p.nome}</h3>
                <div className="product-price">{formatarMoeda(p.preco)}</div>
                <div className="product-stock">
                  <span className={`product-stock-indicator ${getStockLevel(p.estoque)}`} />
                  <span>{p.estoque} em estoque</span>
                </div>
                <div className="product-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => abrirEditarProduto(p)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => excluirProduto(p.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Histórico de Vendas */}
      {abaAtiva === 'vendas' && (
        <div className="sales-section">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Preço Unit.</th>
                  <th>Total</th>
                  <th>Cliente</th>
                </tr>
              </thead>
              <tbody>
                {vendas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                      Nenhuma venda registrada
                    </td>
                  </tr>
                ) : (
                  [...vendas]
                    .sort((a,b) => new Date(b.criado_em) - new Date(a.criado_em))
                    .map((v) => (
                    <tr key={v.id}>
                      <td>{formatarDataHora(v.criado_em)}</td>
                      <td style={{ fontWeight: 500 }}>{v.produto_nome}</td>
                      <td>{v.quantidade}</td>
                      <td>{formatarMoeda(v.preco_unitario)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-gold)' }}>
                        {formatarMoeda(v.valor_total)}
                      </td>
                      <td>{v.cliente}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Produto */}
      <Modal
        isOpen={modalProduto}
        onClose={() => setModalProduto(false)}
        title={editandoId ? 'Editar Produto' : 'Novo Produto'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalProduto(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarProduto}>Salvar</button>
          </>
        }
      >
        <form onSubmit={salvarProduto}>
          <div className="form-group">
            <label className="form-label">Nome do Produto *</label>
            <input
              className="form-input"
              placeholder="Ex: Pomada Modeladora"
              value={formProduto.nome}
              onChange={(e) => setFormProduto({ ...formProduto, nome: e.target.value })}
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
                value={formProduto.preco}
                onChange={(e) => setFormProduto({ ...formProduto, preco: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estoque</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="0"
                value={formProduto.estoque}
                onChange={(e) => setFormProduto({ ...formProduto, estoque: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select
              className="form-select"
              value={formProduto.categoria}
              onChange={(e) => setFormProduto({ ...formProduto, categoria: e.target.value })}
            >
              <option value="">Selecione</option>
              <option value="Finalizador">Finalizador</option>
              <option value="Barba">Barba</option>
              <option value="Cabelo">Cabelo</option>
              <option value="Acessório">Acessório</option>
              <option value="Perfumaria">Perfumaria</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Modal Venda */}
      <Modal
        isOpen={modalVenda}
        onClose={() => setModalVenda(false)}
        title="Registrar Venda"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalVenda(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={realizarVenda}>Confirmar Venda</button>
          </>
        }
      >
        <form onSubmit={realizarVenda}>
          <div className="form-group">
            <label className="form-label">Produto *</label>
            <select
              className="form-select"
              value={formVenda.produtoId}
              onChange={(e) => setFormVenda({ ...formVenda, produtoId: e.target.value })}
              required
            >
              <option value="">Selecione um produto</option>
              {produtos.filter((p) => p.estoque > 0).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {formatarMoeda(p.preco)} (estoque: {p.estoque})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantidade *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max={produtoVenda?.estoque || 999}
                value={formVenda.quantidade}
                onChange={(e) =>
                  setFormVenda({ ...formVenda, quantidade: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cliente (opcional)</label>
              <select
                className="form-select"
                value={formVenda.cliente}
                onChange={(e) => setFormVenda({ ...formVenda, cliente: e.target.value })}
              >
                <option value="">Consumidor Expresso / Balcão</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {produtoVenda && (
            <div className="sale-summary">
              <div className="sale-summary-row">
                <span>Produto:</span>
                <span>{produtoVenda.nome}</span>
              </div>
              <div className="sale-summary-row">
                <span>Preço unitário:</span>
                <span>{formatarMoeda(produtoVenda.preco)}</span>
              </div>
              <div className="sale-summary-row">
                <span>Quantidade:</span>
                <span>{formVenda.quantidade}</span>
              </div>
              <div className="sale-summary-row total">
                <span>Total:</span>
                <span>{formatarMoeda(totalVenda)}</span>
              </div>
            </div>
          )}
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
          Tem certeza que deseja excluir este produto? 
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
