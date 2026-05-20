import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

type Dir = 'TB' | 'LR';

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

function getNodeSize(node: Node): { width: number; height: number } {
  const t = node.type || 'step';
  if (t === 'humanGate') return { width: 260, height: 120 };
  if (t === 'aiAction') return { width: 260, height: 100 };
  if (t === 'systemTask') return { width: 260, height: 100 };
  if (t === 'splitGate') return { width: 280, height: 140 };
  if (t === 'joinGate') return { width: 280, height: 130 };
  return { width: 260, height: 96 };
}

export function layoutWithDagre<T extends Record<string, any>>(
  nodes: Node<T>[],
  edges: Edge[],
  direction: Dir = 'TB',
): { nodes: Node<T>[]; edges: Edge[] } {
  const isHorizontal = direction === 'LR';

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((n) => {
    const { width, height } = getNodeSize(n);
    dagreGraph.setNode(n.id, { width, height });
  });

  edges.forEach((e) => {
    if (e.source && e.target) dagreGraph.setEdge(e.source, e.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((n) => {
    const { width, height } = getNodeSize(n);
    const pos = dagreGraph.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      // these are still useful for built-in handles, but custom nodes define handles explicitly.
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
}
