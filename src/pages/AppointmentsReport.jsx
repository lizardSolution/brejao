import { useState, useEffect } from 'react';
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
      const res = await fetch('http://localhost:3000/api/agendamentos');

      if (res.ok) {
        const dados = await res.json();

        // Extrair lista de barbeiros únicos para o filtro
        const barbeiros = [...new Set(dados.map(a => a.barbeiro).filter(Boolean))].sort();
        setBarbeirosDisponiveis(barbeiros);

        setAgendamentos(dados);
      }
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

  // Calcular Totais (considerando todos filtrados, ou apenas os concluídos, se preferir. Vamos considerar o valor total dos agendamentos exibidos)
  const totalAgendamentos = dadosFiltrados.length;
  const totalConcluidos = dadosFiltrados.filter(a => a.status === 'concluido').length;
  const valorTotal = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.valor_servico), 0);

  return (
    <div className="appointments-report-container page-container">
      <div className="page-header">
        <h1 className="page-title">Relatório de Agendamentos</h1>
        <p className="page-subtitle">Acompanhe os serviços executados por dia e horário</p>
      </div>

      <div className="card report-filters-card">
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

      <div className="dashboard-cards" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            📅
          </div>
          <div className="stat-info">
            <span className="stat-label">Total de Agendamentos</span>
            <span className="stat-value">{totalAgendamentos}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            ✓
          </div>
          <div className="stat-info">
            <span className="stat-label">Serviços Concluídos</span>
            <span className="stat-value">{totalConcluidos}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            $
          </div>
          <div className="stat-info">
            <span className="stat-label">Valor Previsto/Realizado</span>
            <span className="stat-value">{formatarMoeda(valorTotal)}</span>
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="modern-table">
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
