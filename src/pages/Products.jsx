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

  // Estado do carrinho de venda
  const [carrinhoVenda, setCarrinhoVenda] = useState([]);
  const [clienteVenda, setClienteVenda] = useState('');
  const [itemAvulso, setItemAvulso] = useState({ produtoId: '', quantidade: 1 });

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

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [prod, ven, cli, venItens] = await Promise.all([
        api.get('produtos'),
        api.get('vendas'),
        api.get('clientes'),
        api.get('vendas_itens')
      ]);
      
      // Compor vendas com itens
      const vendasComItens = ven.map(v => {
        const itens = venItens.filter(i => i.venda_id === v.id);
        return { ...v, itens };
      });
      
      setProdutos(prod);
      setVendas(vendasComItens);
      setClientes(cli);
    } catch (e) {
      console.error(e);
    }
  }

  // Estatísticas
  const stats = useMemo(() => {
    const totalProdutos = produtos.length;
    const totalEstoque = produtos.reduce((sum, p) => sum + Number(p.estoque), 0);
    const estoquesBaixos = produtos.filter((p) => p.estoque <= 5).length;
    const totalVendas = vendas.reduce((sum, v) => sum + Number(v.valor_total || 0), 0);
    return { totalProdutos, totalEstoque, estoquesBaixos, totalVendas };
  }, [produtos, vendas]);

  const totalCarrinho = useMemo(() => {
    return carrinhoVenda.reduce((sum, item) => sum + item.total, 0);
  }, [carrinhoVenda]);

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

  // ===== VENDA MULTI-PRODUTO =====
  function abrirVenda() {
    setCarrinhoVenda([]);
    setClienteVenda('');
    setItemAvulso({ produtoId: '', quantidade: 1 });
    setModalVenda(true);
  }

  function adicionarAoCarrinho() {
    if (!itemAvulso.produtoId || itemAvulso.quantidade < 1) return;
    const prod = produtos.find(p => p.id === itemAvulso.produtoId);
    if (!prod) return;

    // Verificar estoque considerando o que já está no carrinho
    const jaNoCarrinho = carrinhoVenda
      .filter(c => c.produto_id === prod.id)
      .reduce((sum, c) => sum + c.quantidade, 0);

    if (prod.estoque < jaNoCarrinho + itemAvulso.quantidade) {
      setAlertMessage(`Estoque insuficiente! Disponível: ${prod.estoque - jaNoCarrinho}`);
      return;
    }

    const novoItem = {
      produto_id: prod.id,
      produto_nome: prod.nome,
      quantidade: itemAvulso.quantidade,
      preco_unitario: Number(prod.preco),
      total: Number(prod.preco) * itemAvulso.quantidade
    };

    setCarrinhoVenda(prev => [...prev, novoItem]);
    setItemAvulso({ produtoId: '', quantidade: 1 });
  }

  function removerDoCarrinho(index) {
    setCarrinhoVenda(prev => prev.filter((_, i) => i !== index));
  }

  async function realizarVenda(e) {
    e.preventDefault();
    if (carrinhoVenda.length === 0) {
      setAlertMessage('Adicione pelo menos um produto à venda.');
      return;
    }

    try {
      // 1. Criar venda (cabeçalho)
      const venda = await api.post('vendas', {
        cliente: clienteVenda || 'Venda Balcão',
        valor_total: totalCarrinho
      });

      // 2. Criar itens e atualizar estoque
      for (const item of carrinhoVenda) {
        await api.post('vendas_itens', {
          venda_id: venda.id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          valor_total: item.total
        });

        // Atualizar estoque
        const prod = produtos.find(p => p.id === item.produto_id);
        if (prod) {
          const novoEstoque = parseInt(prod.estoque) - parseInt(item.quantidade);
          await api.put(`produtos/${prod.id}`, { ...prod, estoque: novoEstoque });
        }
      }
      
      // 3. Gerar conta a receber
      const descItens = carrinhoVenda.map(i => `${i.produto_nome} x${i.quantidade}`).join(', ');
      const contaPayload = {
        descricao: `${descItens} - ${clienteVenda || 'Balcão'}`,
        origem: 'Produto',
        valor: totalCarrinho,
        data_vencimento: dataHoje(),
        status: 'recebido',
        data_recebimento: dataHoje()
      };
      await api.post('contas_receber', contaPayload);

      // 4. Recarregar dados
      carregarDados();
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
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => excluirProduto(p.id)}
                    title="Excluir"
                  >
                    🗑️
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
            {vendas.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">—</div>
                <p className="empty-state-text">Nenhuma venda registrada</p>
              </div>
            ) : (
              [...vendas]
                .sort((a,b) => new Date(b.criado_em) - new Date(a.criado_em))
                .map((v) => (
                  <div key={v.id} className="sale-card" style={{ 
                    background: 'var(--color-dark-card)', 
                    border: '1px solid var(--color-dark-border)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    marginBottom: '12px',
                    animation: 'slideInUp 0.3s ease forwards'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{formatarDataHora(v.criado_em)}</span>
                        <span style={{ marginLeft: '12px', fontWeight: 500 }}>{v.cliente || 'Venda Balcão'}</span>
                      </div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                        {formatarMoeda(v.valor_total)}
                      </span>
                    </div>
                    {v.itens && v.itens.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                        {v.itens.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', color: 'var(--color-text-secondary)' }}>
                            <span>{item.produto_nome} x{item.quantidade}</span>
                            <span>{formatarMoeda(item.valor_total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
            )}
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

      {/* Modal Venda Multi-Produto */}
      <Modal
        isOpen={modalVenda}
        onClose={() => setModalVenda(false)}
        title="Nova Venda"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalVenda(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={realizarVenda}>Confirmar Venda</button>
          </>
        }
      >
        <form onSubmit={realizarVenda}>
          <div className="form-group">
            <label className="form-label">Cliente (opcional)</label>
            <select
              className="form-select"
              value={clienteVenda}
              onChange={(e) => setClienteVenda(e.target.value)}
            >
              <option value="">Consumidor Expresso / Balcão</option>
              {clientes.map(c => (
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Adicionar Produtos</h3>
            
            <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: '2' }}>
                <label className="form-label">Produto</label>
                <select
                  className="form-select"
                  value={itemAvulso.produtoId}
                  onChange={(e) => setItemAvulso({ ...itemAvulso, produtoId: e.target.value })}
                >
                  <option value="">Selecione um produto...</option>
                  {produtos.filter((p) => p.estoque > 0).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {formatarMoeda(p.preco)} (estoque: {p.estoque})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: '1' }}>
                <label className="form-label">Qtd</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={itemAvulso.quantidade}
                  onChange={(e) => setItemAvulso({ ...itemAvulso, quantidade: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-secondary" onClick={adicionarAoCarrinho}>Adicionar</button>
              </div>
            </div>

            {carrinhoVenda.length > 0 ? (
              <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '8px', padding: '12px' }}>
                <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Produto</th>
                      <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Qtd</th>
                      <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carrinhoVenda.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 0' }}>{item.produto_nome}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantidade}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatarMoeda(item.total)}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          <button type="button" onClick={() => removerDoCarrinho(i)} style={{background:'none', border:'none', color:'red', cursor:'pointer'}} title="Remover">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--color-border)' }}>
                  <strong style={{ color: 'var(--color-gold)' }}>Total da Venda:</strong>
                  <strong style={{ color: 'var(--color-gold)', fontSize: '1.1rem' }}>{formatarMoeda(totalCarrinho)}</strong>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                Nenhum produto adicionado ao carrinho.
              </div>
            )}
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
