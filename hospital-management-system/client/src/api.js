// Small fetch wrapper: adds the login token and throws readable errors.
export async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') {
    localStorage.clear();
    location.href = '/';
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
