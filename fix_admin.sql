UPDATE usuarios SET senha = '$2b$10$SNKMg6xP0lZu0Ll0j05a4OJ7cuqDz1MRpUyTI6pZDL7dKIJZiTZ26' WHERE email = 'admin@barbearia.com';
SELECT email, senha FROM usuarios WHERE email = 'admin@barbearia.com';
