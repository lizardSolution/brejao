const API_URL = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api';

const getHeaders = () => {
  const auth = sessionStorage.getItem('gmscheduler_auth');
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    try {
      const user = JSON.parse(auth);
      if (user && user.id) {
        headers['x-user-id'] = user.id;
      }
    } catch(e) { }
  }
  return headers;
};

export const api = {
  get: async (endpoint) => {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erro ao carregar ${endpoint}`);
    return response.json();
  },
  post: async (endpoint, data) => {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Erro ao criar em ${endpoint}`);
    return response.json();
  },
  put: async (endpoint, data) => {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Erro ao atualizar em ${endpoint}`);
    return response.json();
  },
  delete: async (endpoint) => {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error(`Erro ao deletar em ${endpoint}`);
    return true;
  }
};
