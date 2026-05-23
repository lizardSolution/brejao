import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { dataHoje } from '../utils/helpers';
import './FinancialReport.css';

export default function FinancialReport() {
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicial: dataHoje(),
    dataFinal: dataHoje(),
    tipo: 'ambos' // 'pagar', 'receber', 'ambos'
  });
  
  const [dadosFiltrados, setDadosFiltrados] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [pagar, receber] = await Promise.all([
        api.get('contas_pagar'),
        api.get('contas_receber')
      ]);

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

  const exportarExcel = () => {
    if (dadosFiltrados.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }
    
    const headers = ['Tipo', 'Descricao', 'Categoria/Origem', 'Vencimento', 'Efetivacao', 'Status', 'Valor'];
    
    const rows = dadosFiltrados.map(item => [
      item.tipo,
      `"${item.descricao}"`,
      `"${item.categoriaOrigem || '-'}"`,
      formatarData(item.dataReferencia),
      formatarData(item.dataEfetivacao),
      item.status,
      item.valor
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(";") + "\n" 
      + rows.map(e => e.join(";")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_financeiro.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarPDF = () => {
    window.print();
  };

  // Calcular Totais
  const totalPagar = Math.abs(dadosFiltrados.filter(i => i.tipo === 'Pagar').reduce((acc, curr) => acc + Number(curr.valor), 0));
  const totalReceber = dadosFiltrados.filter(i => i.tipo === 'Receber').reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saldo = totalReceber - totalPagar;

  return (
    <div className="financial-report-container page-container">
      <div className="page-header" style={{ position: 'relative' }}>
        <div>
          <h1 className="page-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>Relatório Financeiro</h1>
          <p className="page-subtitle print-hide">Consulte movimentações de contas a pagar e receber</p>
        </div>
        <img src="/img/logo.png" alt="Lizard Solutions" className="print-only" style={{ display: 'none' }} />
        <div className="page-actions print-hide" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={exportarExcel} disabled={dadosFiltrados.length === 0}>
             📊 Excel
          </button>
          <button className="btn btn-secondary" onClick={exportarPDF} disabled={dadosFiltrados.length === 0}>
             📄 PDF
          </button>
        </div>
      </div>

      <div className="card print-hide" style={{ marginBottom: '24px' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data Inicial</label>
            <input 
              type="date" 
              className="form-input"
              value={filtros.dataInicial}
              onChange={e => setFiltros({...filtros, dataInicial: e.target.value})}
              style={{ colorScheme: 'dark', width: '100%' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data Final</label>
            <input 
              type="date" 
              className="form-input"
              value={filtros.dataFinal}
              onChange={e => setFiltros({...filtros, dataFinal: e.target.value})}
              style={{ colorScheme: 'dark', width: '100%' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Conta</label>
            <select 
              className="form-select"
              value={filtros.tipo}
              onChange={e => setFiltros({...filtros, tipo: e.target.value})}
              style={{ width: '100%' }}
            >
              <option value="ambos">Ambas (Pagar e Receber)</option>
              <option value="pagar">Somente Contas a Pagar</option>
              <option value="receber">Somente Contas a Receber</option>
            </select>
          </div>
        </div>
        <div className="filter-actions" style={{ display: 'flex', marginTop: '16px' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleGerarRelatorio}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Gerar Relatório
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stats-card">
          <div className="stats-card-icon" style={{ color: 'var(--color-success)' }}>↓</div>
          <div className="stats-card-label">Total a Receber</div>
          <div className="stats-card-value positive">{formatarMoeda(totalReceber)}</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon" style={{ color: 'var(--color-error)' }}>↑</div>
          <div className="stats-card-label">Total a Pagar</div>
          <div className="stats-card-value negative">{formatarMoeda(totalPagar)}</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon" style={{ color: saldo >= 0 ? 'var(--color-info)' : 'var(--color-error)' }}>=</div>
          <div className="stats-card-label">Saldo Previsto</div>
          <div className={`stats-card-value ${saldo >= 0 ? '' : 'negative'}`}>
            {formatarMoeda(saldo)}
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-container">
          <table className="table">
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
