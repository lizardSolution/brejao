import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query } from './db.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const hasAutoIncrement = (tableName) => ['agendamentos_itens'].includes(tableName);
const hasSoftDelete = (tableName) => ['agendamentos'].includes(tableName);
const hasAudit = (tableName) => ['agendamentos'].includes(tableName);

const tableToModuleMap = {
  usuarios: 'cadastros', barbeiros: 'cadastros', clientes: 'cadastros', servicos: 'cadastros',
  agendamentos: 'agendamentos', agendamentos_itens: 'agendamentos',
  produtos: 'produtos', vendas: 'produtos',
  contas_pagar: 'financeiro', contas_receber: 'financeiro'
};

const actionMap = {
  GET: 'acessar', POST: 'incluir', PUT: 'alterar', DELETE: 'excluir'
};

const checkPermission = async (userId, method, tableName) => {
  if (!userId) return false;
  // Busca o usuário logado para validar permissões
  const userQuery = await query('SELECT perfil, permissoes FROM usuarios WHERE id = $1', [userId]);
  if (userQuery.rows.length === 0) return false;
  
  const user = userQuery.rows[0];
  // Se for admin implícito total:
  if (user.perfil === 'admin' && !user.permissoes) return true;
  
  const moduleName = tableToModuleMap[tableName];
  const requiredAction = actionMap[method];
  
  if (!moduleName || !user.permissoes) return true; // Se não houver módulo mapeado, deixa passar (ex: rotas n mapeadas ok)
  
  const modPerms = user.permissoes[moduleName];
  if (!modPerms) return false;
  return modPerms[requiredAction] === true;
};

// Modifica a payload de usuários para fazer Hash na senha
const processUserPassword = async (payload) => {
  if (payload.senha && !payload.senha.startsWith('$2')) {
    payload.senha = await bcrypt.hash(payload.senha, 10);
  }
  // Se tiver enviando permissoes como objeto JS, garantir JSON caso necessário (embora pg lida bem com object -> jsonb)
  return payload;
};

// Helpers
const handleRest = async (req, res, tableName) => {
  try {
    const { method, body, params: { id } } = req;
    const userId = req.headers['x-user-id'] || null;

    // Autorização
    if (tableName !== 'login') {
       const isAllowed = await checkPermission(userId, method, tableName);
       if (!isAllowed) {
         return res.status(403).json({ error: 'Permissão negada para esta ação.' });
       }
    }

    if (method === 'GET') {
      let isBarbeiro = false;
      let barbeiroNome = null;
      
      // Descobrir se é barbeiro para isolar a agenda
      if (userId && (tableName === 'agendamentos' || tableName === 'vendas')) {
        const uQ = await query('SELECT perfil FROM usuarios WHERE id = $1', [userId]);
        if (uQ.rows.length > 0 && uQ.rows[0].perfil === 'barbeiro') {
          isBarbeiro = true;
          const bQ = await query('SELECT nome FROM barbeiros WHERE usuario_id = $1', [userId]);
          if (bQ.rows.length > 0) {
            barbeiroNome = bQ.rows[0].nome;
          }
        }
      }

      let sql = `SELECT * FROM ${tableName}`;
      const clauses = [];
      const params = [];

      if (hasSoftDelete(tableName)) {
        clauses.push(`excluido_em IS NULL`);
      }

      // Isolamento de Barbeiros
      if (isBarbeiro && barbeiroNome) {
         if (tableName === 'agendamentos') {
             clauses.push(`barbeiro = $${params.length + 1}`);
             params.push(barbeiroNome);
         }
         // Se comprassem/fizessem vendas avulsas pelo barbeiro, precisaria gravar "barbeiro" na tabela vendas
         // Como não tem campo "barbeiro" na tabela Vendas (só "cliente"), não izolamos Vendas rigorosamente ou 
         // alteramos a base. Vou focar nos agendamentos por hoje.
      }

      if (clauses.length > 0) {
        sql += ` WHERE ` + clauses.join(' AND ');
      }

      const result = await query(sql, params);

      // Tratamento especial: remover hash da senha ao devolver POST/GET usuarios
      if (tableName === 'usuarios') {
         return res.json(result.rows.map(u => ({ ...u, senha: '' })));
      }
      return res.json(result.rows);
    } 

    if (method === 'POST') {
      let payload = { ...body };
      
      if (tableName === 'usuarios') {
        payload = await processUserPassword(payload);
      }

      if (hasAudit(tableName)) {
        payload.criado_por = userId;
        payload.alterado_por = userId;
      }

      const fields = Object.keys(payload);
      const values = Object.values(payload);

      let sql;
      let params;

      if (hasAutoIncrement(tableName)) {
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        params = values;
      } else {
        const newId = uuidv4();
        const placeholders = fields.map((_, i) => `$${i + 2}`).join(', ');
        sql = `INSERT INTO ${tableName} (id, ${fields.join(', ')}) VALUES ($1, ${placeholders}) RETURNING *`;
        params = [newId, ...values];
      }
      
      const result = await query(sql, params);
      return res.status(201).json(result.rows[0]);
    }

    if (method === 'PUT') {
      let payload = { ...body };
      
      if (tableName === 'usuarios') {
        payload = await processUserPassword(payload);
        if (!payload.senha) delete payload.senha; // Se mandou branco, não atualiza a senha
      }

      if (hasAudit(tableName)) {
        payload.alterado_por = userId;
      }

      const fields = Object.keys(payload);
      const values = Object.values(payload);
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = $1 RETURNING *`;
      const result = await query(sql, [id, ...values]);
      return res.json(result.rows[0]);
    }

    if (method === 'DELETE') {
      if (hasSoftDelete(tableName)) {
        const sql = `UPDATE ${tableName} SET excluido_em = CURRENT_TIMESTAMP, excluido_por = $2 WHERE id = $1`;
        await query(sql, [id, userId]);
      } else {
        await query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
      }
      return res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// LOGIN Endpoint especial
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const result = await query('SELECT id, nome, email, perfil, permissoes, senha FROM usuarios WHERE email = $1', [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const match = await bcrypt.compare(senha, user.senha);
      if (match) {
        delete user.senha; // Remove hash antes de mandar pro front
        res.json(user);
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Rotas Genéricas CRUD
const tables = [
  'usuarios', 'barbeiros', 'clientes', 'servicos', 'produtos', 
  'agendamentos', 'agendamentos_itens', 'contas_pagar', 'contas_receber', 'vendas'
];

tables.forEach(table => {
  app.get(`/api/${table}`, (req, res) => handleRest(req, res, table));
  app.post(`/api/${table}`, (req, res) => handleRest(req, res, table));
  app.put(`/api/${table}/:id`, (req, res) => handleRest(req, res, table));
  app.delete(`/api/${table}/:id`, (req, res) => handleRest(req, res, table));
});

// Servir frontend estático em produção (pasta dist/)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Servindo frontend estático de:', distPath);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
});
