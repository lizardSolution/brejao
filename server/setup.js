import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

const { Client } = pg;

// Recriar __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setup() {
  const dbName = process.env.DB_NAME || 'gmscheduler';
  
  // 1. Conectar ao banco genérico para criar o novo banco se não existir
  const clientSetup = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: 'postgres',
  });

  try {
    await clientSetup.connect();
    console.log('Conectado ao PostgreSQL (banco padrão).');
    
    const res = await clientSetup.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`);
    if (res.rowCount === 0) {
      console.log(`Criando banco de dados "${dbName}"...`);
      await clientSetup.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Banco de dados "${dbName}" criado com sucesso!`);
    } else {
      console.log(`Banco de dados "${dbName}" já existe.`);
    }
  } catch (err) {
    console.error('Erro ao conectar ou criar banco:', err);
    process.exit(1);
  } finally {
    await clientSetup.end();
  }

  // 2. Conectar ao novo banco para criar as tabelas
  const clientDb = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: dbName,
  });

  try {
    await clientDb.connect();
    console.log(`Conectado ao banco "${dbName}".`);

    // Ler as queries de schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    console.log('Criando tabelas...');
    await clientDb.query(schemaSql);
    console.log('Tabelas criadas com sucesso!');

    // Inserir usuário administrador padrão se não existir
    const checkUser = await clientDb.query('SELECT id FROM usuarios WHERE email = $1', ['admin@barbearia.com']);
    if (checkUser.rowCount === 0) {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('admin123', 10);
      
      await clientDb.query(
        'INSERT INTO usuarios (id, nome, email, senha, perfil) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), 'Administrador', 'admin@barbearia.com', hashedPassword, 'admin']
      );
      console.log('Usuário admin criado (admin@barbearia.com / admin123).');
    }

    // Inserir serviços padrão se não existir
    const checkServicos = await clientDb.query('SELECT COUNT(*) FROM servicos');
    if (parseInt(checkServicos.rows[0].count) === 0) {
      const servicos = [
        ['Corte de Cabelo', 45.00, 30],
        ['Barba', 30.00, 20],
        ['Corte + Barba', 65.00, 45],
        ['Sobrancelha', 15.00, 10],
        ['Hidratação', 40.00, 30]
      ];
      
      for (const s of servicos) {
        await clientDb.query(
          'INSERT INTO servicos (id, nome, preco, duracao) VALUES ($1, $2, $3, $4)',
          [uuidv4(), s[0], s[1], s[2]]
        );
      }
      console.log('Serviços padrão criados.');
    }

    console.log('✨ Setup finalizado com sucesso! O banco está pronto para uso.');
  } catch (err) {
    console.error('Erro na criação das tabelas:', err);
  } finally {
    await clientDb.end();
  }
}

setup();
