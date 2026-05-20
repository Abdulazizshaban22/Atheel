'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '../../../lib/api';
import { AppShell } from '../../../components/AppShell';

type Project = {
  id: string;
  organizationId: string;
  code: string;
  nameAr: string;
  status: string;
  progressPercent: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  // Auth via HttpOnly cookies (no localStorage token)
  const [row, setRow] = useState<Project | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id || !token) return;
      setLoading(true);
      const res = await apiRequest<Project>(`/projects/${id}`);
      if (!res.ok || !res.data) {
        setErr(res.error || 'تعذر تحميل المشروع');
      } else {
        setRow(res.data);
        setErr('');
      }
      setLoading(false);
    }
    void load();
  }, [id]);

  return (
    <AppShell title="تفاصيل المشروع" subtitle="عرض تفصيلي قابل للتوسعة لاحقًا إلى Tabs للمخاطر/الموافقات/المهام" badge="Project Details">
      <section className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <a className="btn btn-ghost" href="/projects">← الرجوع للمشاريع</a>
          <a className="btn" href="/workbench">Workbench</a>
        </div>
        {loading ? <div className="notice">جاري التحميل...</div> : null}
        {err ? <div className="notice error">{err}</div> : null}
        {row ? (
          <div className="grid grid-2">
            <div className="card stack">
              <h2 style={{ margin: 0 }}>{row.nameAr}</h2>
              <div className="kv"><label>المعرف</label><code>{row.id}</code></div>
              <div className="kv"><label>الكود</label><div>{row.code}</div></div>
              <div className="kv"><label>الحالة</label><div>{row.status}</div></div>
              <div className="kv"><label>التقدم</label><div>{row.progressPercent}%</div></div>
            </div>
            <div className="card stack">
              <div className="kv"><label>الجهة</label><div>{row.organizationId}</div></div>
              <div className="kv"><label>تاريخ البداية</label><div>{row.startDate ? String(row.startDate).slice(0, 10) : '-'}</div></div>
              <div className="kv"><label>تاريخ النهاية</label><div>{row.endDate ? String(row.endDate).slice(0, 10) : '-'}</div></div>
              <div className="kv"><label>آخر تحديث</label><div>{row.updatedAt ? String(row.updatedAt) : '-'}</div></div>
              <div className="notice">ملاحظة: هذه صفحة تفاصيل أولية. التبويبات (مهام/مخاطر/موافقات/مرفقات) يمكن ربطها مباشرة في الموجة التالية.</div>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
