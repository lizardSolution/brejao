import { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { formatarData, formatarMoeda, diasDoMes, dataParaChave, dataHoje } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import './Appointments.css';

export default function Appointments() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [dataSelecionada, setDataSelecionada] = useState(dataHoje());
  const [modalAberto, setModalAberto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroBarbeiro, setFiltroBarbeiro] = useState('todos');

  const [editandoId, setEditandoId] = useState(null);
  const [produtoAvulso, setProdutoAvulso] = useState({ id: '', quantidade: 1 });
  const [servicoAvulso, setServicoAvulso] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, tipo: null, id: null, index: null });
  const [alertMessage, setAlertMessage] = useState(null);

  async function confirmarExclusao() {
    if (confirmDelete.tipo === 'agendamento' && confirmDelete.id) {
      try {
        await api.delete(`agendamentos/${confirmDelete.id}`);
        setAgendamentos((prev) => prev.filter((a) => a.id !== confirmDelete.id));
        setConfirmDelete({ isOpen: false, tipo: null, id: null, index: null });
      } catch (e) {
        console.error(e);
      }
    } else if (confirmDelete.tipo === 'produto_vinculado' && confirmDelete.index !== null) {
      const idx = confirmDelete.index;
      const item = formData.produtos_vinculados[idx];
      try {
        if (item.id) {
          await api.delete(`agendamentos_itens/${item.id}`);
        }
        setFormData(prev => ({
          ...prev,
          produtos_vinculados: prev.produtos_vinculados.filter((_, i) => i !== idx)
        }));
        setConfirmDelete({ isOpen: false, tipo: null, id: null, index: null });
      } catch (e) { console.error(e); }
    } else if (confirmDelete.tipo === 'servico_vinculado' && confirmDelete.index !== null) {
      const idx = confirmDelete.index;
      const item = formData.servicos_vinculados[idx];
      try {
        if (item.id) {
          await api.delete(`agendamentos_servicos/${item.id}`);
        }
        setFormData(prev => ({
          ...prev,
          servicos_vinculados: prev.servicos_vinculados.filter((_, i) => i !== idx)
        }));
        setConfirmDelete({ isOpen: false, tipo: null, id: null, index: null });
      } catch (e) { console.error(e); }
    }
  }

  const { usuario: user } = useAuth();
  const perms = (user?.perfil === 'admin' || !user?.permissoes)
    ? { acessar: true, incluir: true, alterar: true, excluir: true }
    : (user.permissoes.agendamentos || { acessar: false, incluir: false, alterar: false, excluir: false });

  const [formData, setFormData] = useState({
    clienteId: '',
    cliente: '',
    telefone: '',
    barbeiro: '',
    data: dataHoje(),
    hora: '',
    observacoes: '',
    servicos_vinculados: [],
    produtos_vinculados: []
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [ag, srv, bar, cli, prod, itens, agServicos] = await Promise.all([
        api.get('agendamentos'),
        api.get('servicos'),
        api.get('barbeiros'),
        api.get('clientes'),
        api.get('produtos'),
        api.get('agendamentos_itens'),
        api.get('agendamentos_servicos')
      ]);

      const agComItens = ag.map(a => {
        // Produtos vinculados
        const meusItens = itens.filter(i => i.agendamento_id === a.id);
        const pv = meusItens.map(i => {
          const pFull = prod.find(p => p.id === i.produto_id) || {};
          return {
            id: i.id,
            produto_id: i.produto_id,
            nome: pFull.nome || 'Desconhecido',
            quantidade: i.quantidade,
            preco: Number(i.preco_unitario),
            total: Number(i.valor_total)
          };
        });
        // Serviços vinculados
        const meusServicos = agServicos.filter(s => s.agendamento_id === a.id);
        const sv = meusServicos.map(s => ({
          id: s.id,
          servico_id: s.servico_id,
          nome: s.nome,
          preco: Number(s.preco)
        }));
        return { ...a, produtos_vinculados: pv, servicos_vinculados: sv };
      });

      setAgendamentos(agComItens);
      setServicos(srv);
      setBarbeiros(bar);
      setClientes(cli);
      setProdutos(prod);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  const dias = useMemo(() => diasDoMes(anoAtual, mesAtual), [anoAtual, mesAtual]);

  const nomeMes = new Date(anoAtual, mesAtual).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const agendamentosDoDia = useMemo(() => {
    let filtrados = agendamentos.filter((a) => {
      const dbDate = a.data.includes('T') ? a.data.split('T')[0] : a.data;
      return dbDate === dataSelecionada;
    });
    if (filtroStatus !== 'todos') {
      filtrados = filtrados.filter((a) => a.status === filtroStatus);
    }
    if (filtroBarbeiro !== 'todos') {
      filtrados = filtrados.filter((a) => a.barbeiro === filtroBarbeiro);
    }
    return filtrados.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [agendamentos, dataSelecionada, filtroStatus, filtroBarbeiro]);

  const agendamentosPorDia = useMemo(() => {
    const mapa = {};
    agendamentos.forEach((a) => {
      const dbDate = a.data.includes('T') ? a.data.split('T')[0] : a.data;
      if (!mapa[dbDate]) mapa[dbDate] = [];
      mapa[dbDate].push(a);
    });
    return mapa;
  }, [agendamentos]);

  function navegarMes(direcao) {
    let novoMes = mesAtual + direcao;
    let novoAno = anoAtual;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    } else if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }
    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  }

  function abrirNovoAgendamento() {
    setEditandoId(null);
    setProdutoAvulso({ id: '', quantidade: 1 });
    setServicoAvulso('');
    setFormData({
      clienteId: '',
      cliente: '',
      telefone: '',
      barbeiro: barbeiros.find(b => b.ativo)?.nome || '',
      data: dataSelecionada,
      hora: '',
      observacoes: '',
      servicos_vinculados: [],
      produtos_vinculados: []
    });
    setModalAberto(true);
  }

  function abrirEditarAgendamento(agendamento) {
    setEditandoId(agendamento.id);
    setProdutoAvulso({ id: '', quantidade: 1 });
    setServicoAvulso('');
    const bdDate = agendamento.data.includes('T') ? agendamento.data.split('T')[0] : agendamento.data;
    setFormData({
      clienteId: agendamento.cliente_id || '',
      cliente: agendamento.cliente_nome || '',
      telefone: agendamento.telefone || '',
      barbeiro: agendamento.barbeiro,
      data: bdDate,
      hora: agendamento.hora ? agendamento.hora.slice(0, 5) : '',
      observacoes: agendamento.observacoes || '',
      servicos_vinculados: agendamento.servicos_vinculados || [],
      produtos_vinculados: agendamento.produtos_vinculados || []
    });
    setModalAberto(true);
  }

  function handleClienteChange(e) {
    const valor = e.target.value;
    if (valor === 'avulso') {
      setFormData({ ...formData, clienteId: '', cliente: '', telefone: '' });
    } else {
      const cli = clientes.find((c) => c.id === valor);
      if (cli) {
        setFormData({ ...formData, clienteId: cli.id, cliente: cli.nome, telefone: cli.telefone || '' });
      }
    }
  }

  // ===== SERVIÇOS =====
  function adicionarServicoAoAgendamento() {
    if (!servicoAvulso) return;
    const srv = servicos.find(s => s.id === servicoAvulso);
    if (!srv) return;

    const novoServico = {
      servico_id: srv.id,
      nome: srv.nome,
      preco: Number(srv.preco)
    };

    setFormData(prev => ({
      ...prev,
      servicos_vinculados: [...prev.servicos_vinculados, novoServico]
    }));
    setServicoAvulso('');
  }

  function removerServicoVinculado(index) {
    const item = formData.servicos_vinculados[index];
    if (item.id) {
      setConfirmDelete({ isOpen: true, tipo: 'servico_vinculado', index });
    } else {
      setFormData(prev => ({
        ...prev,
        servicos_vinculados: prev.servicos_vinculados.filter((_, i) => i !== index)
      }));
    }
  }

  // ===== PRODUTOS =====
  function adicionarProdutoAoAgendamento() {
    if (!produtoAvulso.id || produtoAvulso.quantidade < 1) return;
    const prod = produtos.find(p => p.id === produtoAvulso.id);
    if (!prod) return;

    if (prod.estoque < produtoAvulso.quantidade) {
      setAlertMessage('Quantidade maior que o estoque atual!');
      return;
    }

    const novoVinculo = {
      produto_id: prod.id,
      nome: prod.nome,
      quantidade: produtoAvulso.quantidade,
      preco: Number(prod.preco),
      total: Number(prod.preco) * produtoAvulso.quantidade
    };

    setFormData(prev => ({
      ...prev,
      produtos_vinculados: [...prev.produtos_vinculados, novoVinculo]
    }));
    setProdutoAvulso({ id: '', quantidade: 1 });
  }

  function removerProdutoVinculado(index) {
    const item = formData.produtos_vinculados[index];
    if (item.id) {
      setConfirmDelete({ isOpen: true, tipo: 'produto_vinculado', index });
    } else {
      setFormData(prev => ({
        ...prev,
        produtos_vinculados: prev.produtos_vinculados.filter((_, i) => i !== index)
      }));
    }
  }

  async function salvarAgendamento(e) {
    e.preventDefault();

    if (!formData.cliente || !formData.hora || !formData.barbeiro) {
      return;
    }

    if (formData.servicos_vinculados.length === 0) {
      setAlertMessage('Adicione pelo menos um serviço ao agendamento.');
      return;
    }

    // Construir resumo de serviços para colunas legado
    const nomeServicos = formData.servicos_vinculados.map(s => s.nome).join(' + ');
    const valorServicos = formData.servicos_vinculados.reduce((sum, s) => sum + s.preco, 0);

    const payloadBase = {
      cliente_id: formData.clienteId || null,
      cliente_nome: formData.cliente,
      telefone: formData.telefone || null,
      servico: nomeServicos,
      valor_servico: valorServicos,
      barbeiro: formData.barbeiro,
      data: formData.data,
      hora: formData.hora,
      observacoes: formData.observacoes || null
    };

    try {
      let agendamentoId = editandoId;
      if (editandoId) {
        await api.put(`agendamentos/${editandoId}`, payloadBase);
      } else {
        const criado = await api.post('agendamentos', { ...payloadBase, status: 'agendado' });
        agendamentoId = criado.id;
      }

      // Sincronizar serviços novos
      for (const item of formData.servicos_vinculados) {
        if (!item.id) {
          await api.post('agendamentos_servicos', {
            agendamento_id: agendamentoId,
            servico_id: item.servico_id,
            nome: item.nome,
            preco: item.preco
          });
        }
      }

      // Sincronizar produtos novos inseridos
      for (const item of formData.produtos_vinculados) {
        if (!item.id) {
          await api.post('agendamentos_itens', {
            agendamento_id: agendamentoId,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco,
            valor_total: item.total
          });
        }
      }

      // Recarrega todos pra garantir a composição correta no state
      carregarDados();
      setModalAberto(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function alterarStatus(id, novoStatus) {
    const agendamento = agendamentos.find(a => a.id === id);
    if (!agendamento) return;

    try {
      const payload = { status: novoStatus };

      // Update local state optimistic
      setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: novoStatus } : a)));

      // Call API
      await api.put(`agendamentos/${id}`, payload);

      // Checkout Logic
      if (novoStatus === 'concluido' && agendamento.status !== 'concluido') {
        const bdDate = agendamento.data.includes('T') ? agendamento.data.split('T')[0] : agendamento.data;

        // Calcular total dos produtos
        const pv = agendamento.produtos_vinculados || [];
        const totalProdutos = pv.reduce((sum, p) => sum + Number(p.total), 0);

        // Calcular total dos serviços
        const sv = agendamento.servicos_vinculados || [];
        const totalServicos = sv.reduce((sum, s) => sum + Number(s.preco), 0);

        // 1. Dar baixa no estoque e gerar vendas individuais pra cada produto ligado
        if (pv.length > 0) {
          // Criar uma venda agrupada
          const venda = await api.post('vendas', {
            cliente: agendamento.cliente_nome,
            valor_total: totalProdutos
          });

          for (const item of pv) {
            const pFull = produtos.find(px => px.id === item.produto_id);
            if (pFull) {
              const novoEstoque = parseInt(pFull.estoque) - parseInt(item.quantidade);
              await api.put(`produtos/${pFull.id}`, { ...pFull, estoque: novoEstoque });

              await api.post('vendas_itens', {
                venda_id: venda.id,
                produto_id: pFull.id,
                produto_nome: pFull.nome,
                quantidade: item.quantidade,
                preco_unitario: item.preco,
                valor_total: item.total,
              });
            }
          }
        }

        // Caso precisemos recarregar produtos na tela por segurança:
        const novosProdutos = await api.get('produtos');
        setProdutos(novosProdutos);

        // 2. Gerar conta a receber UNIFICADA (Serviços + Produtos)
        const valorFinal = totalServicos + totalProdutos;
        const descServicos = sv.map(s => s.nome).join(' + ');
        const descComplemento = pv.length > 0 ? ` (+ ${pv.length} Produto/s)` : '';

        const contaReceber = {
          descricao: `[Agendamento] ${descServicos}${descComplemento} - ${agendamento.cliente_nome}`,
          origem: 'Serviço/Produto',
          valor: valorFinal,
          data_vencimento: bdDate,
          status: 'recebido',
          data_recebimento: dataHoje()
        };
        await api.post('contas_receber', contaReceber);
      }
    } catch (e) {
      console.error(e);
      carregarDados(); // Reverte em caso de falha catastrófica
    }
  }

  function excluirAgendamento(id) {
    setConfirmDelete({ isOpen: true, tipo: 'agendamento', id });
  }

  const hojeChave = dataParaChave(hoje);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Valor total simulado no Modal
  const totalServicosSim = formData.servicos_vinculados.reduce((sum, s) => sum + s.preco, 0);
  const totalProdutosSim = formData.produtos_vinculados.reduce((sum, p) => sum + p.total, 0);
  const totalGeralModal = Number(totalServicosSim) + Number(totalProdutosSim);

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1 className="page-title">
          <span>Agendamentos</span>
        </h1>
        {perms.incluir && (
          <button className="btn btn-primary" onClick={abrirNovoAgendamento}>
            + Novo Agendamento
          </button>
        )}
      </div>

      {/* Calendário */}
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={() => navegarMes(-1)}>
            ←
          </button>
          <span className="calendar-title">{nomeMes}</span>
          <button className="calendar-nav-btn" onClick={() => navegarMes(1)}>
            →
          </button>
        </div>

        <div className="calendar-grid">
          {diasSemana.map((dia) => (
            <div key={dia} className="calendar-weekday">
              {dia}
            </div>
          ))}

          {dias.map((dia, i) => {
            const chave = dataParaChave(dia.data);
            const agDia = agendamentosPorDia[chave] || [];
            return (
              <div
                key={i}
                className={`calendar-day ${dia.foraDoMes ? 'fora-do-mes' : ''} ${chave === hojeChave ? 'hoje' : ''
                  } ${chave === dataSelecionada ? 'selecionado' : ''}`}
                onClick={() => {
                  setDataSelecionada(chave);
                }}
              >
                <div className="calendar-day-number">{dia.data.getDate()}</div>
                {agDia.length > 0 && (
                  <div className="calendar-day-dots">
                    {agDia.slice(0, 3).map((a, j) => (
                      <span key={j} className={`calendar-dot ${a.status}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtros + Lista */}
      <div className="appointments-section">
        <div className="appointments-section-header">
          <h2 className="appointments-date-title">
            {formatarData(dataSelecionada)} — {agendamentosDoDia.length} agendamento(s)
          </h2>
        </div>

        <div className="filter-bar">
          <select
            className="form-select"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            className="form-select"
            value={filtroBarbeiro}
            onChange={(e) => setFiltroBarbeiro(e.target.value)}
          >
            <option value="todos">Todos os Barbeiros</option>
            {barbeiros.map((b) => (
              <option key={b.id} value={b.nome}>
                {b.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="appointments-list">
          {agendamentosDoDia.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">—</div>
              <p className="empty-state-text">Nenhum agendamento para esta data</p>
              {perms.incluir && (
                <button className="btn btn-primary" onClick={abrirNovoAgendamento}>
                  + Novo Agendamento
                </button>
              )}
            </div>
          ) : (
            agendamentosDoDia.map((a, index) => {
              const pv = a.produtos_vinculados || [];
              const sv = a.servicos_vinculados || [];
              const showDblClickTip = a.status !== 'concluido' && a.status !== 'cancelado';

              // Nome dos serviços para exibição
              const nomeServicos = sv.length > 0
                ? sv.map(s => s.nome).join(' + ')
                : a.servico;
              const totalServicos = sv.length > 0
                ? sv.reduce((sum, s) => sum + Number(s.preco), 0)
                : Number(a.valor_servico);

              return (
                <div
                  className="appointment-card"
                  key={a.id}
                  style={{ animationDelay: `${index * 0.05}s`, cursor: showDblClickTip ? 'pointer' : 'default' }}
                  onDoubleClick={() => showDblClickTip ? abrirEditarAgendamento(a) : null}
                  title={showDblClickTip ? "Duplo clique para editar ou adicionar produtos" : ""}
                >
                  <div className="appointment-time">
                    <span className="appointment-time-value">{a.hora ? a.hora.slice(0, 5) : ''}</span>
                  </div>
                  <div className="appointment-info">
                    <span className="appointment-client">{a.cliente_nome}</span>
                    <div className="appointment-details">
                      <span className="appointment-detail-item">{nomeServicos}</span>
                      <span className="appointment-detail-item">{a.barbeiro}</span>
                      <span className="appointment-detail-item">
                        {formatarMoeda(totalServicos)}
                        {pv.length > 0 && <span style={{ color: 'var(--color-gold)', marginLeft: 4 }}>+ Produtos</span>}
                      </span>
                      {a.telefone && (
                        <span className="appointment-detail-item">{a.telefone}</span>
                      )}
                    </div>
                    {a.observacoes && (
                      <span className="appointment-detail-item" style={{ marginTop: '4px', fontStyle: 'italic', opacity: 0.7 }}>
                        {a.observacoes}
                      </span>
                    )}
                    {(sv.length > 1 || pv.length > 0) && (
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#666', display: 'flex', gap: '12px' }}>
                        {sv.length > 1 && <span>{sv.length} serviço(s)</span>}
                        {pv.length > 0 && <span>{pv.length} produto(s)</span>}
                      </div>
                    )}
                  </div>
                  <div className="appointment-actions">
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                    {perms.alterar ? (
                      <select
                        className="appointment-status-select"
                        value={a.status}
                        onChange={(e) => alterarStatus(a.id, e.target.value)}
                      >
                        <option value="agendado">Agendado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    ) : (
                      <span className="appointment-status-locked" style={{ margin: '0 8px', fontSize: '0.9rem', color: '#888' }}>—</span>
                    )}
                    {(showDblClickTip && perms.alterar) && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => abrirEditarAgendamento(a)}
                        title="Editar/Adicionar Produtos"
                      >
                        Editar
                      </button>
                    )}
                    {perms.excluir && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => excluirAgendamento(a.id)}
                        title="Excluir"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Agendamento (Novo / Edição) */}
      <Modal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        title={editandoId ? "Editar Agendamento / Checkout" : "Novo Agendamento"}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalAberto(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={salvarAgendamento}>
              {editandoId ? "Salvar Alterações" : "Salvar Agendamento"}
            </button>
          </>
        }
      >
        <form onSubmit={salvarAgendamento}>
          {/* Seção CLIENTE + BARBEIRO + DATA/HORA */}
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Cliente *</label>
              <select
                className="form-select"
                value={formData.clienteId || (formData.cliente ? 'avulso' : '')}
                onChange={handleClienteChange}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
                <option value="avulso">+ Cliente Avulso / Novo</option>
              </select>
            </div>

            {(formData.clienteId === '' && formData.cliente !== undefined) && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome (Avulso) *</label>
                  <input
                    className="form-input"
                    placeholder="Nome do cliente"
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone (Avulso)</label>
                  <input
                    className="form-input"
                    placeholder="(11) 99999-9999"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Barbeiro *</label>
              <select
                className="form-select"
                value={formData.barbeiro}
                onChange={(e) => setFormData({ ...formData, barbeiro: e.target.value })}
                required
              >
                <option value="">Selecione</option>
                {barbeiros.filter((b) => b.ativo).map((b) => (
                  <option key={b.id} value={b.nome}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input
                  className="form-input"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hora *</label>
                <input
                  className="form-input"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea
                className="form-textarea"
                placeholder="Observações adicionais..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
          </div>

          {/* SEÇÃO SERVIÇOS */}
          <div className="checkout-section animate-fadeIn" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Serviços *
            </h3>

            <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: '2' }}>
                <label className="form-label">Adicionar Serviço</label>
                <select
                  className="form-select"
                  value={servicoAvulso}
                  onChange={(e) => setServicoAvulso(e.target.value)}
                >
                  <option value="">Selecione um serviço...</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {formatarMoeda(s.preco)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-secondary" onClick={adicionarServicoAoAgendamento}>Adicionar</button>
              </div>
            </div>

            {formData.servicos_vinculados.length > 0 && (
              <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '8px', padding: '12px' }}>
                <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Serviço</th>
                      <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.servicos_vinculados.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 0' }}>{s.nome}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatarMoeda(s.preco)}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          <button type="button" onClick={() => removerServicoVinculado(i)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }} title="Remover">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--color-border)' }}>
                  <strong>Total em Serviços:</strong>
                  <strong>{formatarMoeda(totalServicosSim)}</strong>
                </div>
              </div>
            )}

            {formData.servicos_vinculados.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                Nenhum serviço adicionado. Selecione pelo menos um serviço acima.
              </div>
            )}
          </div>

          {/* SEÇÃO PRODUTOS */}
          <div className="checkout-section animate-fadeIn" style={{ paddingTop: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Vincular Produtos
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span>
            </h3>

            <div className="form-row" style={{ alignItems: 'flex-end', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: '2' }}>
                <label className="form-label">Produto</label>
                <select
                  className="form-select"
                  value={produtoAvulso.id}
                  onChange={(e) => setProdutoAvulso({ ...produtoAvulso, id: e.target.value })}
                >
                  <option value="">Selecione para adicionar...</option>
                  {produtos.filter(p => p.estoque > 0).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {formatarMoeda(p.preco)} (Est: {p.estoque})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: '1' }}>
                <label className="form-label">Qtd.</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={produtoAvulso.quantidade}
                  onChange={(e) => setProdutoAvulso({ ...produtoAvulso, quantidade: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="form-group">
                <button type="button" className="btn btn-secondary" onClick={adicionarProdutoAoAgendamento}>Adicionar</button>
              </div>
            </div>

            {formData.produtos_vinculados.length > 0 && (
              <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '8px', padding: '12px' }}>
                <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Item</th>
                      <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Qtd</th>
                      <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.produtos_vinculados.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 0' }}>{p.nome}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{p.quantidade}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{formatarMoeda(p.total)}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          <button type="button" onClick={() => removerProdutoVinculado(i)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }} title="Remover">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--color-border)' }}>
                  <strong>Total em Produtos:</strong>
                  <strong>{formatarMoeda(totalProdutosSim)}</strong>
                </div>
              </div>
            )}

            {/* Totalizador Final */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid var(--color-gold)', borderRadius: '8px', marginTop: '16px' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--color-gold)', fontWeight: 600 }}>Total do Agendamento:</span>
              <span style={{ fontSize: '1.2rem', color: 'var(--color-gold)', fontWeight: 700 }}>{formatarMoeda(totalGeralModal)}</span>
            </div>
          </div>

        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, tipo: null, id: null, index: null })}
        title="Confirmar Exclusão"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete({ isOpen: false, tipo: null, id: null, index: null })}>Cancelar</button>
            <button className="btn btn-danger" onClick={confirmarExclusao}>Excluir</button>
          </>
        }
      >
        <p style={{ marginTop: '10px', fontSize: '1.1rem', color: 'var(--color-text)' }}>
          {confirmDelete.tipo === 'agendamento'
            ? 'Tem certeza que deseja excluir este agendamento?'
            : confirmDelete.tipo === 'servico_vinculado'
              ? 'Deseja remover este serviço do agendamento?'
              : 'Deseja remover este produto do agendamento agora?'}
          <br /><br />
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
