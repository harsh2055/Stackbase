// frontend/hooks/useProjects.js
import useSWR from 'swr';
import { useAuth } from '../context/AuthContext';
import { projectApi, tableApi, apiKeyApi, deployApi, aiApi, functionApi, setTokenGetter } from '../lib/api';

export const useProjects = () => {
  const { token } = useAuth();
  setTokenGetter(() => token);
  const { data, error, isLoading, mutate } = useSWR(token ? '/projects' : null, () => projectApi.list(), { revalidateOnFocus: false });
  return { projects: data?.data || [], count: data?.count || 0, isLoading, isError: !!error, mutate };
};

export const useProject = (projectId) => {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(token && projectId ? `/projects/${projectId}` : null, () => projectApi.get(projectId), { revalidateOnFocus: false });
  return { project: data?.data || null, isLoading, isError: !!error, mutate };
};

export const useProjectTables = (projectId) => {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(token && projectId ? `/projects/${projectId}/tables` : null, () => tableApi.list(projectId), { revalidateOnFocus: false });
  return { tables: data?.data || [], isLoading, isError: !!error, mutate };
};

export const useApiKeys = (projectId) => {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(token && projectId ? `/projects/${projectId}/keys` : null, () => apiKeyApi.list(projectId), { revalidateOnFocus: false });
  return { keys: data?.data || [], isLoading, isError: !!error, mutate };
};

export const useDeployments = (projectId) => {
  const { token } = useAuth();
  const active = token && projectId;
  const { data, error, isLoading, mutate } = useSWR(
    active ? `/projects/${projectId}/deployments` : null,
    () => deployApi.list(projectId),
    { revalidateOnFocus: false, refreshInterval: 4000 }
  );
  return { deployments: data?.data || [], isLoading, isError: !!error, mutate };
};

export const useDeploymentLogs = (deploymentId) => {
  const { token } = useAuth();
  const active = token && deploymentId;
  const { data, error, isLoading, mutate } = useSWR(
    active ? `/deployments/${deploymentId}/logs` : null,
    () => deployApi.logs(deploymentId),
    { revalidateOnFocus: false, refreshInterval: 2500 }
  );
  return {
    logs: data?.logs || [],
    containerLogs: data?.containerLogs || [],
    deployment: data?.deployment || null,
    isLoading,
    mutate,
  };
};

// ── Phase 5: AI hooks ─────────────────────────────────────────────────────────

export const useAiHistory = (projectId) => {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(
    token && projectId ? `/projects/${projectId}/ai/history` : null,
    () => aiApi.history(projectId),
    { revalidateOnFocus: false }
  );
  return { history: data?.data || [], isLoading, isError: !!error, mutate };
};

// ── Phase 7: Functions hooks ───────────────────────────────────────────────────

export const useFunctions = (projectId) => {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(
    token && projectId ? `/projects/${projectId}/functions` : null,
    () => functionApi.list(projectId),
    { revalidateOnFocus: false }
  );
  return { functions: data?.data || [], isLoading, isError: !!error, mutate };
};

export const useFunctionLogs = (projectId, functionId) => {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR(
    token && projectId && functionId ? `/projects/${projectId}/functions/${functionId}/logs` : null,
    () => functionApi.logs(projectId, functionId, 50),
    { revalidateOnFocus: false, refreshInterval: 5000 }
  );
  return { logs: data?.data || [], isLoading, mutate };
};
