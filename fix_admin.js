import pg from 'pg';
const client = new pg.Client({
  host:'localhost',
  user:'postgres',
  password:'postgres',
  database:'gmscheduler'
});
const hash = '$2b$10$SNKMg6xP0lZu0Ll0j05a4OJ7cuqDz1MRpUyTI6pZDL7dKIJZiTZ26';

client.connect()
  .then(() => client.query('UPDATE usuarios SET senha = $1 WHERE email = $2', [hash, 'admin@barbearia.com']))
  .then(() => { console.log('Senha consertada com sucesso!'); client.end(); })
  .catch(e => { console.error(e); client.end(); });
