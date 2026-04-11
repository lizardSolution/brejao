// Formatar valor monetário em BRL
export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

// Formatar data para exibição (dd/mm/aaaa)
export function formatarData(dataStr) {
  if (!dataStr) return '';
  const data = new Date(dataStr + 'T00:00:00');
  return data.toLocaleDateString('pt-BR');
}

// Formatar data e hora
export function formatarDataHora(dataStr) {
  if (!dataStr) return '';
  const data = new Date(dataStr);
  return data.toLocaleString('pt-BR');
}

// Formatar hora (HH:mm)
export function formatarHora(horaStr) {
  if (!horaStr) return '';
  return horaStr.substring(0, 5);
}

// Obter data atual no formato YYYY-MM-DD
export function dataHoje() {
  const hoje = new Date();
  return hoje.toISOString().split('T')[0];
}

// Obter mês/ano atual no formato YYYY-MM
export function mesAtual() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}`;
}

// Obter nome do mês
export function nomeMes(mesAno) {
  const [ano, mes] = mesAno.split('-');
  const data = new Date(ano, parseInt(mes) - 1, 1);
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Obter dias do mês para o calendário
export function diasDoMes(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const dias = [];

  // Dias do mês anterior para preencher a semana
  const diaDaSemana = primeiroDia.getDay();
  for (let i = diaDaSemana - 1; i >= 0; i--) {
    const d = new Date(ano, mes, -i);
    dias.push({ data: d, foraDoMes: true });
  }

  // Dias do mês atual
  for (let i = 1; i <= ultimoDia.getDate(); i++) {
    dias.push({ data: new Date(ano, mes, i), foraDoMes: false });
  }

  // Dias do próximo mês para completar a grade
  const restante = 42 - dias.length;
  for (let i = 1; i <= restante; i++) {
    dias.push({ data: new Date(ano, mes + 1, i), foraDoMes: true });
  }

  return dias;
}

// Formatar data para chave de comparação YYYY-MM-DD
export function dataParaChave(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Gerar cor baseada em status
export function corStatus(status) {
  const cores = {
    agendado: '#D4A843',
    confirmado: '#3498DB',
    concluido: '#2ECC71',
    cancelado: '#E74C3C',
    pendente: '#D4A843',
    pago: '#2ECC71',
    recebido: '#2ECC71',
    vencido: '#E74C3C',
  };
  return cores[status?.toLowerCase()] || '#999';
}
