import { useState, useEffect } from 'react';
import { api } from '../services/api';
import './AppointmentsReport.css';

export default function AppointmentsReport() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicial: new Date().toISOString().split('T')[0],
    dataFinal: new Date().toISOString().split('T')[0],
    barbeiro: '',
    status: 'todos' // 'todos', 'agendado', 'concluido', 'cancelado'
  });

  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [barbeirosDisponiveis, setBarbeirosDisponiveis] = useState([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const dados = await api.get('agendamentos');

      // Extrair lista de barbeiros únicos para o filtro
      const barbeiros = [...new Set(dados.map(a => a.barbeiro).filter(Boolean))].sort();
      setBarbeirosDisponiveis(barbeiros);

      setAgendamentos(dados);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarRelatorio = () => {
    // Filtrar dados
    const filtrados = agendamentos.filter(item => {
      // Filtro de Data
      if (filtros.dataInicial && item.data < filtros.dataInicial) return false;
      if (filtros.dataFinal && item.data > filtros.dataFinal) return false;

      // Filtro de Barbeiro
      if (filtros.barbeiro && item.barbeiro !== filtros.barbeiro) return false;

      // Filtro de Status
      if (filtros.status !== 'todos' && item.status !== filtros.status) return false;

      return true;
    });

    // Ordenar por data e hora crescente
    filtrados.sort((a, b) => {
      const dateA = new Date(`${a.data}T${a.hora}`);
      const dateB = new Date(`${b.data}T${b.hora}`);
      return dateA - dateB;
    });

    setDadosFiltrados(filtrados);
  };

  const formatarMoeda = (valor) => {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    // O banco salva a data como YYYY-MM-DD
    const [year, month, day] = dataStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const exportarExcel = () => {
    if (dadosFiltrados.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }
    
    const headers = ['Data', 'Horario', 'Cliente', 'Servico', 'Profissional', 'Status', 'Valor'];
    
    const rows = dadosFiltrados.map(item => [
      formatarData(item.data),
      item.hora.substring(0,5),
      `"${item.cliente_nome}"`,
      `"${item.servico}"`,
      `"${item.barbeiro}"`,
      item.status,
      item.valor_servico
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(";") + "\n" 
      + rows.map(e => e.join(";")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_agendamentos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarPDF = () => {
    window.print();
  };

  // Calcular Totais (considerando todos filtrados, ou apenas os concluídos, se preferir. Vamos considerar o valor total dos agendamentos exibidos)
  const totalAgendamentos = dadosFiltrados.length;
  const totalConcluidos = dadosFiltrados.filter(a => a.status === 'concluido').length;
  const valorTotal = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.valor_servico), 0);

  return (
    <div className="appointments-report-container page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatório de Agendamentos</h1>
          <p className="page-subtitle print-hide">Acompanhe os serviços executados por dia e horário</p>
        </div>
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
        <div className="filters-grid">
          <div className="form-group">
            <label>Data Inicial</label>
            <input
              type="date"
              className="form-control"
              value={filtros.dataInicial}
              onChange={e => setFiltros({ ...filtros, dataInicial: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Data Final</label>
            <input
              type="date"
              className="form-control"
              value={filtros.dataFinal}
              onChange={e => setFiltros({ ...filtros, dataFinal: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Profissional</label>
            <select
              className="form-control"
              value={filtros.barbeiro}
              onChange={e => setFiltros({ ...filtros, barbeiro: e.target.value })}
            >
              <option value="">Todos os Profissionais</option>
              {barbeirosDisponiveis.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="form-control"
              value={filtros.status}
              onChange={e => setFiltros({ ...filtros, status: e.target.value })}
            >
              <option value="todos">Todos</option>
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="filter-actions" style={{ gridColumn: '1 / -1' }}>
            <button
              className="btn btn-primary"
              onClick={handleGerarRelatorio}
              disabled={loading}
              style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block' }}
            >
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stats-card">
          <div className="stats-card-icon" style={{ color: 'var(--color-info)' }}>📅</div>
          <div className="stats-card-label">Total de Agendamentos</div>
          <div className="stats-card-value">{totalAgendamentos}</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon" style={{ color: 'var(--color-success)' }}>✓</div>
          <div className="stats-card-label">Serviços Concluídos</div>
          <div className="stats-card-value positive">{totalConcluidos}</div>
        </div>

        <div className="stats-card">
          <div className="stats-card-icon" style={{ color: 'var(--color-gold)' }}>$</div>
          <div className="stats-card-label">Valor Previsto/Realizado</div>
          <div className="stats-card-value gold">{formatarMoeda(valorTotal)}</div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Profissional</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.length > 0 ? (
                dadosFiltrados.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ fontWeight: '500' }}>{formatarData(item.data)}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{item.hora.substring(0, 5)}</td>
                    <td>{item.cliente_nome}</td>
                    <td>{item.servico}</td>
                    <td>{item.barbeiro}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {formatarMoeda(item.valor_servico)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                    Nenhum agendamento encontrado para o filtro selecionado. Clique em "Gerar Relatório".
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
