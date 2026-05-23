import { useState, useEffect } from 'react';
import './FinancialReport.css';

export default function FinancialReport() {
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicial: '',
    dataFinal: '',
    tipo: 'ambos' // 'pagar', 'receber', 'ambos'
  });
  
  const [dadosFiltrados, setDadosFiltrados] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resPagar, resReceber] = await Promise.all([
        fetch('http://localhost:3000/api/contas_pagar'),
        fetch('http://localhost:3000/api/contas_receber')
      ]);

      if (resPagar.ok && resReceber.ok) {
        const pagar = await resPagar.json();
        const receber = await resReceber.json();
        
        // Formatar para um array único
        const pagarFormatado = pagar.map(item => ({
          ...item,
          tipo: 'Pagar',
          dataReferencia: item.data_vencimento,
          dataEfetivacao: item.data_pagamento,
          categoriaOrigem: item.categoria,
          valorExibicao: -Math.abs(item.valor) // negativo para display total
        }));

        const receberFormatado = receber.map(item => ({
          ...item,
          tipo: 'Receber',
          dataReferencia: item.data_vencimento,
          dataEfetivacao: item.data_recebimento,
          categoriaOrigem: item.origem,
          valorExibicao: Math.abs(item.valor)
        }));

        setContasPagar(pagarFormatado);
        setContasReceber(receberFormatado);
      }
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarRelatorio = () => {
    let baseDados = [];
    if (filtros.tipo === 'pagar') {
      baseDados = [...contasPagar];
    } else if (filtros.tipo === 'receber') {
      baseDados = [...contasReceber];
    } else {
      baseDados = [...contasPagar, ...contasReceber];
    }

    // Filtrar por data
    const filtrados = baseDados.filter(item => {
      if (!filtros.dataInicial && !filtros.dataFinal) return true;
      
      const dataItem = new Date(item.dataReferencia);
      const start = filtros.dataInicial ? new Date(filtros.dataInicial) : null;
      const end = filtros.dataFinal ? new Date(filtros.dataFinal) : null;

      // Ajustar timezone fix
      if (start) start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);
      dataItem.setHours(12,0,0,0);

      if (start && dataItem < start) return false;
      if (end && dataItem > end) return false;
      
      return true;
    });

    // Ordenar por data
    filtrados.sort((a, b) => new Date(a.dataReferencia) - new Date(b.dataReferencia));

    setDadosFiltrados(filtrados);
  };

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const date = new Date(dataStr + 'T12:00:00Z');
    return date.toLocaleDateString('pt-BR');
  };

  // Calcular Totais
  const totalPagar = Math.abs(dadosFiltrados.filter(i => i.tipo === 'Pagar').reduce((acc, curr) => acc + Number(curr.valor), 0));
  const totalReceber = dadosFiltrados.filter(i => i.tipo === 'Receber').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saldo = totalReceber - totalPagar;

  return (
    <div className="financial-report-container page-container">
      <div className="page-header">
        <h1 className="page-title">Relatório Financeiro</h1>
        <p className="page-subtitle">Consulte movimentações de contas a pagar e receber</p>
      </div>

      <div className="card report-filters-card">
        <div className="filters-grid">
          <div className="form-group">
            <label>Data Inicial</label>
            <input 
              type="date" 
              className="form-control"
              value={filtros.dataInicial}
              onChange={e => setFiltros({...filtros, dataInicial: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Data Final</label>
            <input 
              type="date" 
              className="form-control"
              value={filtros.dataFinal}
              onChange={e => setFiltros({...filtros, dataFinal: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Tipo de Conta</label>
            <select 
              className="form-control"
              value={filtros.tipo}
              onChange={e => setFiltros({...filtros, tipo: e.target.value})}
            >
              <option value="ambos">Ambas (Pagar e Receber)</option>
              <option value="pagar">Somente Contas a Pagar</option>
              <option value="receber">Somente Contas a Receber</option>
            </select>
          </div>
          <div className="filter-actions">
            <button 
              className="btn btn-primary btn-block" 
              onClick={handleGerarRelatorio}
              disabled={loading}
              style={{ marginTop: '22px' }}
            >
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-cards" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
             ↓
          </div>
          <div className="stat-info">
            <span className="stat-label">Total a Receber</span>
            <span className="stat-value">{formatarMoeda(totalReceber)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
             ↑
          </div>
          <div className="stat-info">
            <span className="stat-label">Total a Pagar</span>
            <span className="stat-value">{formatarMoeda(totalPagar)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: saldo >= 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: saldo >= 0 ? '#3b82f6' : '#ef4444' }}>
             =
          </div>
          <div className="stat-info">
            <span className="stat-label">Saldo Previsto</span>
            <span className="stat-value" style={{ color: saldo >= 0 ? 'var(--color-text)' : '#ef4444' }}>
              {formatarMoeda(saldo)}
            </span>
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Categoria/Origem</th>
                <th>Vencimento</th>
                <th>Efetivação</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length > 0 ? (
                dadosFiltrados.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>
                      <span className={`status-badge ${item.tipo === 'Receber' ? 'status-concluido' : 'status-cancelado'}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td>{item.descricao}</td>
                    <td>{item.categoriaOrigem || '-'}</td>
                    <td>{formatarData(item.dataReferencia)}</td>
                    <td>{formatarData(item.dataEfetivacao)}</td>
                    <td>
                      <span className={`status-badge ${item.status === 'pago' || item.status === 'recebido' ? 'status-concluido' : 'status-agendado'}`}>
                         {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: item.tipo === 'Pagar' ? '#ef4444' : '#22c55e' }}>
                      {item.tipo === 'Pagar' ? '- ' : ''}{formatarMoeda(item.valor)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    Nenhum registro encontrado para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
