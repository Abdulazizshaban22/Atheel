'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../components/AppShell';
import { apiGet, apiRequest } from '../../../lib/api';
import { getStoredUser } from '../../../lib/session';

type UiField = {
  path: string;
  type: 'string' | 'number' | 'enum' | 'multi_enum' | 'string_array';
  titleAr: string;
  helpAr?: string;
  min?: number;
  max?: number;
  step?: number;
  enum?: string[];
};

type UiSection = {
  key: string;
  titleAr: string;
  fields?: UiField[];
  arrayPath?: string;
  itemFields?: UiField[];
  noteAr?: string;
};

type PolicyUi = { spec: string; version: string; sections: UiSection[] };

function getPath(obj: any, path: string) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
  const root = { ...(obj || {}) };
  let cur: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cur[k] = { ...(cur[k] || {}) };
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
  return root;
}

export default function GovernancePolicyDesigner() {
  const user = useMemo(() => getStoredUser(), []);
  const defaultOrgId = (user?.orgIds || [])[0] || 'org_demo_1';

  const [orgId, setOrgId] = useState(defaultOrgId);
  const [ui, setUi] = useState<PolicyUi | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [packId, setPackId] = useState('');
  const [version, setVersion] = useState('v1');
  const [changelog, setChangelog] = useState('');

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [validation, setValidation] = useState<any>(null);

  async function load() {
    setErr('');
    const uiRes = await apiGet<{ ok: boolean; ui: PolicyUi }>('/governance/policy-dsl/ui');
    if (!uiRes?.ok) return setErr('تعذر تحميل مخطط الواجهة للسياسة');
    setUi(uiRes.ui);

    const dslRes = await apiGet<{ ok: boolean; policyDsl: any }>(`/governance/policy-packs/active-dsl?organizationId=${encodeURIComponent(orgId)}`);
    if (!dslRes?.ok) return setErr('تعذر تحميل السياسة الفعالة');
    setPolicy(dslRes.policyDsl);
    setMsg('تم تحميل السياسة');
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function validateNow() {
    setErr('');
    const res = await apiRequest<any>('/governance/policy-dsl/validate', { method: 'POST', body: { policyDsl: policy } });
    if (!res.ok) {
      setValidation(null);
      return setErr(res.error || 'فشل التحقق');
    }
    setValidation(res.data);
    setMsg(res.data?.ok ? 'السياسة صالحة' : 'السياسة غير صالحة');
  }

  async function saveVersion(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!packId.trim()) return setErr('packId مطلوب لحفظ نسخة');
    const res = await apiRequest<any>(`/governance/policy-packs/${encodeURIComponent(packId.trim())}/versions`, {
      method: 'POST',
      body: { version: version.trim(), changelog: changelog.trim() || undefined, policyDsl: policy },
    });
    if (!res.ok) return setErr(res.error || 'فشل حفظ نسخة السياسة');
    setMsg('تم حفظ نسخة السياسة داخل الحزمة');
    setValidation(null);
  }

  function renderField(field: UiField) {
    const v = getPath(policy, field.path);

    if (field.type === 'string') {
      return (
        <div key={field.path}>
          <label>{field.titleAr}</label>
          <input value={String(v ?? '')} onChange={(e) => setPolicy(setPath(policy, field.path, e.target.value))} />
          {field.helpAr ? <div className="muted" style={{ fontSize: 12 }}>{field.helpAr}</div> : null}
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <div key={field.path}>
          <label>{field.titleAr}</label>
          <input
            type="number"
            value={String(v ?? '')}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            onChange={(e) => setPolicy(setPath(policy, field.path, e.target.value === '' ? '' : Number(e.target.value)))}
          />
        </div>
      );
    }

    if (field.type === 'enum') {
      return (
        <div key={field.path}>
          <label>{field.titleAr}</label>
          <select value={String(v ?? '')} onChange={(e) => setPolicy(setPath(policy, field.path, e.target.value))}>
            {(field.enum || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          {field.helpAr ? <div className="muted" style={{ fontSize: 12 }}>{field.helpAr}</div> : null}
        </div>
      );
    }

    if (field.type === 'multi_enum') {
      const arr = Array.isArray(v) ? v : [];
      return (
        <div key={field.path}>
          <label>{field.titleAr}</label>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {(field.enum || []).map((opt) => {
              const on = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`btn ${on ? '' : 'btn-ghost'}`}
                  onClick={() => {
                    const next = on ? arr.filter((x: any) => x !== opt) : [...arr, opt];
                    setPolicy(setPath(policy, field.path, next));
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (field.type === 'string_array') {
      const arr = Array.isArray(v) ? v : [];
      return (
        <div key={field.path}>
          <label>{field.titleAr}</label>
          <textarea
            rows={3}
            value={arr.join('\n')}
            onChange={(e) => setPolicy(setPath(policy, field.path, e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean)))}
          />
          <div className="muted" style={{ fontSize: 12 }}>سطر لكل عنصر</div>
        </div>
      );
    }

    return null;
  }

  function renderArraySection(sec: UiSection) {
    const path = sec.arrayPath || '';
    const arr = Array.isArray(getPath(policy, path)) ? (getPath(policy, path) as any[]) : [];

    function setArray(next: any[]) {
      setPolicy(setPath(policy, path, next));
    }

    return (
      <section className="card stack" key={sec.key}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{sec.titleAr}</h2>
          <button
            className="btn"
            type="button"
            onClick={() => setArray([...arr, { afterMinutes: 0, severity: 'warning', channels: ['in_app'], notify: [] }])}
          >
            إضافة مستوى
          </button>
        </div>
        {sec.noteAr ? <div className="notice">{sec.noteAr}</div> : null}

        {arr.map((item, idx) => (
          <div className="card stack" key={idx} style={{ borderStyle: 'dashed' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="badge">#{idx + 1}</div>
              <button className="btn btn-danger" type="button" onClick={() => setArray(arr.filter((_, i) => i !== idx))}>حذف</button>
            </div>

            <div className="form-grid cols-3">
              {(sec.itemFields || []).map((f) => {
                // For array items, f.path is relative
                const full = `${path}.${idx}.${f.path}`;
                return renderField({ ...f, path: full });
              })}
            </div>
          </div>
        ))}

        {!arr.length ? <div className="muted">لا توجد مستويات بعد</div> : null}
      </section>
    );
  }

  return (
    <AppShell
      title="مصمم سياسة الحوكمة Policy DSL"
      subtitle="Wave44: Policy DSL صارم + توليد ضوابط داخل الواجهة + تحقق فوري + حفظ نسخ داخل حزمة السياسات"
      badge="Wave44"
      actions={
        <>
          <button className="btn" onClick={load}>تحديث</button>
          <button className="btn btn-secondary" onClick={validateNow}>تحقق الآن</button>
        </>
      }
    >
      {msg ? <div className="notice success">{msg}</div> : null}
      {err ? <div className="notice error">{err}</div> : null}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>نطاق العمل</h2>
        <div className="form-grid cols-3">
          <div>
            <label>organizationId</label>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} />
          </div>
          <div>
            <label>Policy DSL spec</label>
            <input value={String(policy?.spec || '')} readOnly />
          </div>
          <div>
            <label>version</label>
            <input value={String(policy?.version || '')} onChange={(e) => setPolicy({ ...(policy || {}), version: e.target.value })} />
          </div>
        </div>
      </section>

      {ui?.sections?.map((sec) => {
        if (sec.arrayPath) return renderArraySection(sec);
        return (
          <section className="card stack" key={sec.key}>
            <h2 style={{ margin: 0 }}>{sec.titleAr}</h2>
            <div className="form-grid cols-3">
              {(sec.fields || []).map(renderField)}
            </div>
          </section>
        );
      })}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>حفظ نسخة داخل Policy Pack</h2>
        <form className="form-grid cols-3" onSubmit={saveVersion}>
          <div>
            <label>packId</label>
            <input value={packId} onChange={(e) => setPackId(e.target.value)} placeholder="مثال: pk_..." />
          </div>
          <div>
            <label>version</label>
            <input value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div>
            <label>changelog</label>
            <input value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder="ملخص التغيير" />
          </div>
          <div className="row" style={{ alignItems: 'end' }}>
            <button className="btn" type="submit">حفظ النسخة</button>
          </div>
        </form>
        <div className="notice">
          هذه الخطوة تحفظ نسخة داخل الحزمة فقط. للتفعيل استخدم API: POST /governance/policy-packs/:packId/activate.
        </div>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>نتيجة التحقق</h2>
        {validation ? (
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(validation, null, 2)}</pre>
        ) : (
          <div className="muted">نفّذ تحقق الآن لعرض الأخطاء أو التأكيد</div>
        )}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>JSON Preview</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(policy, null, 2)}</pre>
      </section>
    </AppShell>
  );
}
