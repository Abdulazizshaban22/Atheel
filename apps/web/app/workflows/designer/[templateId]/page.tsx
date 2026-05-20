'use client';

import { AppShell } from '../../../../components/AppShell';
import { WorkflowDesigner } from '../../../../components/workflows/WorkflowDesigner';

export default function WorkflowDesignerPage({ params }: { params: { templateId: string } }) {
  return (
    <AppShell title="مصمم مسارات سير العمل" subtitle="Wave16: DAG Auto-Layout (Dagre) + Palette Nodes + Graph Validation" badge="Wave16">
      <WorkflowDesigner templateId={params.templateId} />
    </AppShell>
  );
}
