'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

export type SplitGateNodeData = {
  label: string;
  mode: 'AND' | 'OR';
  hint?: string;
};

export function SplitGateNode(props: NodeProps<SplitGateNodeData>) {
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
          <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{data.hint || 'تفريع دلالي'}</div>
        </div>
        <span style={{ fontSize: 11, color: '#334155', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 999 }}>
          Split {data.mode}
        </span>
      </div>

      <Handle type="target" position={Position.Top} id="in" style={{ width: 10, height: 10 }} />

      <Handle type="source" position={Position.Bottom} id="a" style={{ width: 10, height: 10, left: 40 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ width: 10, height: 10, left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="c" style={{ width: 10, height: 10, left: 'auto', right: 40 }} />
    </div>
  );
}
