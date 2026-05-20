'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../components/AppShell';
import { apiRequest } from '../../lib/api';

type Twin = {
  id: string;
  nameAr: string;
  kind: string;
  status: string;
  organizationId?: string;
  projectId?: string;
  coordinateSystem?: string;
};

type Graph = {
  twin: Twin;
  graph: {
    nodes: Array<{ id: string; nameAr: string; kind: string; capacity: number; dwellTimeSecondsAvg: number }>;
    edges: Array<{ id: string; fromNodeId: string; toNodeId: string; kind: string; travelTimeSeconds: number; distanceMeters: number }>;
  };
  validation?: { ok: boolean; errors: string[] };
  quickInsights?: any;
};

export default function TwinPage() {
  const [twins, setTwins] = useState<Twin[]>([]);
  const [selectedId, setSelectedId] = useState<string>('twin_demo_1');
  const [graph, setGraph] = useState<Graph | null>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [newTwinName, setNewTwinName] = useState('Twin جديد');
  const [nodeName, setNodeName] = useState('محطة');
  const [nodeKind, setNodeKind] = useState('exhibit');
  const [nodeCap, setNodeCap] = useState(50);
  const [nodeDwell, setNodeDwell] = useState(180);

  const [edgeFrom, setEdgeFrom] = useState('');
  const [edgeTo, setEdgeTo] = useState('');
  const [edgeTime, setEdgeTime] = useState(25);
  const [edgeDist, setEdgeDist] = useState(20);

  const [arrivalsPerMin, setArrivalsPerMin] = useState(22);
  const [durationMin, setDurationMin] = useState(60);
  const [stepSec, setStepSec] = useState(5);

  async function loadTwins() {
    const res = await apiRequest<{ items: Twin[] }>('/twin', { method: 'GET' });
    if (res.data?.items) setTwins(res.data.items);
  }

  async function loadGraph(id: string) {
    const res = await apiRequest<Graph>(`/twin/${id}/graph`, { method: 'GET' });
    if (res.data) setGraph(res.data);
  }

  useEffect(() => {
    loadTwins();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadGraph(selectedId);
  }, [selectedId]);

  async function createTwin() {
    setBusy(true);
    try {
      await apiRequest(`/twin`, { method: 'POST', body: { nameAr: newTwinName, kind: 'venue', status: 'draft', coordinateSystem: 'local_xy' } });
      await loadTwins();
    } finally {
      setBusy(false);
    }
  }

  async function addNode() {
    if (!selectedId) return;
    setBusy(true);
    try {
      await apiRequest(`/twin/${selectedId}/nodes`, { method: 'POST', body: { nameAr: nodeName, kind: nodeKind, capacity: nodeCap, dwellTimeSecondsAvg: nodeDwell } });
      await loadGraph(selectedId);
    } finally {
      setBusy(false);
    }
  }

  async function addEdge() {
    if (!selectedId || !edgeFrom || !edgeTo) return;
    setBusy(true);
    try {
      await apiRequest(`/twin/${selectedId}/edges`, { method: 'POST', body: { fromNodeId: edgeFrom, toNodeId: edgeTo, kind: 'path', travelTimeSeconds: edgeTime, distanceMeters: edgeDist } });
      await loadGraph(selectedId);
    } finally {
      setBusy(false);
    }
  }

  async function runSimulation(mode: 'sync' | 'enqueue') {
    if (!selectedId || !graph) return;
    setBusy(true);
    setSimResult(null);
    try {
      const startNodeId = graph.graph.nodes.find((n) => n.kind === 'entry')?.id || graph.graph.nodes[0]?.id;
      const created = await apiRequest<any>(`/twin/${selectedId}/simulations`, {
        method: 'POST',
        body: { durationMinutes: durationMin, stepSeconds: stepSec, arrivalsPerMinute: arrivalsPerMin, startNodeId },
      });
      const runId = created.data?.simulation?.id;
      if (!runId) return;

      if (mode === 'enqueue') {
        const enq = await apiRequest<any>(`/twin/simulations/${runId}/enqueue`, { method: 'POST' });
        setSimResult({ queued: true, runId, enqueue: enq.data });
        return;
      }

      const ran = await apiRequest<any>(`/twin/simulations/${runId}/run`, { method: 'POST', body: {} });
      setSimResult(ran.data?.result ? { result: ran.data.result, pipeline: ran.data.pipeline } : ran.data);
    } finally {
      setBusy(false);
    }
  }

  async function runScenarioPack() {
    if (!selectedId || !graph) return;
    setBusy(true);
    setSimResult(null);
    try {
      const startNodeId = graph.graph.nodes.find((n) => n.kind === 'entry')?.id || graph.graph.nodes[0]?.id;
      const created = await apiRequest<any>(`/twin/${selectedId}/simulations`, {
        method: 'POST',
        body: { durationMinutes: durationMin, stepSeconds: stepSec, arrivalsPerMinute: arrivalsPerMin, startNodeId },
      });
      const runId = created.data?.simulation?.id;
      if (!runId) return;

      const scenarioBody = {
        baselineOverrides: {},
        scenarios: [
          {
            key: 'batch',
            type: 'batch_arrivals',
            noteAr: 'دخول دفعات (ذروة قصيرة)',
            batches: [
              { startMinute: 10, endMinute: 15, arrivalsPerMinute: arrivalsPerMin * 2.2 },
              { startMinute: 30, endMinute: 35, arrivalsPerMinute: arrivalsPerMin * 1.8 },
            ],
          },
          {
            key: 'close_station',
            type: 'node_closed',
            noteAr: 'إغلاق محطة مزدحمة لاختبار البدائل',
            closedNodeIds: [graph.graph.nodes.find((n) => n.kind === 'exhibit')?.id].filter(Boolean),
          },
          {
            key: 'reverse',
            type: 'reverse_direction',
            noteAr: 'عكس اتجاه المسار',
          },
          {
            key: 'ab_story',
            type: 'ab_narrative',
            noteAr: 'اختبار سرديتين A/B',
            variantA: graph.graph.nodes.map((n) => n.id),
            variantB: [...graph.graph.nodes].reverse().map((n) => n.id),
          },
        ],
      };

      const ran = await apiRequest<any>(`/twin/simulations/${runId}/run-multi`, { method: 'POST', body: scenarioBody });
      setSimResult(ran.data);
    } finally {
      setBusy(false);
    }
  }

  const selectedTwin = useMemo(() => twins.find((t) => t.id === selectedId), [twins, selectedId]);

  return (
    <AppShell
      title="التوأم الرقمي"
      subtitle="Digital Twin لتجاربك الثقافية: Graph + Layers + Simulation + Telemetry + Twin Agent"
      badge={selectedTwin ? `${selectedTwin.kind} • ${selectedTwin.status}` : '—'}
      actions={
        <button className="btn" disabled={busy} onClick={() => loadGraph(selectedId)}>تحديث</button>
      }
    >
      <section className="card stack">
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="card" style={{ minWidth: 320 }}>
            <div className="muted">اختر Twin</div>
            <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {twins.map((t) => (
                <option key={t.id} value={t.id}>{t.nameAr} ({t.id})</option>
              ))}
            </select>
            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-ghost" href={`/twin/${selectedId}/viewer`}>عارض 3D</Link>
              <button className="btn btn-ghost" disabled={busy} onClick={runScenarioPack}>محاكاة سيناريوهات</button>
            </div>
            <div className="muted" style={{ marginTop: 10 }}>إنشاء Twin جديد</div>
            <div className="row">
              <input className="input" value={newTwinName} onChange={(e) => setNewTwinName(e.target.value)} />
              <button className="btn" disabled={busy} onClick={createTwin}>إنشاء</button>
            </div>
          </div>

          <div className="card" style={{ minWidth: 320 }}>
            <div className="muted">إضافة Node</div>
            <div className="stack" style={{ gap: 8 }}>
              <input className="input" value={nodeName} onChange={(e) => setNodeName(e.target.value)} />
              <div className="row">
                <select className="input" value={nodeKind} onChange={(e) => setNodeKind(e.target.value)}>
                  {['entry','exit','exhibit','activity','service','rest','corridor'].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <input className="input" type="number" value={nodeCap} onChange={(e) => setNodeCap(Number(e.target.value))} placeholder="Capacity" />
                <input className="input" type="number" value={nodeDwell} onChange={(e) => setNodeDwell(Number(e.target.value))} placeholder="Dwell" />
              </div>
              <button className="btn" disabled={busy} onClick={addNode}>إضافة</button>
            </div>
          </div>

          <div className="card" style={{ minWidth: 320 }}>
            <div className="muted">إضافة Edge</div>
            <div className="stack" style={{ gap: 8 }}>
              <div className="row">
                <input className="input" value={edgeFrom} onChange={(e) => setEdgeFrom(e.target.value)} placeholder="fromNodeId" />
                <input className="input" value={edgeTo} onChange={(e) => setEdgeTo(e.target.value)} placeholder="toNodeId" />
              </div>
              <div className="row">
                <input className="input" type="number" value={edgeTime} onChange={(e) => setEdgeTime(Number(e.target.value))} placeholder="Travel sec" />
                <input className="input" type="number" value={edgeDist} onChange={(e) => setEdgeDist(Number(e.target.value))} placeholder="Distance m" />
              </div>
              <button className="btn" disabled={busy} onClick={addEdge}>إضافة</button>
              <div className="muted">تلميح: انسخ IDs من قائمة Nodes بالأسفل.</div>
            </div>
          </div>

          <div className="card" style={{ minWidth: 360 }}>
            <div className="muted">محاكاة تدفق الزوار</div>
            <div className="row">
              <input className="input" type="number" value={arrivalsPerMin} onChange={(e) => setArrivalsPerMin(Number(e.target.value))} placeholder="Arrivals/min" />
              <input className="input" type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} placeholder="Duration min" />
              <input className="input" type="number" value={stepSec} onChange={(e) => setStepSec(Number(e.target.value))} placeholder="Step sec" />
            </div>
            <div className="row">
              <button className="btn" disabled={busy} onClick={() => runSimulation('sync')}>تشغيل الآن</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => runSimulation('enqueue')}>إرسال للطابور (Redis)</button>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 360 }}>
            <h3 style={{ marginTop: 0 }}>Graph</h3>
            {graph?.validation?.ok === false ? (
              <div className="notice" style={{ borderColor: 'var(--danger)' }}>
                <strong>تحذير:</strong>
                <ul>
                  {(graph.validation.errors || []).map((e, idx) => <li key={idx}>{e}</li>)}
                </ul>
              </div>
            ) : null}

            <div className="card">
              <div className="muted">Nodes ({graph?.graph.nodes.length || 0})</div>
              <div className="stack" style={{ gap: 8 }}>
                {(graph?.graph.nodes || []).map((n) => (
                  <div key={n.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{n.nameAr}</strong> <span className="muted">({n.kind})</span>
                      <div className="muted" style={{ fontSize: 12 }}>id: {n.id} • cap: {n.capacity} • dwell: {n.dwellTimeSecondsAvg}s</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="muted">Edges ({graph?.graph.edges.length || 0})</div>
              <div className="stack" style={{ gap: 8 }}>
                {(graph?.graph.edges || []).map((e) => (
                  <div key={e.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <strong>{e.fromNodeId}</strong> → <strong>{e.toNodeId}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>id: {e.id} • {e.travelTimeSeconds}s • {e.distanceMeters}m</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 360 }}>
            <h3 style={{ marginTop: 0 }}>نتيجة المحاكاة</h3>
            {!simResult ? <div className="muted">شغّل محاكاة لعرض KPIs ونقاط الازدحام.</div> : null}
            {simResult ? (
              <div className="card">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(simResult, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
