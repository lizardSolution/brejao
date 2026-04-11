-- Tabelas Principais

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) DEFAULT 'comum',
  permissoes JSONB DEFAULT '{"cadastros": {"incluir": true, "alterar": true, "excluir": true, "acessar": true}, "agendamentos": {"incluir": true, "alterar": true, "excluir": true, "acessar": true}, "produtos": {"incluir": true, "alterar": true, "excluir": true, "acessar": true}, "financeiro": {"incluir": true, "alterar": true, "excluir": true, "acessar": true}}'::jsonb
);

CREATE TABLE IF NOT EXISTS barbeiros (
  id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  observacoes TEXT
);

CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  duracao INT DEFAULT 30
);

CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  preco DECIMAL(10,2) NOT NULL,
  estoque INT DEFAULT 0,
  categoria VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(20),
  servico VARCHAR(100) NOT NULL,
  valor_servico DECIMAL(10,2) NOT NULL,
  barbeiro VARCHAR(100) NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'agendado',
  observacoes TEXT,
  criado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  alterado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  excluido_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  excluido_em TIMESTAMP,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agendamentos_itens (
  id SERIAL PRIMARY KEY,
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contas_pagar (
  id UUID PRIMARY KEY,
  descricao VARCHAR(200) NOT NULL,
  categoria VARCHAR(50),
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id UUID PRIMARY KEY,
  descricao VARCHAR(200) NOT NULL,
  origem VARCHAR(50),
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome VARCHAR(100) NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  cliente VARCHAR(100),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
