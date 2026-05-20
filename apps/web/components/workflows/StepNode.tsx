'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

export type StepNodeData = {
  label: string;
  actor?: string;
  estimatedMinutes?: number;
};

export function StepNode(props: NodeProps<StepNodeData>) {
  const { data, selected } = props;
  const actor = data.actor || 'system';
  const minutes = typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 0;

  const actorBadge =
    actor === 'human' ? 'Human' :
    actor === 'ai' ? 'AI' :
    actor === 'system' ? 'System' :
    actor;

  return (
    <div
      style={{
        minWidth: 220,
        borderRadius: 12,
        border: selected ? '2px solid #0f172a' : '1px solid #e2e8f0',
        background: '#fff',
        padding: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,.06)',
        direction: 'rtl',
        textAlign: 'right',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{data.label}</div>
        <span style={{ fontSize: 11, color: '#334155', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 999 }}>
          {actorBadge}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
        {minutes ? `زمن تقديري ${minutes} د` : '—'}
      </div>

      <Handle type="target" position={Position.Top} style={{ width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ width: 10, height: 10 }} />
    </div>
  );
}
