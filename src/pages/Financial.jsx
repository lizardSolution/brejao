import { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { formatarMoeda, formatarData, mesAtual, dataHoje } from '../utils/helpers';
import Modal from '../components/Modal';
import './Financial.css';

export default function Financial() {
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);

  const [abaAtiva, setAbaAtiva] = useState('resumo');
  const [modalPagar, setModalPagar] = useState(false);
  const [modalReceber, setModalReceber] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, tipo: null, id: null });

  async function confirmarExclusao() {
    if (!confirmDelete.id) return;
    const { tipo, id } = confirmDelete;
    try {
      if (tipo === 'pagar') {
        await api.delete(`contas_pagar/${id}`);
        setContasPagar((prev) => prev.filter((c) => c.id !== id));
      } else {
        await api.delete(`contas_receber/${id}`);
        setContasReceber((prev) => prev.filter((c) => c.id !== id));
      }
      setConfirmDelete({ isOpen: false, tipo: null, id: null });
    } catch(e) { console.error(e); }
  }
  const [filtroMes, setFiltroMes] = useState(mesAtual());
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const [formPagar, setFormPagar] = useState({
    descricao: '', categoria: '', valor: '', dataVencimento: dataHoje(), status: 'pendente',
  });

  const [formReceber, setFormReceber] = useState({
    descricao: '', origem: 'Serviço', valor: '', dataVencimento: dataHoje(), status: 'pendente',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [cp, cr] = await Promise.all([
        api.get('contas_pagar'),
        api.get('contas_receber')
      ]);
      setContasPagar(cp);
      setContasReceber(cr);
    } catch (e) {
      console.error(e);
    }
  }

  // Cálculos financeiros
  const resumo = useMemo(() => {
    const totalReceber = contasReceber
      .filter((c) => c.status === 'recebido')
      .reduce((sum, c) => sum + Number(c.valor), 0);

    const totalPagar = contasPagar
      .filter((c) => c.status === 'pago')
      .reduce((sum, c) => sum + Number(c.valor), 0);

    const pendentePagar = contasPagar
      .filter((c) => c.status === 'pendente')
      .reduce((sum, c) => sum + Number(c.valor), 0);

    const pendenteReceber = contasReceber
      .filter((c) => c.status === 'pendente')
      .reduce((sum, c) => sum + Number(c.valor), 0);

    return {
      totalReceber,
      totalPagar,
      lucro: totalReceber - totalPagar,
      pendentePagar,
      pendenteReceber,
    };
  }, [contasPagar, contasReceber]);

  // Dados do gráfico (últimos 6 meses)
  const dadosGrafico = useMemo(() => {
    const meses = [];
    const agora = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nome = d.toLocaleDateString('pt-BR', { month: 'short' });

      const receitas = contasReceber
        .filter((c) => {
          const bdDate = c.data_vencimento?.includes('T') ? c.data_vencimento.split('T')[0] : c.data_vencimento;
          return bdDate?.startsWith(chave);
        })
        .reduce((sum, c) => sum + Number(c.valor), 0);

      const despesas = contasPagar
        .filter((c) => {
          const bdDate = c.data_vencimento?.includes('T') ? c.data_vencimento.split('T')[0] : c.data_vencimento;
          return bdDate?.startsWith(chave);
        })
        .reduce((sum, c) => sum + Number(c.valor), 0);

      meses.push({ chave, nome, receitas, despesas });
    }

    const maxValor = Math.max(
      ...meses.map((m) => Math.max(m.receitas, m.despesas)),
      1
    );

    return { meses, maxValor };
  }, [contasPagar, contasReceber]);

  // Filtros
  const contasPagarFiltradas = useMemo(() => {
    let filtradas = contasPagar;
    if (filtroMes) {
      filtradas = filtradas.filter((c) => {
        const bdDate = c.data_vencimento?.includes('T') ? c.data_vencimento.split('T')[0] : c.data_vencimento;
        return bdDate?.startsWith(filtroMes);
      });
    }
    if (filtroStatus !== 'todos') {
      filtradas = filtradas.filter((c) => c.status === filtroStatus);
    }
    return filtradas.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
  }, [contasPagar, filtroMes, filtroStatus]);

  const contasReceberFiltradas = useMemo(() => {
    let filtradas = contasReceber;
    if (filtroMes) {
      filtradas = filtradas.filter((c) => {
        const bdDate = c.data_vencimento?.includes('T') ? c.data_vencimento.split('T')[0] : c.data_vencimento;
        return bdDate?.startsWith(filtroMes);
      });
    }
    if (filtroStatus !== 'todos') {
      filtradas = filtradas.filter((c) => c.status === filtroStatus);
    }
    return filtradas.sort((a, b) => (a.data_vencimento || '').localeCompare(b.data_vencimento || ''));
  }, [contasReceber, filtroMes, filtroStatus]);

  // Totais filtrados
  const totaisPagar = useMemo(() => {
    const total = contasPagarFiltradas.reduce((s, c) => s + Number(c.valor), 0);
    const pago = contasPagarFiltradas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0);
    const pendente = contasPagarFiltradas.filter((c) => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0);
    return { total, pago, pendente };
  }, [contasPagarFiltradas]);

  const totaisReceber = useMemo(() => {
    const total = contasReceberFiltradas.reduce((s, c) => s + Number(c.valor), 0);
    const recebido = contasReceberFiltradas.filter((c) => c.status === 'recebido').reduce((s, c) => s + Number(c.valor), 0);
    const pendente = contasReceberFiltradas.filter((c) => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0);
    return { total, recebido, pendente };
  }, [contasReceberFiltradas]);

  async function salvarContaPagar(e) {
    e.preventDefault();
    if (!formPagar.descricao || !formPagar.valor) return;
    
    const payload = {
      descricao: formPagar.descricao,
      categoria: formPagar.categoria,
      valor: parseFloat(formPagar.valor),
      data_vencimento: formPagar.dataVencimento,
      status: formPagar.status
    };

    try {
      const nova = await api.post('contas_pagar', payload);
      setContasPagar((prev) => [...prev, nova]);
      setModalPagar(false);
      setFormPagar({ descricao: '', categoria: '', valor: '', dataVencimento: dataHoje(), status: 'pendente' });
    } catch(e) { console.error(e); }
  }

  async function salvarContaReceber(e) {
    e.preventDefault();
    if (!formReceber.descricao || !formReceber.valor) return;

    const payload = {
      descricao: formReceber.descricao,
      origem: formReceber.origem,
      valor: parseFloat(formReceber.valor),
      data_vencimento: formReceber.dataVencimento,
      status: formReceber.status
    };

    try {
      const nova = await api.post('contas_receber', payload);
      setContasReceber((prev) => [...prev, nova]);
      setModalReceber(false);
      setFormReceber({ descricao: '', origem: 'Serviço', valor: '', dataVencimento: dataHoje(), status: 'pendente' });
    } catch(e) { console.error(e); }
  }

  async function alterarStatusPagar(id, novoStatus) {
    const data_pagamento = novoStatus === 'pago' ? dataHoje() : null;
    try {
      await api.put(`contas_pagar/${id}`, { status: novoStatus, data_pagamento });
      setContasPagar((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: novoStatus, data_pagamento } : c)
      );
    } catch(e) { console.error(e); }
  }

  async function alterarStatusReceber(id, novoStatus) {
    const data_recebimento = novoStatus === 'recebido' ? dataHoje() : null;
    try {
      await api.put(`contas_receber/${id}`, { status: novoStatus, data_recebimento });
      setContasReceber((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: novoStatus, data_recebimento } : c)
      );
    } catch(e) { console.error(e); }
  }

  function excluirPagar(id) {
    setConfirmDelete({ isOpen: true, tipo: 'pagar', id });
  }

  function excluirReceber(id) {
    setConfirmDelete({ isOpen: true, tipo: 'receber', id });
  }

  return (
    <div className="financial-page">
      <div className="page-header">
        <h1 className="page-title">
          <span>Financeiro</span>
        </h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${abaAtiva === 'resumo' ? 'active' : ''}`} onClick={() => setAbaAtiva('resumo')}>
          Resumo
        </button>
        <button className={`tab ${abaAtiva === 'pagar' ? 'active' : ''}`} onClick={() => setAbaAtiva('pagar')}>
          Contas a Pagar
        </button>
        <button className={`tab ${abaAtiva === 'receber' ? 'active' : ''}`} onClick={() => setAbaAtiva('receber')}>
          Contas a Receber
        </button>
      </div>

      {/* ===== ABA RESUMO ===== */}
      {abaAtiva === 'resumo' && (
        <div className="financial-section">
          <div className="stats-grid">
            <div className="stats-card">
              <div className="stats-card-icon">—</div>
              <div className="stats-card-label">Total Recebido</div>
              <div className="stats-card-value positive">{formatarMoeda(resumo.totalReceber)}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-icon">—</div>
              <div className="stats-card-label">Total Pago</div>
              <div className="stats-card-value negative">{formatarMoeda(resumo.totalPagar)}</div>
            </div>
            <div className="stats-card">
              <div className="stats-card-icon">—</div>
              <div className="stats-card-label">Lucro Líquido</div>
              <div className={`stats-card-value ${resumo.lucro >= 0 ? 'positive' : 'negative'}`}>
                {formatarMoeda(resumo.lucro)}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card-icon">—</div>
              <div className="stats-card-label">A Receber (Pendente)</div>
              <div className="stats-card-value gold">{formatarMoeda(resumo.pendenteReceber)}</div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="financial-chart">
            <h3 className="chart-title">Receitas vs Despesas — Últimos 6 meses</h3>
            <div className="chart-bars">
              {dadosGrafico.meses.map((m) => (
                <div key={m.chave} className="chart-bar-group">
                  <div className="chart-bar-wrapper">
                    <div
                      className="chart-bar receita"
                      style={{
                        height: `${(m.receitas / dadosGrafico.maxValor) * 100}%`,
                      }}
                      title={`Receitas: ${formatarMoeda(m.receitas)}`}
                    />
                    <div
                      className="chart-bar despesa"
                      style={{
                        height: `${(m.despesas / dadosGrafico.maxValor) * 100}%`,
                      }}
                      title={`Despesas: ${formatarMoeda(m.despesas)}`}
                    />
                  </div>
                  <span className="chart-bar-label">{m.nome}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <div className="chart-legend-item">
                <span className="chart-legend-dot receita" />
                Receitas
              </div>
              <div className="chart-legend-item">
                <span className="chart-legend-dot despesa" />
                Despesas
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ABA CONTAS A PAGAR ===== */}
      {abaAtiva === 'pagar' && (
        <div className="financial-section">
          <div className="table-header-row">
            <h3 className="table-title">Contas a Pagar</h3>
            <button className="btn btn-primary" onClick={() => setModalPagar(true)}>
              + Nova Conta
            </button>
          </div>

          <div className="filter-bar">
            <input
              type="month"
              className="form-input"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            />
            <select
              className="form-select"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>

          <div className="financial-totals">
            <div className="financial-total-card">
              <div className="financial-total-label">Total</div>
              <div className="financial-total-value gold">{formatarMoeda(totaisPagar.total)}</div>
            </div>
            <div className="financial-total-card">
              <div className="financial-total-label">Pago</div>
              <div className="financial-total-value green">{formatarMoeda(totaisPagar.pago)}</div>
            </div>
            <div className="financial-total-card">
              <div className="financial-total-label">Pendente</div>
              <div className="financial-total-value red">{formatarMoeda(totaisPagar.pendente)}</div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasPagarFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  contasPagarFiltradas.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.descricao}</td>
                      <td>{c.categoria || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{formatarMoeda(c.valor)}</td>
                      <td>{formatarData(c.data_vencimento?.split('T')[0] || c.data_vencimento)}</td>
                      <td>
                        <span className={`badge badge-${c.status}`}>{c.status}</span>
                      </td>
                      <td className="actions">
                        {c.status === 'pendente' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => alterarStatusPagar(c.id, 'pago')}
                          >
                            ✓ Pagar
                          </button>
                        )}
                        {c.status === 'pago' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => alterarStatusPagar(c.id, 'pendente')}
                          >
                            ↩ Desfazer
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => excluirPagar(c.id)}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== ABA CONTAS A RECEBER ===== */}
      {abaAtiva === 'receber' && (
        <div className="financial-section">
          <div className="table-header-row">
            <h3 className="table-title">Contas a Receber</h3>
            <button className="btn btn-primary" onClick={() => setModalReceber(true)}>
              + Nova Conta
            </button>
          </div>

          <div className="filter-bar">
            <input
              type="month"
              className="form-input"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
            />
            <select
              className="form-select"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="recebido">Recebido</option>
            </select>
          </div>

          <div className="financial-totals">
            <div className="financial-total-card">
              <div className="financial-total-label">Total</div>
              <div className="financial-total-value gold">{formatarMoeda(totaisReceber.total)}</div>
            </div>
            <div className="financial-total-card">
              <div className="financial-total-label">Recebido</div>
              <div className="financial-total-value green">{formatarMoeda(totaisReceber.recebido)}</div>
            </div>
            <div className="financial-total-card">
              <div className="financial-total-label">Pendente</div>
              <div className="financial-total-value red">{formatarMoeda(totaisReceber.pendente)}</div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Origem</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasReceberFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  contasReceberFiltradas.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.descricao}</td>
                      <td>{c.origem || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{formatarMoeda(c.valor)}</td>
                      <td>{formatarData(c.data_vencimento?.split('T')[0] || c.data_vencimento)}</td>
                      <td>
                        <span className={`badge badge-${c.status}`}>{c.status}</span>
                      </td>
                      <td className="actions">
                        {c.status === 'pendente' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => alterarStatusReceber(c.id, 'recebido')}
                          >
                            ✓ Receber
                          </button>
                        )}
                        {c.status === 'recebido' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => alterarStatusReceber(c.id, 'pendente')}
                          >
                            ↩ Desfazer
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => excluirReceber(c.id)}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Conta a Pagar */}
      <Modal
        isOpen={modalPagar}
        onClose={() => setModalPagar(false)}
        title="Nova Conta a Pagar"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalPagar(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarContaPagar}>Salvar</button>
          </>
        }
      >
        <form onSubmit={salvarContaPagar}>
          <div className="form-group">
            <label className="form-label">Descrição *</label>
            <input
              className="form-input"
              placeholder="Ex: Aluguel do Salão"
              value={formPagar.descricao}
              onChange={(e) => setFormPagar({ ...formPagar, descricao: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select
                className="form-select"
                value={formPagar.categoria}
                onChange={(e) => setFormPagar({ ...formPagar, categoria: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="Aluguel">Aluguel</option>
                <option value="Utilidades">Utilidades</option>
                <option value="Suprimentos">Suprimentos</option>
                <option value="Salários">Salários</option>
                <option value="Marketing">Marketing</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formPagar.valor}
                onChange={(e) => setFormPagar({ ...formPagar, valor: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Data de Vencimento</label>
            <input
              className="form-input"
              type="date"
              value={formPagar.dataVencimento}
              onChange={(e) => setFormPagar({ ...formPagar, dataVencimento: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Conta a Receber */}
      <Modal
        isOpen={modalReceber}
        onClose={() => setModalReceber(false)}
        title="Nova Conta a Receber"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalReceber(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvarContaReceber}>Salvar</button>
          </>
        }
      >
        <form onSubmit={salvarContaReceber}>
          <div className="form-group">
            <label className="form-label">Descrição *</label>
            <input
              className="form-input"
              placeholder="Ex: Corte - Cliente X"
              value={formReceber.descricao}
              onChange={(e) => setFormReceber({ ...formReceber, descricao: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Origem</label>
              <select
                className="form-select"
                value={formReceber.origem}
                onChange={(e) => setFormReceber({ ...formReceber, origem: e.target.value })}
              >
                <option value="Serviço">Serviço</option>
                <option value="Produto">Produto</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Valor *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formReceber.valor}
                onChange={(e) => setFormReceber({ ...formReceber, valor: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Data de Vencimento</label>
            <input
              className="form-input"
              type="date"
              value={formReceber.dataVencimento}
              onChange={(e) => setFormReceber({ ...formReceber, dataVencimento: e.target.value })}
            />
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
          Tem certeza que deseja excluir esta conta a {confirmDelete.tipo}? 
          <br/><br/>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Esta ação não pode ser desfeita.</span>
        </p>
      </Modal>
    </div>
  );
}
