// frontend/lib/api.js
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; this.name = 'ApiError'; }
}

let _getToken = () => null;
export const setTokenGetter = (fn) => { _getToken = fn; };

const request = async (path, options = {}) => {
  const token = _getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status);
  return data;
};

export const authApi = {
  register: (p) => request('/auth/register', { method: 'POST', body: JSON.stringify(p) }),
  login:    (p) => request('/auth/login',    { method: 'POST', body: JSON.stringify(p) }),
  profile:  ()  => request('/auth/profile'),
  updateProfile: (p) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(p) }),
};

export const projectApi = {
  list:   ()       => request('/projects'),
  get:    (id)     => request(`/projects/${id}`),
  create: (p)      => request('/projects',       { method: 'POST',   body: JSON.stringify(p) }),
  update: (id, p)  => request(`/projects/${id}`, { method: 'PUT',    body: JSON.stringify(p) }),
  delete: (id)     => request(`/projects/${id}`, { method: 'DELETE' }),
};

export const apiKeyApi = {
  list:     (pid)      => request(`/projects/${pid}/keys`),
  generate: (pid, p)   => request(`/projects/${pid}/keys`,        { method: 'POST',   body: JSON.stringify(p) }),
  revoke:   (pid, kid) => request(`/projects/${pid}/keys/${kid}`, { method: 'DELETE' }),
};

export const tableApi = {
  list:   (pid)       => request(`/projects/${pid}/tables`),
  create: (pid, p)    => request(`/projects/${pid}/tables`,        { method: 'POST',   body: JSON.stringify(p) }),
  delete: (pid, name) => request(`/projects/${pid}/tables/${name}`,{ method: 'DELETE' }),
};

export const deployApi = {
  // Trigger a new deployment
  deploy:   (pid)   => request(`/projects/${pid}/deployments`,       { method: 'POST' }),
  // List all deployments for a project
  list:     (pid)   => request(`/projects/${pid}/deployments`),
  // Get single deployment
  get:      (did)   => request(`/deployments/${did}`),
  // Stop a deployment
  stop:     (did)   => request(`/deployments/${did}/stop`,    { method: 'POST' }),
  // Restart a deployment
  restart:  (did)   => request(`/deployments/${did}/restart`, { method: 'POST' }),
  // Get stored logs
  logs:     (did)   => request(`/deployments/${did}/logs`),
  // Get project-level logs
  projectLogs: (pid, limit = 200) => request(`/projects/${pid}/logs?limit=${limit}`),
};

// ── AI Backend Generator (Phase 5) ────────────────────────────────────────────
export const aiApi = {
  // Step 1: Send prompt, get schema preview
  generate: (projectId, prompt) =>
    request(`/projects/${projectId}/ai/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  // Step 2: Confirm schema, create tables, optionally deploy
  confirm: (projectId, requestId, autoDeploy = false) =>
    request(`/projects/${projectId}/ai/confirm`, {
      method: 'POST',
      body: JSON.stringify({ requestId, autoDeploy }),
    }),

  // Get AI request history for a project
  history: (projectId) => request(`/projects/${projectId}/ai/history`),

  // Get sample prompts (no auth required)
  samplePrompts: () => request('/ai/prompts'),
};

export const systemApi = {
  health:   () => request('/health'),
  explorer: () => request('/api/explorer'),
  types:    () => request('/api/types'),
};

// SSE log stream helper
export const createLogStream = (deploymentId, token, onMessage, onError) => {
  const url = `${BASE_URL}/deployments/${deploymentId}/logs/stream`;
  const es = new EventSource(url + (token ? `?token=${token}` : ''));
  es.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch {} };
  es.onerror = onError || (() => {});
  return es;
};

export { ApiError };

// ── Serverless Functions (Phase 7) ────────────────────────────────────────────
export const functionApi = {
  list:    (pid)            => request(`/projects/${pid}/functions`),
  get:     (pid, fid)       => request(`/projects/${pid}/functions/${fid}`),
  create:  (pid, p)         => request(`/projects/${pid}/functions`,           { method: 'POST', body: JSON.stringify(p) }),
  update:  (pid, fid, p)    => request(`/projects/${pid}/functions/${fid}`,    { method: 'PUT',  body: JSON.stringify(p) }),
  delete:  (pid, fid)       => request(`/projects/${pid}/functions/${fid}`,    { method: 'DELETE' }),
  execute: (pid, fid, event)=> request(`/projects/${pid}/functions/${fid}/execute`, { method: 'POST', body: JSON.stringify({ event }) }),
  logs:    (pid, fid, limit)=> request(`/projects/${pid}/functions/${fid}/logs?limit=${limit || 50}`),
};
