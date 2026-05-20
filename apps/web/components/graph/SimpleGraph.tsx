'use client';

import { useMemo } from 'react';
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function SimpleGraph(props: { nodes: any[]; edges: any[]; height?: number }) {
  const nodes = useMemo(() => (props.nodes || []).map((n) => ({ ...n })), [props.nodes]);
  const edges = useMemo(() => (props.edges || []).map((e) => ({ ...e })), [props.edges]);

  return (
    <div style={{ height: props.height ?? 520, border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, overflow: 'hidden' }}>
      <ReactFlowProvider>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
