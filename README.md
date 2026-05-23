# Sistema de Gestão para Barbearias - Por Lizard Solutions 🦎✨

Oi! Se você está lendo isso, provavelmente quer entender o que é este projeto e como ele funciona. Não se preocupe se você não entende de programação ou de códigos difíceis — eu vou te explicar tudo como se a gente estivesse conversando no intervalo da aula!

Este sistema foi **100% idealizado e desenvolvido pela equipe da Lizard Solutions**. Nós criamos um "caderno digital super inteligente" para ajudar donos de barbearias a organizarem seus negócios sem dor de cabeça, abandonando o papel e a caneta.

---

## 💈 O que este sistema faz? (Nossos Módulos)

Imagine que você tem uma barbearia. Você precisa anotar quem vai cortar o cabelo, vender produtos e saber quanto dinheiro entrou no fim do mês. Nosso sistema da Lizard Solutions faz tudo isso sozinho para você:

1. **A Agenda (Agendamentos e Relatórios):** 
   É como um calendário mágico. O profissional anota que o "João" vem às 15h para um corte. Quando o João corta o cabelo e o barbeiro marca como "Concluído", o sistema **sozinho** já manda o dinheiro desse corte lá para o controle do caixa (Financeiro). Você também consegue tirar relatórios em Excel e PDF para saber tudo o que rolou no dia!

2. **A Prateleira (Produtos e Estoque):** 
   Se o João comprou uma pomada de cabelo depois do corte, o barbeiro adiciona isso no sistema. O sistema é inteligente: ele tira uma pomada do estoque automaticamente e, se a pomada estiver acabando, ele exibe um aviso (modal) e não deixa vender o que não tem.

3. **O Caixa (Financeiro):**
   Aqui é onde o dono vê a mágica do dinheiro. O sistema soma tudo o que a barbearia ganhou (receitas) e subtrai o que ela gastou (como conta de luz). Tem cartões visuais bonitos mostrando o lucro e gráficos que acompanham o crescimento da loja. Assim como na agenda, os relatórios financeiros exportam lindas tabelas em PDF ou planilhas Excel perfeitas.

4. **A Segurança (Cadastros e Permissões):**
   Nem todo mundo pode ver quanto a barbearia ganha, certo? O dono pode criar senhas e decidir que um funcionário só pode ver a agenda, enquanto o gerente pode ver o financeiro. As senhas são "embaralhadas" e protegidas com matemática complexa para nenhum hacker conseguir descobrir.

---

## 🛠️ Como o sistema foi construído? (Especificações Técnicas)

Se você tem curiosidade de saber como as coisas são feitas por trás dos panos, aqui estão os materiais (tecnologias) que a **Lizard Solutions** usou para construir essa "casa virtual":

- **A Fachada e os Móveis (Frontend):** Usamos **React e Vite**. É isso que faz os botões serem fáceis de clicar, as cores serem elegantes (criamos um design premium escuro com dourado) e garante que as telas não "quebrem" se você abrir pelo celular (tudo é 100% responsivo).
- **O Cérebro e as Engrenagens (Backend):** Usamos **Node.js (versão 22) com o framework Express**. É o motorzinho invisível que funciona no servidor. Ele faz as contas matemáticas, confere as senhas e direciona as informações.
- **A Memória (Banco de Dados):** Usamos o **PostgreSQL 16**. Pense nele como um gigantesco arquivo de aço blindado onde guardamos as informações, datas e números de todos os clientes para nunca perdermos nada.
- **A Caixa de Transporte (Docker e Docker Compose):** Isso é como um "pacote mágico de mudança". Em vez de você ter que instalar mil coisas e programas diferentes no seu computador para o nosso sistema rodar, o Docker empacota o site, o banco de dados e as engrenagens tudo numa caixa só. Você dá um comando, e ele monta a barbearia inteira no seu PC, pronta para uso!

---

## 🚀 Como testar o sistema no seu computador?

Graças à nossa "Caixa de Transporte" (Docker), é muito simples ligar o sistema.

**O que você precisa ter instalado no PC:**
- Um programa chamado **Docker Desktop** (ele vai abrir os pacotes).
- O **Git** (um programa que serve apenas para baixar os arquivos pro seu PC).

**Passo a passo:**

1. Abra o "Terminal" (aquela telinha preta de comandos de computador) e baixe nossos arquivos colando isso:
   ```bash
   git clone https://github.com/lizardSolution/brejao.git
   cd brejao
   ```

2. Agora, diga para o Docker construir nossa barbearia virtual com este comando:
   ```bash
   docker-compose up --build -d
   ```
   *(Pode demorar uns minutinhos na primeira vez, ele está pintando as paredes e arrumando a casa!)*

3. Pronto! Abra o seu navegador de internet de preferência (Google Chrome, Safari, etc) e digite na barra de endereço:
   👉 **http://localhost:3000**

### 🔑 Quer entrar no sistema?
Como você é o "dono" do sistema para testar, use esse e-mail e senha de teste que deixamos criados para você conseguir entrar:
- **E-mail:** `admin@barbearia.com`
- **Senha:** `admin123`

---
*Projetado, desenhado e desenvolvido com amor à tecnologia por **Lizard Solutions**.* 🦎💼
