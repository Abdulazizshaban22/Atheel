import type { Edge, Node } from '@xyflow/react';

export type GraphValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  meta: {
    nodes: number;
    edges: number;
    startNodes: string[];
    endNodes: string[];
  };
};

function buildIndex(nodes: Node[], edges: Edge[]) {
  const byId = new Map<string, Node>();
  nodes.forEach((n) => byId.set(n.id, n));

  const out = new Map<string, string[]>();
  const inc = new Map<string, string[]>();

  nodes.forEach((n) => {
    out.set(n.id, []);
    inc.set(n.id, []);
  });

  for (const e of edges) {
    if (!e.source || !e.target) continue;
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    out.get(e.source)!.push(e.target);
    inc.get(e.target)!.push(e.source);
  }

  return { byId, out, inc };
}

export function wouldCreateCycle(edges: Edge[], source: string, target: string): boolean {
  if (source === target) return true;

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  }

  // adding source->target creates a cycle if there is already a path target -> ... -> source
  const stack = [target];
  const seen = new Set<string>();

  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === source) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const next = adj.get(cur) || [];
    for (const n of next) stack.push(n);
  }

  return false;
}

export function validateWorkflowGraph(nodes: Node[], edges: Edge[]): GraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!nodes.length) {
    errors.push('لا يوجد أي عقدة في المخطط');
    return {
      ok: false,
      errors,
      warnings,
      meta: { nodes: 0, edges: edges.length, startNodes: [], endNodes: [] },
    };
  }

  const { byId, out, inc } = buildIndex(nodes, edges);

  const nodeLabel = (id: string) => {
    const n: any = byId.get(id);
    return (n?.data?.label as string) || id;
  };

  const nodeType = (id: string) => {
    return (byId.get(id)?.type as string) || 'step';
  };

  // Basic edge integrity
  const edgeKey = new Set<string>();
  for (const e of edges) {
    if (!e.source || !e.target) {
      warnings.push('يوجد Edge ناقص المصدر أو الهدف');
      continue;
    }
    if (!byId.has(e.source) || !byId.has(e.target)) {
      errors.push('يوجد Edge يشير إلى عقدة غير موجودة');
      continue;
    }
    if (e.source === e.target) {
      errors.push('غير مسموح Edge يعود لنفس العقدة');
    }
    const k = `${e.source}:${e.sourceHandle || ''}=>${e.target}:${e.targetHandle || ''}`;
    if (edgeKey.has(k)) warnings.push('يوجد Edge مكرر بين نفس العقد');
    edgeKey.add(k);

    // Handle-level validation (branching/merge safety)
    const srcT = nodeType(e.source);
    const tgtT = nodeType(e.target);

    if (srcT === 'humanGate') {
      if (e.sourceHandle !== 'yes' && e.sourceHandle !== 'no') {
        errors.push(`بوابة قرار بشرية: يجب أن يكون مخرج الاتصال yes أو no (${nodeLabel(e.source)})`);
      }
    } else if (srcT === 'splitGate') {
      if (e.sourceHandle !== 'a' && e.sourceHandle !== 'b' && e.sourceHandle !== 'c') {
        errors.push(`Split Gate: يجب اختيار فرع a/b/c (${nodeLabel(e.source)})`);
      }
    } else if (srcT === 'joinGate') {
      if (e.sourceHandle && e.sourceHandle !== 'out') {
        errors.push(`Join Gate: يجب استخدام مخرج out (${nodeLabel(e.source)})`);
      }
    } else {
      // Backward compatible: allow undefined for legacy/default handles. If provided, enforce out.
      if (e.sourceHandle && e.sourceHandle !== 'out') {
        errors.push(`مخرج غير صالح: ${nodeLabel(e.source)} يجب أن يستخدم handle out`);
      }
    }

    if (tgtT === 'humanGate' || tgtT === 'aiAction' || tgtT === 'systemTask' || tgtT === 'splitGate' || tgtT === 'joinGate') {
      if (e.targetHandle && e.targetHandle !== 'in') {
        errors.push(`مدخل غير صالح: ${nodeLabel(e.target)} يجب أن يستخدم handle in`);
      }
    }
  }

  // Start/End nodes
  const startNodes = nodes.filter((n) => (inc.get(n.id)?.length || 0) === 0).map((n) => n.id);
  const endNodes = nodes.filter((n) => (out.get(n.id)?.length || 0) === 0).map((n) => n.id);

  if (startNodes.length === 0) errors.push('لا يوجد عقدة بداية: يجب وجود عقدة واحدة على الأقل بدون وصلات دخول');
  if (startNodes.length > 1) warnings.push('يوجد أكثر من عقدة بداية، يفضّل عقدة بداية واحدة لمسار واضح');
  if (endNodes.length === 0) warnings.push('لا يوجد عقدة نهاية واضحة: كل العقد لها وصلات خروج');

  // Human gate constraints
  for (const n of nodes) {
    if (n.type !== 'humanGate') continue;

    const outs = edges.filter((e) => e.source === n.id);
    if (outs.length > 2) errors.push('بوابة Human Gate يجب ألا تتجاوز مسارين خروج');

    const byHandle = new Map<string, number>();
    for (const e of outs) {
      const h = e.sourceHandle || 'out';
      byHandle.set(h, (byHandle.get(h) || 0) + 1);
    }
    for (const [h, c] of byHandle.entries()) {
      if ((h === 'yes' || h === 'no') && c > 1) errors.push('في Human Gate لا يمكن تكرار نفس مسار القرار yes/no أكثر من مرة');
    }

    // Branch completeness
    if (outs.length === 0) errors.push(`بوابة قرار بشرية بدون أي مخرج (${nodeLabel(n.id)})`);
    if (outs.length === 1) warnings.push(`بوابة قرار بشرية بمسار واحد فقط، يفضّل وجود yes و no (${nodeLabel(n.id)})`);
  }

  // Advanced branching/merge rules (semantic branching)
  for (const n of nodes) {
    const t = n.type || 'step';
    const outs = edges.filter((e) => e.source === n.id);
    const ins = edges.filter((e) => e.target === n.id);

    const isBranching = t === 'humanGate' || t === 'splitGate';
    const isMerging = t === 'joinGate';

    if (!isBranching && outs.length > 1) {
      errors.push(`العقدة ${nodeLabel(n.id)} لديها أكثر من مخرج. للتفرّع استخدم Split أو Human Gate`);
    }

    if (!isMerging && ins.length > 1) {
      errors.push(`العقدة ${nodeLabel(n.id)} لديها أكثر من مدخل. للدمج استخدم Join`);
    }

    // Split semantics
    if (t === 'splitGate') {
      if (ins.length > 1) errors.push(`Split يجب أن يكون له مدخل واحد فقط (${nodeLabel(n.id)})`);
      if (outs.length === 0) errors.push(`Split بدون أي مخرج (${nodeLabel(n.id)})`);
      if (outs.length === 1) warnings.push(`Split بمخرج واحد فقط، عادةً يُستخدم للتفرّع بمسارين أو أكثر (${nodeLabel(n.id)})`);
      // prevent duplicate handle use
      const used = new Map<string, number>();
      outs.forEach((e) => {
        const h = e.sourceHandle || '';
        used.set(h, (used.get(h) || 0) + 1);
      });
      for (const [h, c] of used.entries()) {
        if ((h === 'a' || h === 'b' || h === 'c') && c > 1) errors.push(`Split لا يسمح بتكرار نفس الفرع ${h} أكثر من مرة (${nodeLabel(n.id)})`);
      }
    }

    // Join semantics
    if (t === 'joinGate') {
      if (outs.length > 1) errors.push(`Join يسمح بمخرج واحد فقط (${nodeLabel(n.id)})`);
      if (outs.length === 0) warnings.push(`Join بدون مخرج. قد يوقف المسار عند هذه النقطة (${nodeLabel(n.id)})`);
      if (ins.length === 0) errors.push(`Join بدون أي مدخل (${nodeLabel(n.id)})`);
      if (ins.length === 1) warnings.push(`Join بمدخل واحد فقط، عادةً يُستخدم للدمج من مسارين أو أكثر (${nodeLabel(n.id)})`);
    }
  }

  // Cycle detection via DFS
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycleFrom = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const nxt of out.get(id) || []) {
      if (hasCycleFrom(nxt)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const n of nodes) {
    if (hasCycleFrom(n.id)) {
      errors.push('المخطط يحتوي دورة Cycle: يجب أن يكون DAG');
      break;
    }
  }

  // Connectivity: everything reachable from at least one start node
  if (startNodes.length) {
    const seen = new Set<string>();
    const stack = [...startNodes];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const nxt of out.get(cur) || []) stack.push(nxt);
    }
    if (seen.size !== nodes.length) warnings.push('يوجد عقد غير مرتبطة ببداية المسار، قد تكون جزءًا غير مستخدم');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    meta: { nodes: nodes.length, edges: edges.length, startNodes, endNodes },
  };
}
