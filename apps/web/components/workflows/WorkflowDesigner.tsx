'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';

import Link from 'next/link';
import { apiRequest } from '../../lib/api';
import { StepNode, type StepNodeData } from './StepNode';
import { HumanGateNode, type HumanGateNodeData } from './nodes/HumanGateNode';
import { AIActionNode, type AIActionNodeData } from './nodes/AIActionNode';
import { SystemTaskNode, type SystemTaskNodeData } from './nodes/SystemTaskNode';
import { SplitGateNode, type SplitGateNodeData } from './nodes/SplitGateNode';
import { JoinGateNode, type JoinGateNodeData } from './nodes/JoinGateNode';
import { layoutWithDagre } from './graph/dagreLayout';
import { validateWorkflowGraph, wouldCreateCycle } from './graph/validateGraph';

type Template = {
  id: string;
  code: string;
  nameAr: string;
  summaryAr?: string;
  steps: Array<{ id: string; nameAr: string; actor: string; estimatedMinutes: number }>;
};

type TemplateGraph = {
  templateId: string;
  version: number;
  nodes: Node<any>[];
  edges: Edge[];
};

function buildDefaultGraphFromTemplate(t: Template): TemplateGraph {
  const nodes: Node<StepNodeData>[] = (t.steps || []).map((s, idx) => ({
    id: s.id,
    type: 'step',
    position: { x: 60, y: 40 + idx * 130 },
    data: { label: s.nameAr || s.id, actor: s.actor, estimatedMinutes: s.estimatedMinutes },
  }));

  const edges: Edge[] = (t.steps || []).slice(0, -1).map((s, idx) => ({
    id: `e_${s.id}_${t.steps[idx + 1].id}`,
    source: s.id,
    target: t.steps[idx + 1].id,
    type: 'smoothstep',
  }));

  return { templateId: t.id, version: 1, nodes, edges };
}

type PaletteItem = {
  type: 'humanGate' | 'aiAction' | 'systemTask' | 'splitGate' | 'joinGate';
  title: string;
  desc: string;
  makeData: () => any;
};

const PALETTE: PaletteItem[] = [
  {
    type: 'humanGate',
    title: 'بوابة قرار بشرية',
    desc: 'موافقة أو رفض بمخرجي yes/no',
    makeData: () => ({ label: 'قرار بشري', hint: 'تتطلب موافقة مسؤول' } satisfies HumanGateNodeData),
  },
  {
    type: 'aiAction',
    title: 'إجراء ذكاء اصطناعي',
    desc: 'توليد أو تلخيص أو تصنيف',
    makeData: () => ({ label: 'AI Action', modelHint: 'RAG / Agent / LLM' } satisfies AIActionNodeData),
  },
  {
    type: 'systemTask',
    title: 'مهمة نظام',
    desc: 'تصدير أو محاكاة أو إرسال حزمة',
    makeData: () => ({ label: 'System Task', hint: 'Export / Packet / Twin' } satisfies SystemTaskNodeData),
  },
  {
    type: 'splitGate',
    title: 'Split AND/OR',
    desc: 'تفريع دلالي: AND موازي أو OR اختيار مسار',
    makeData: () => ({ label: 'Split', mode: 'AND', hint: 'تفريع دلالي' } satisfies SplitGateNodeData),
  },
  {
    type: 'joinGate',
    title: 'Join AND/OR',
    desc: 'دمج دلالي: AND انتظار الكل أو OR أول وصول',
    makeData: () => ({ label: 'Join', mode: 'AND', hint: 'دمج دلالي' } satisfies JoinGateNodeData),
  },
];

function nextId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function canAddEdge(existing: Edge[], params: Edge | Connection, nodes: Node[]): { ok: boolean; reason?: string } {
  const source = (params as any).source as string | undefined;
  const target = (params as any).target as string | undefined;
  const sourceHandle = (params as any).sourceHandle as string | undefined;
  const targetHandle = (params as any).targetHandle as string | undefined;
  if (!source || !target) return { ok: false, reason: 'اتصال غير صالح' };
  if (source === target) return { ok: false, reason: 'غير مسموح ربط العقدة بنفسها' };
  if (wouldCreateCycle(existing, source, target)) return { ok: false, reason: 'تم منع الاتصال لأنه يصنع دورة Cycle' };

  // Prevent duplicate edges
  const key = `${source}:${sourceHandle || ''}=>${target}:${(params as any).targetHandle || ''}`;
  const dup = existing.some((e) => `${e.source}:${e.sourceHandle || ''}=>${e.target}:${e.targetHandle || ''}` === key);
  if (dup) return { ok: false, reason: 'يوجد اتصال مطابق مسبقًا' };

  // Human gate constraints
  const srcNode = nodes.find((n) => n.id === source);
  const tgtNode = nodes.find((n) => n.id === target);

  // Handle-level validation (prevents ambiguous/unsupported branching and merges)
  if (srcNode?.type === 'humanGate') {
    if (sourceHandle !== 'yes' && sourceHandle !== 'no') {
      return { ok: false, reason: 'Human Gate يجب اختيار مسار yes أو no' };
    }
  } else if (srcNode?.type === 'splitGate') {
    if (sourceHandle !== 'a' && sourceHandle !== 'b' && sourceHandle !== 'c') {
      return { ok: false, reason: 'Split يجب اختيار فرع a أو b أو c' };
    }
  } else {
    // For non gate nodes: allow undefined (legacy / default handles). If defined, only allow out
    if (sourceHandle && sourceHandle !== 'out') {
      return { ok: false, reason: 'مخرج العقدة يجب أن يكون out' };
    }
  }

  if (
    tgtNode?.type === 'humanGate' ||
    tgtNode?.type === 'aiAction' ||
    tgtNode?.type === 'systemTask' ||
    tgtNode?.type === 'splitGate' ||
    tgtNode?.type === 'joinGate'
  ) {
    if (targetHandle && targetHandle !== 'in') {
      return { ok: false, reason: 'مدخل العقدة يجب أن يكون in' };
    }
  }

  if (srcNode?.type === 'joinGate') {
    if (sourceHandle && sourceHandle !== 'out') {
      return { ok: false, reason: 'Join يجب أن يستخدم مخرج out' };
    }
  }

  // Allow branching only from humanGate or splitGate
  if (srcNode?.type !== 'humanGate' && srcNode?.type !== 'splitGate') {
    const outs = existing.filter((e) => e.source === source);
    if (outs.length >= 1) return { ok: false, reason: 'هذه العقدة لديها مخرج بالفعل. للتفرّع استخدم Split أو Human Gate' };
  }

  // Allow merges only into joinGate
  if (tgtNode?.type !== 'joinGate') {
    const ins = existing.filter((e) => e.target === target);
    if (ins.length >= 1) return { ok: false, reason: 'هذه العقدة لديها مدخل بالفعل. للدمج استخدم Join' };
  }

  // Split/Human gate must have a single incoming edge for clarity
  if (tgtNode?.type === 'splitGate' || tgtNode?.type === 'humanGate') {
    const ins = existing.filter((e) => e.target === target);
    if (ins.length >= 1) return { ok: false, reason: 'هذه البوابة لديها مدخل بالفعل' };
  }
  if (srcNode?.type === 'humanGate') {
    const outs = existing.filter((e) => e.source === source);
    if (outs.length >= 2) return { ok: false, reason: 'Human Gate يسمح بمسارين خروج فقط' };
    if (sourceHandle === 'yes' || sourceHandle === 'no') {
      const already = outs.some((e) => e.sourceHandle === sourceHandle);
      if (already) return { ok: false, reason: 'نفس مسار القرار yes/no مستخدم بالفعل' };
    }
  }

  if (srcNode?.type === 'splitGate') {
    const outs = existing.filter((e) => e.source === source);
    if (sourceHandle === 'a' || sourceHandle === 'b' || sourceHandle === 'c') {
      const already = outs.some((e) => e.sourceHandle === sourceHandle);
      if (already) return { ok: false, reason: 'هذا الفرع مستخدم بالفعل داخل Split' };
    }
  }

  if (srcNode?.type === 'joinGate') {
    const outs = existing.filter((e) => e.source === source);
    if (outs.length >= 1) return { ok: false, reason: 'Join يسمح بمخرج واحد فقط' };
  }

  return { ok: true };
}

function FlowCanvas(props: {
  nodes: Node<any>[];
  edges: Edge[];
  nodeTypes: any;
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (c: Edge | Connection) => void;
  isValidConnection: (c: Connection) => boolean;
  setNodes: any;
  setStatus: any;
  layoutDirection: 'TB' | 'LR';
}) {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('text/plain') as PaletteItem['type'];
      if (!type) return;
      const item = PALETTE.find((p) => p.type === type);
      if (!item) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = nextId(type);

      props.setNodes((nds: Node<any>[]) => nds.concat({ id, type, position, data: item.makeData() }));
      props.setStatus({ kind: 'ok', msg: 'تمت إضافة عقدة جديدة' });
      setTimeout(() => props.setStatus({ kind: 'idle' }), 800);
      setTimeout(() => fitView({ padding: 0.12, duration: 260 }), 50);
    },
    [screenToFlowPosition, fitView, props.setNodes, props.setStatus],
  );

  return (
    <ReactFlow
      nodes={props.nodes}
      edges={props.edges}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      isValidConnection={props.isValidConnection}
      nodeTypes={props.nodeTypes}
      onDrop={onDrop}
      onDragOver={onDragOver}
      fitView
    >
      <MiniMap />
      <Controls />
      <Background />
    </ReactFlow>
  );
}

export function WorkflowDesigner({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [status, setStatus] = useState<{ kind: 'idle' | 'loading' | 'saving' | 'ok' | 'err'; msg?: string }>({ kind: 'loading' });
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [layoutLocked, setLayoutLocked] = useState(false);

  const autoLayoutReadyRef = useRef(false);
  const baselineSigRef = useRef<string>('');
  const layoutLockedRef = useRef(layoutLocked);
  useEffect(() => {
    layoutLockedRef.current = layoutLocked;
  }, [layoutLocked]);

  const nodeTypes = useMemo(
    () => ({
      step: StepNode,
      humanGate: HumanGateNode,
      aiAction: AIActionNode,
      systemTask: SystemTaskNode,
      splitGate: SplitGateNode,
      joinGate: JoinGateNode,
    }),
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect = useCallback((params: Edge | Connection) => {
    const check = canAddEdge(edges, params, nodes);
    if (!check.ok) {
      setStatus({ kind: 'err', msg: check.reason || 'اتصال مرفوض' });
      setTimeout(() => setStatus({ kind: 'idle' }), 1600);
      return;
    }
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep' }, eds));
  }, [setEdges, edges, nodes]);

  const isValidConnection = useCallback((c: Connection) => {
    return canAddEdge(edges, c, nodes).ok;
  }, [edges, nodes]);

  async function load() {
    setStatus({ kind: 'loading', msg: 'تحميل القالب...' });
    autoLayoutReadyRef.current = false;
    const tplRes = await apiRequest<Template>(`/workflows/catalog/${encodeURIComponent(templateId)}`, { method: 'GET' });
    if (!tplRes.ok || !tplRes.data) {
      setStatus({ kind: 'err', msg: tplRes.error || 'فشل تحميل القالب' });
      return;
    }
    setTemplate(tplRes.data);

    const graphRes = await apiRequest<TemplateGraph>(`/workflows/catalog/${encodeURIComponent(templateId)}/graph`, { method: 'GET' });
    const isDefault = !(graphRes.ok && graphRes.data);
    const graph = graphRes.ok && graphRes.data ? graphRes.data : buildDefaultGraphFromTemplate(tplRes.data);

    const prepared = isDefault ? layoutWithDagre(graph.nodes || [], graph.edges || [], layoutDirection) : { nodes: graph.nodes || [], edges: graph.edges || [] };
    setNodes(prepared.nodes);
    setEdges(prepared.edges);
    baselineSigRef.current = `${(prepared.nodes || []).map((n) => n.id).sort().join(',')}|${(prepared.edges || []).map((e) => e.id).sort().join(',')}|${layoutDirection}`;
    // enable dynamic auto-layout only after initial render so we don't override saved positions on load
    setTimeout(() => { autoLayoutReadyRef.current = true; }, 0);
    setStatus({ kind: 'idle' });
  }

  useEffect(() => { load(); }, [templateId]);

  // Dynamic auto-layout on major structural changes (add/remove nodes or edges) unless locked.
  useEffect(() => {
    if (!autoLayoutReadyRef.current) return;
    if (layoutLockedRef.current) return;
    if (!nodes.length) return;

    const sig = `${nodes.map((n) => n.id).sort().join(',')}|${edges.map((e) => e.id).sort().join(',')}|${layoutDirection}`;
    if (sig === baselineSigRef.current) return;
    baselineSigRef.current = sig;

    const t = setTimeout(() => {
      if (layoutLockedRef.current) return;
      const res = layoutWithDagre(nodes, edges, layoutDirection);
      setNodes(res.nodes);
      setEdges(res.edges);
    }, 80);

    return () => clearTimeout(t);
  }, [nodes.length, edges.length, layoutDirection]);

  function autoLayoutDAG() {
    const res = layoutWithDagre(nodes, edges, layoutDirection);
    setNodes(res.nodes);
    setEdges(res.edges);
    setStatus({ kind: 'ok', msg: 'تم ترتيب المخطط بخوارزمية DAG' });
    setTimeout(() => setStatus({ kind: 'idle' }), 1200);
  }

  function resetFromTemplate() {
    if (!template) return;
    const graph = buildDefaultGraphFromTemplate(template);
    const res = layoutWithDagre(graph.nodes || [], graph.edges || [], layoutDirection);
    setNodes(res.nodes);
    setEdges(res.edges);
  }

  async function save() {
    if (!template) return;
    const v = validateWorkflowGraph(nodes, edges);
    if (!v.ok) {
      setStatus({ kind: 'err', msg: v.errors[0] || 'المخطط غير صالح' });
      setTimeout(() => setStatus({ kind: 'idle' }), 1800);
      return;
    }
    setStatus({ kind: 'saving', msg: 'حفظ المخطط...' });
    const res = await apiRequest<any>(`/workflows/catalog/${encodeURIComponent(templateId)}/graph`, {
      method: 'POST',
      body: {
        nodes,
        edges,
        meta: {
          editor: 'apps/web',
          savedAt: new Date().toISOString(),
        },
      },
    });

    if (!res.ok) {
      setStatus({ kind: 'err', msg: res.error || 'فشل الحفظ' });
      return;
    }
    setStatus({ kind: 'ok', msg: 'تم حفظ المخطط' });
    setTimeout(() => setStatus({ kind: 'idle' }), 1200);
  }

  const validation = useMemo(() => validateWorkflowGraph(nodes, edges), [nodes, edges]);

  const onDragStart = useCallback((event: DragEvent, nodeType: PaletteItem['type']) => {
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  function addFromPalette(type: PaletteItem['type']) {
    const item = PALETTE.find((p) => p.type === type);
    if (!item) return;
    const id = nextId(type);
    const y = 60 + nodes.length * 26;
    setNodes((nds) => nds.concat({ id, type, position: { x: 80, y }, data: item.makeData() }));
    setStatus({ kind: 'ok', msg: 'تمت إضافة عقدة' });
    setTimeout(() => setStatus({ kind: 'idle' }), 800);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm" style={{ minHeight: 620 }}>
        <div className="row" style={{ justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ direction: 'rtl' }}>
            <div className="muted" style={{ fontSize: 12 }}>{template?.code || templateId}</div>
            <div style={{ fontWeight: 900 }}>{template?.nameAr || 'مصمم المسار'}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => setLayoutDirection((d) => (d === 'TB' ? 'LR' : 'TB'))}>
              الاتجاه {layoutDirection === 'TB' ? 'عمودي' : 'أفقي'}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              onClick={() => setLayoutLocked((v) => !v)}
              title="إيقاف/تشغيل الترتيب التلقائي عند تغييرات كبيرة"
            >
              التخطيط {layoutLocked ? 'ثابت' : 'تلقائي'}
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={autoLayoutDAG} disabled={!template}>ترتيب DAG</button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={resetFromTemplate} disabled={!template}>إعادة ضبط</button>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={save} disabled={!template || status.kind === 'saving' || !validation.ok}>حفظ</button>
          </div>
        </div>

        <div style={{ height: 560 }}>
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              setNodes={setNodes}
              setStatus={setStatus}
              layoutDirection={layoutDirection}
            />
          </ReactFlowProvider>
        </div>
      </section>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" style={{ direction: 'rtl' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>لوحة المصمم</div>
          <Link className="text-sm" href="/workflows">عودة</Link>
        </div>

        <div className="mt-3 text-sm text-slate-600">
          الهدف تحويل خطوات القالب إلى Graph (Nodes + Edges) مثل منصات الأتمتة العالمية، ثم حفظه كتصميم مرتبط بالقالب.
        </div>

        <div className="mt-4">
          <div className="muted">الحالة</div>
          <div className="card" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13 }}>
              {status.kind === 'loading' && (status.msg || 'جاري التحميل...')}
              {status.kind === 'saving' && (status.msg || 'جاري الحفظ...')}
              {status.kind === 'ok' && (status.msg || 'تم')}
              {status.kind === 'err' && (status.msg || 'خطأ')}
              {status.kind === 'idle' && 'جاهز'}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Nodes: {nodes.length} • Edges: {edges.length} • التخطيط: {layoutLocked ? 'ثابت' : 'تلقائي'}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="muted">سلامة المخطط</div>
          <div className="card" style={{ marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: validation.ok ? '#16a34a' : '#dc2626' }}>
              {validation.ok ? 'صالح للحفظ' : 'غير صالح للحفظ'}
            </div>
            {!validation.ok && (
              <ul style={{ marginTop: 8, paddingInlineStart: 18, color: '#7f1d1d', fontSize: 12, lineHeight: 1.7 }}>
                {validation.errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {validation.warnings.length > 0 && (
              <ul style={{ marginTop: 8, paddingInlineStart: 18, color: '#334155', fontSize: 12, lineHeight: 1.7 }}>
                {validation.warnings.slice(0, 4).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="muted">لوحة العقد Palette</div>
          <div className="card" style={{ marginTop: 8 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              اسحب وأسقط داخل اللوحة، أو اضغط للإضافة
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {PALETTE.map((p) => (
                <div
                  key={p.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, p.type)}
                  onClick={() => addFromPalette(p.type)}
                  style={{
                    cursor: 'grab',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 10,
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{p.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="muted">ملاحظات تنفيذية</div>
          <ul style={{ marginTop: 8, paddingInlineStart: 18, color: '#334155', fontSize: 13, lineHeight: 1.7 }}>
            <li>الحفظ يكتب التصميم في قاعدة البيانات داخل WorkflowTemplateGraph.</li>
            <li>عند إنشاء Instance جديد سيتم حفظ snapshot داخل WorkflowInstance.designerGraphJson وأيضًا داخل parameters._designerGraph.</li>
            <li>تمت ترقية الترتيب إلى DAG Layout عبر dagre كما هو موصى به في أمثلة React Flow الرسمية.</li>
            <li>منع الدورات Cycle يتم أثناء التوصيل وأيضًا قبل الحفظ لضمان أن المخطط يبقى DAG.</li>
            <li>Wave17: الترتيب التلقائي يعمل عند إضافة/حذف عقد أو وصلات، ويمكن تثبيت التخطيط يدويًا عبر زر التخطيط ثابت.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
