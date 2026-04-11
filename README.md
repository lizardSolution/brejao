# Lizard Solutions - Sistema de Gestão para Barbearias ✂️🚀

Bem-vindo ao **Lizard Solutions**, uma plataforma completa e moderna desenvolvida para simplificar e automatizar toda a rotina operacional de uma barbearia. Desde a organização da agenda dos profissionais até o rigoroso controle de produtos e fluxo de caixa, este sistema oferece uma solução ponta-a-ponta com uma interface amigável (UX/UI) e engenharia de software robusta.

## 🌟 Funcionalidades e Módulos do Sistema

### 1. 📅 Módulo de Agendamentos (Appointments)
- **Calendário Dinâmico:** Visualização diária de agendamentos com filtro por status e profissional.
- **Ecossistema Integrado:** Ao concluir um agendamento, o sistema permite vincular produtos utilizados no serviço (Checkout Completo).
- **Baixa Automática:** Agendamentos "Concluídos" geram automaticamente a receita no módulo financeiro e descontam os produtos atrelados no módulo de estoque.

### 2. 📦 Módulo de Produtos e Estoque (Products/Pdv)
- **Gestão de Catálogo:** Cadastro de produtos com controle de precificação e categorias (ex: finalizadores, perfumaria).
- **Venda Balcão (PDV Avulso):** Venda rápida de produtos que debita o estoque imediatamente e lança as vendas nas "Contas a Receber".
- **Alertas Inteligentes:** Notificações seguras que impedem a venda ou uso de itens abaixo do estoque disponível através de Modais de Aviso em tempo real.

### 3. 💵 Módulo Financeiro (Financial)
- **Dashboard de Lucro Líquido:** Indicadores de Receitas, Despesas, Pendências e Lucro em tempo real.
- **Gráficos de Performance:** Acompanhamento visual dos últimos 6 meses (Receitas vs Despesas).
- **Controles de Pagamento:** Gestão de Contas a Pagar e Contas a Receber, alteração de status (`pendente`, `pago/recebido`) e geração contábil automatizada pelas outras áreas do app.

### 4. 👥 Módulo de Cadastros (Registers) e Segurança (RBAC)
- **Registro de Entidades:** Gestão central de Clientes, Barbeiros (profissionais) e Usuários do sistema.
- **Autenticação com Criptografia:** Senhas de acesso salvas via "Hush" utilizando o `bcryptjs`.
- **Controle de Acesso em Matriz (Permissões):** Perfis de usuário (Admin, Barbeiro, Comum). Administradores podem definir níveis restritamente granulares de quem pode Consultar, Criar, Editar ou Excluir dentro de _cada_ aba do sistema, blindando a segurança dos dados.

---

## 🛠️ Tecnologias Utilizadas
Este projeto utiliza uma stack JavaScript isolada e empacotada em arquitetura de Containers!
- **Frontend:** React + Vite (Vanilla CSS para estilização "Dark/Gold Theme" Customizada).
- **Backend:** Node.js (Ambiente Node 22 com ECMAScript Modules) + Servidor Express 5.
- **Banco de Dados:** PostgreSQL 16.
- **Deploy/Ambientação:** Totalmente conteneirizado via Docker e Docker Compose.

---

## ⚙️ Como executar este projeto localmente

Devido à excelente padronização com **Docker**, rodar o Lizard Solutions no seu ambiente é rápido e dispensa a configuração minuciosa do Node.js ou do Postgres na sua própria máquina.

### Requisitos Mínimos (Setup Recomendado)
- **Docker Engine** e **Docker Compose** instalados (Ou Docker Desktop no Windows/Mac).
- Pelo menos as portas `3000` (App) e `5432` (Banco de Dados) não podem estar em uso por outros serviços na máquina.
- Git (Para clonar o repositório).

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/assuncax/GMScheduler.git
   cd GMScheduler
   ```

2. **Inicie os Containers Docker:**
   ```bash
   docker-compose up --build -d
   ```
   > 🔹 O comando `--build` garantirá que o npm instale e recompile as versões mais novas dentro do laboratório virtual do Docker, e o `-d` vai rodar de forma "silenciosa".

3. **Acesse a Aplicação:**
   - Abram seu navegador e entre no ambiente gerado através de: `http://localhost:3000`

### 🔑 Credenciais Padrão de Acesso Master
No primeiro uso, o sistema injetará automaticamente um banco de dados relacional populado inicial. Você deve acessar usando:
- **E-mail:** `admin@barbearia.com`
- **Senha:** `admin123`

---
*Desenvolvido por **Lizard Solutions**.*
