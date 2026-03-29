// frontend/pages/ai-builder.js
// Phase 5 — AI Backend Generator page.
// Three states:
//   1. PROMPT  — user writes description, clicks Generate
//   2. PREVIEW — schema shown, user confirms or goes back
//   3. DONE    — tables created, APIs live, optional deploy

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppLayout from '../components/Layout/AppLayout';
import PromptEditor from '../components/AIBuilder/PromptEditor';
import SchemaPreview from '../components/AIBuilder/SchemaPreview';
import AIHistoryPanel from '../components/AIBuilder/AIHistoryPanel';
import { Button, Spinner, Card } from '../components/UI';
import { useProject } from '../hooks/useProjects';
import { useAiHistory } from '../hooks/useProjects';
import { aiApi, setTokenGetter } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import withAuth from '../components/Auth/withAuth';

const STAGE = { PROMPT: 'prompt', LOADING: 'loading', PREVIEW: 'preview', CONFIRMING: 'confirming', DONE: 'done' };

function AIBuilderPage() {
  const router = useRouter();
  const { project: projectId } = router.query;
  const { token } = useAuth();
  setTokenGetter(() => token);

  const { project } = useProject(projectId);
  const { history, mutate: refreshHistory } = useAiHistory(projectId);

  const [stage, setStage]           = useState(STAGE.PROMPT);
  const [prompt, setPrompt]         = useState('');
  const [schema, setSchema]         = useState(null);
  const [warnings, setWarnings]     = useState([]);
  const [requestId, setRequestId]   = useState(null);
  const [autoDeploy, setAutoDeploy] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState(null);
  const [reviewSchema, setReviewSchema] = useState(null);
  const [activeTab, setActiveTab]   = useState('generate'); // generate | history

  // No project selected
  if (!projectId) {
    return (
      <AppLayout title="AI Builder" subtitle="stackbase / ai-builder">
        <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-2)' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Select a project to use AI Builder</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
            Go to Projects and open one, then come back here.
          </div>
          <Link href="/"><Button variant="outline">Go to Projects</Button></Link>
        </div>
      </AppLayout>
    );
  }

  // Step 1: Generate schema from prompt
  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Please enter a description of at least 10 characters.');
      return;
    }
    setError('');
    setStage(STAGE.LOADING);

    try {
      const result = await aiApi.generate(projectId, prompt);
      setSchema(result.schema);
      setWarnings(result.warnings || []);
      setRequestId(result.requestId);
      setStage(STAGE.PREVIEW);
    } catch (err) {
      setError(err.message);
      setStage(STAGE.PROMPT);
    }
  };

  // Step 2: Confirm schema and create tables
  const handleConfirm = async () => {
    setStage(STAGE.CONFIRMING);
    setError('');

    try {
      const res = await aiApi.confirm(projectId, requestId, autoDeploy);
      setResult(res);
      setStage(STAGE.DONE);
      refreshHistory();
    } catch (err) {
      setError(err.message);
      setStage(STAGE.PREVIEW);
    }
  };

  const handleReset = () => {
    setStage(STAGE.PROMPT);
    setSchema(null);
    setWarnings([]);
    setRequestId(null);
    setResult(null);
    setError('');
    setReviewSchema(null);
  };

  return (
    <AppLayout
      title="AI Builder"
      subtitle={`${project?.name || '...'} / ai-builder`}
      activeProject={project}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px' }}>AI Backend Generator</h1>
          <span style={{
            background: 'linear-gradient(135deg, var(--accent-dim), var(--blue-dim))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 11,
            color: 'var(--accent-light)',
            fontWeight: 500,
          }}>
            Phase 5
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Describe your application in plain English. AI generates the complete database schema and live APIs instantly.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[['generate', 'Generate'], ['history', `History (${history.length})`]].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '8px 16px', marginBottom: -1,
              fontSize: 13, fontWeight: activeTab === tab ? 500 : 400,
              color: activeTab === tab ? 'var(--text-0)' : 'var(--text-2)',
              cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif',
              transition: 'color 0.1s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* History tab */}
      {activeTab === 'history' && (
        <div>
          <AIHistoryPanel
            history={history}
            onReview={(req) => {
              setReviewSchema(req.generatedSchema);
            }}
          />
          {reviewSchema && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Schema Preview</div>
                <button onClick={() => setReviewSchema(null)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>
                  Close ×
                </button>
              </div>
              <SchemaPreview schema={reviewSchema} />
            </div>
          )}
        </div>
      )}

      {/* Generate tab */}
      {activeTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Left — main flow */}
          <div>
            {/* DONE state */}
            {stage === STAGE.DONE && result && (
              <div style={{
                background: 'var(--accent-dim)', border: '1px solid rgba(110,231,183,0.2)',
                borderRadius: 10, padding: 24, marginBottom: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 8 }}>
                  Backend Created Successfully
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 16 }}>
                  {result.created.length} table{result.created.length !== 1 ? 's' : ''} created · {result.generatedApis} CRUD APIs live
                </div>

                {/* Created tables */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
                  {result.created.map((t) => (
                    <span key={t} style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                      background: 'rgba(0,0,0,0.2)', color: 'var(--accent-light)',
                      padding: '3px 10px', borderRadius: 4,
                    }}>
                      {t}
                    </span>
                  ))}
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--yellow)', marginBottom: 12 }}>
                    {result.errors.length} table{result.errors.length > 1 ? 's' : ''} skipped:
                    {result.errors.map((e) => ` ${e.table} (${e.error})`).join(',')}
                  </div>
                )}

                {result.deployment && (
                  <div style={{ fontSize: 12, color: 'var(--accent-light)', marginBottom: 16 }}>
                    Deployment started · ID: {result.deployment.id.slice(0, 8)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <Link href={`/database?project=${projectId}`}>
                    <Button variant="primary">View in Database Builder</Button>
                  </Link>
                  <Link href={`/apis?project=${projectId}`}>
                    <Button variant="outline">View Generated APIs</Button>
                  </Link>
                  <Button variant="ghost" onClick={handleReset}>Generate Another</Button>
                </div>
              </div>
            )}

            {/* PROMPT state */}
            {(stage === STAGE.PROMPT || stage === STAGE.LOADING) && (
              <Card>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                  Describe Your Application
                </div>
                <PromptEditor
                  value={prompt}
                  onChange={setPrompt}
                  disabled={stage === STAGE.LOADING}
                />

                {error && (
                  <div style={{
                    background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginTop: 12,
                  }}>
                    {error}
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    disabled={stage === STAGE.LOADING || !prompt.trim()}
                    style={{ minWidth: 160 }}
                  >
                    {stage === STAGE.LOADING ? (
                      <>
                        <Spinner size={13} />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                          <path d="M12 8v4l3 3"/>
                        </svg>
                        Generate Architecture
                      </>
                    )}
                  </Button>
                  {stage === STAGE.LOADING && (
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      Claude is designing your backend schema...
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* PREVIEW state */}
            {(stage === STAGE.PREVIEW || stage === STAGE.CONFIRMING) && schema && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Generated Schema</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                      Review before creating. All tables will be live immediately.
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStage(STAGE.PROMPT)}>
                    ← Edit Prompt
                  </Button>
                </div>

                <SchemaPreview schema={schema} warnings={warnings} />

                {error && (
                  <div style={{
                    background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginTop: 12,
                  }}>
                    {error}
                  </div>
                )}

                {/* Confirm section */}
                <div style={{
                  marginTop: 20, background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 16,
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoDeploy}
                      onChange={(e) => setAutoDeploy(e.target.checked)}
                      style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Auto-deploy after creating</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Trigger a deployment immediately so the APIs are publicly accessible
                      </div>
                    </div>
                  </label>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="primary"
                      onClick={handleConfirm}
                      disabled={stage === STAGE.CONFIRMING}
                      style={{ minWidth: 180 }}
                    >
                      {stage === STAGE.CONFIRMING ? (
                        <><Spinner size={13} /> Creating tables...</>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Confirm & Build Backend
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" onClick={handleReset} disabled={stage === STAGE.CONFIRMING}>
                      Start Over
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right — info panel */}
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                How it works
              </div>
              {[
                ['1', 'Describe your app', 'Write what your application does — entities, features, roles'],
                ['2', 'AI designs schema', 'Claude generates tables, columns, types, and relationships'],
                ['3', 'Review & confirm', 'Check the schema, then confirm to create everything instantly'],
                ['4', 'APIs go live', 'CRUD endpoints are registered immediately — no restart needed'],
                ['5', 'Deploy (optional)', 'Trigger deployment to get a public API URL'],
              ].map(([n, title, desc]) => (
                <div key={n} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--accent-dim)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, flexShrink: 0,
                  }}>{n}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                Project
              </div>
              {project && (
                <>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{project.name}</div>
                  {project.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>{project.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[['Tables', project.tables?.length || 0], ['APIs', (project.tables?.length || 0) * 5]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{v}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6 }}>
                    <Link href={`/database?project=${projectId}`}>
                      <Button size="sm" variant="ghost" style={{ fontSize: 11 }}>Database</Button>
                    </Link>
                    <Link href={`/deployments?project=${projectId}`}>
                      <Button size="sm" variant="ghost" style={{ fontSize: 11 }}>Deploy</Button>
                    </Link>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default withAuth(AIBuilderPage);
