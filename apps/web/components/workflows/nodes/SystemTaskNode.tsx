'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

export type SystemTaskNodeData = {
  label: string;
  hint?: string;
};

export function SystemTaskNode(props: NodeProps<SystemTaskNodeData>) {
  const { data, selected } = props;

  return (
    <div
      style={{
        minWidth: 240,
        borderRadius: 14,
        border: selected ? '2px solid #0f172a' : '1px solid #e2e8f0',
        background: '#fff',
        padding: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,.06)',
        direction: 'rtl',
        textAlign: 'right',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a' }}>{data.label}</div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{data.hint || 'مهمة نظام'}</div>
        </div>
        <span style={{ fontSize: 11, color: '#334155', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 999 }}>
          System Task
        </span>
      </div>

      <Handle type="target" position={Position.Top} id="in" style={{ width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} id="out" style={{ width: 10, height: 10 }} />
    </div>
  );
}
