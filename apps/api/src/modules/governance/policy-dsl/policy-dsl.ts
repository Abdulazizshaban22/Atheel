export const POLICY_DSL_SPEC_V1 = 'atheel-governance-policy/v1' as const;

export type EscalationChannel = 'in_app' | 'slack' | 'email' | 'whatsapp';
export type EscalationSeverity = 'info' | 'warning' | 'critical';

export type EscalationLevel = {
  afterMinutes: number;
  severity?: EscalationSeverity;
  notify?: string[]; // current_approver | role names
  channels?: EscalationChannel[];
  titleAr?: string;
  messageAr?: string;
};

export type GovernancePolicyDslV1 = {
  spec: typeof POLICY_DSL_SPEC_V1;
  version: string;

  routing: {
    approvals: {
      defaultApproverRole: string;
    };
  };

  sla: {
    approvals: { defaultHours: number };
    workflows: { defaultMinutes: number };
  };

  escalations: {
    approvals: EscalationLevel[];
    workflows: EscalationLevel[];
  };

  ui?: {
    locale?: 'ar' | 'en';
    labels?: Record<string, string>;
  };
};

export type GovernancePolicyCompat = {
  version?: string;
  routing?: { approvals?: { defaultApproverRole?: string } };
  sla?: { approvals?: { defaultHours?: number }; workflows?: { defaultMinutes?: number } };
  escalations?: { approvals?: EscalationLevel[]; workflows?: EscalationLevel[] };
};

export const POLICY_DSL_DEFAULT_V1: GovernancePolicyDslV1 = {
  spec: POLICY_DSL_SPEC_V1,
  version: 'default-1',
  routing: { approvals: { defaultApproverRole: 'org_admin' } },
  sla: { approvals: { defaultHours: 48 }, workflows: { defaultMinutes: 60 } },
  escalations: {
    approvals: [
      {
        afterMinutes: 0,
        severity: 'warning',
        notify: ['current_approver', 'org_admin'],
        channels: ['in_app'],
        titleAr: 'تنبيه: طلب موافقة متأخر',
        messageAr: 'لديك طلب موافقة متأخر عن وقت الاستحقاق.',
      },
      {
        afterMinutes: 60,
        severity: 'critical',
        notify: ['org_admin'],
        channels: ['in_app', 'slack'],
        titleAr: 'تصعيد: طلب موافقة تجاوز ساعة تأخير',
        messageAr: 'تم تصعيد طلب الموافقة بسبب تجاوز ساعة بعد وقت الاستحقاق.',
      },
      {
        afterMinutes: 240,
        severity: 'critical',
        notify: ['org_admin', 'super_admin'],
        channels: ['in_app', 'slack', 'email'],
        titleAr: 'تصعيد عالي: طلب موافقة متعطل',
        messageAr: 'طلب الموافقة متعطل منذ ساعات بعد وقت الاستحقاق.',
      },
    ],
    workflows: [
      {
        afterMinutes: 0,
        severity: 'warning',
        notify: ['org_admin'],
        channels: ['in_app'],
        titleAr: 'تنبيه: تجاوز SLA في سير عمل',
        messageAr: 'تم تجاوز SLA في تنفيذ سير عمل.',
      },
      {
        afterMinutes: 30,
        severity: 'critical',
        notify: ['org_admin'],
        channels: ['in_app', 'slack'],
        titleAr: 'تصعيد: SLA في سير عمل',
        messageAr: 'تصعيد تلقائي بسبب استمرار تجاوز SLA.',
      },
    ],
  },
  ui: { locale: 'ar' },
};

export type ValidationErrorItem = { path: string; message: string };

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function pushErr(errors: ValidationErrorItem[], path: string, message: string) {
  errors.push({ path, message });
}

function checkUnknownKeys(errors: ValidationErrorItem[], obj: any, path: string, allowed: string[]) {
  if (!isPlainObject(obj)) return;
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) pushErr(errors, path ? `${path}.${k}` : k, 'حقل غير معروف (غير مسموح في Policy DSL)');
  }
}

function asNumber(v: any): number | null {
  const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN);
  return Number.isFinite(n) ? n : null;
}

function normString(v: any): string {
  return String(v ?? '').trim();
}

const ALLOWED_CHANNELS: EscalationChannel[] = ['in_app', 'slack', 'email', 'whatsapp'];
const ALLOWED_SEVERITIES: EscalationSeverity[] = ['info', 'warning', 'critical'];

export function validatePolicyDslV1(input: any): { ok: boolean; errors: ValidationErrorItem[] } {
  const errors: ValidationErrorItem[] = [];

  if (!isPlainObject(input)) {
    pushErr(errors, '$', 'السياسة يجب أن تكون كائن JSON');
    return { ok: false, errors };
  }

  checkUnknownKeys(errors, input, '$', ['spec', 'version', 'routing', 'sla', 'escalations', 'ui']);

  if (input.spec !== POLICY_DSL_SPEC_V1) {
    pushErr(errors, '$.spec', `spec يجب أن يساوي ${POLICY_DSL_SPEC_V1}`);
  }

  const version = normString(input.version);
  if (!version) pushErr(errors, '$.version', 'version مطلوب');

  // routing
  if (!isPlainObject(input.routing)) pushErr(errors, '$.routing', 'routing مطلوب ويجب أن يكون كائن');
  else {
    checkUnknownKeys(errors, input.routing, '$.routing', ['approvals']);
    if (!isPlainObject(input.routing.approvals)) pushErr(errors, '$.routing.approvals', 'routing.approvals مطلوب');
    else {
      checkUnknownKeys(errors, input.routing.approvals, '$.routing.approvals', ['defaultApproverRole']);
      const role = normString(input.routing.approvals.defaultApproverRole);
      if (!role) pushErr(errors, '$.routing.approvals.defaultApproverRole', 'defaultApproverRole مطلوب');
    }
  }

  // sla
  if (!isPlainObject(input.sla)) pushErr(errors, '$.sla', 'sla مطلوب ويجب أن يكون كائن');
  else {
    checkUnknownKeys(errors, input.sla, '$.sla', ['approvals', 'workflows']);

    if (!isPlainObject(input.sla.approvals)) pushErr(errors, '$.sla.approvals', 'sla.approvals مطلوب');
    else {
      checkUnknownKeys(errors, input.sla.approvals, '$.sla.approvals', ['defaultHours']);
      const hours = asNumber(input.sla.approvals.defaultHours);
      if (hours === null || hours <= 0) pushErr(errors, '$.sla.approvals.defaultHours', 'defaultHours يجب أن يكون رقمًا أكبر من 0');
    }

    if (!isPlainObject(input.sla.workflows)) pushErr(errors, '$.sla.workflows', 'sla.workflows مطلوب');
    else {
      checkUnknownKeys(errors, input.sla.workflows, '$.sla.workflows', ['defaultMinutes']);
      const mins = asNumber(input.sla.workflows.defaultMinutes);
      if (mins === null || mins <= 0) pushErr(errors, '$.sla.workflows.defaultMinutes', 'defaultMinutes يجب أن يكون رقمًا أكبر من 0');
    }
  }

  // escalations
  if (!isPlainObject(input.escalations)) pushErr(errors, '$.escalations', 'escalations مطلوب ويجب أن يكون كائن');
  else {
    checkUnknownKeys(errors, input.escalations, '$.escalations', ['approvals', 'workflows']);

    const validateLevels = (levels: any, path: string) => {
      if (!Array.isArray(levels)) {
        pushErr(errors, path, 'يجب أن يكون مصفوفة');
        return;
      }
      levels.forEach((lvl: any, i: number) => {
        const p = `${path}[${i}]`;
        if (!isPlainObject(lvl)) {
          pushErr(errors, p, 'مستوى التصعيد يجب أن يكون كائن');
          return;
        }
        checkUnknownKeys(errors, lvl, p, ['afterMinutes', 'severity', 'notify', 'channels', 'titleAr', 'messageAr']);

        const after = asNumber(lvl.afterMinutes);
        if (after === null || after < 0) pushErr(errors, `${p}.afterMinutes`, 'afterMinutes يجب أن يكون رقمًا >= 0');

        if (lvl.severity !== undefined) {
          const sev = normString(lvl.severity) as any;
          if (!ALLOWED_SEVERITIES.includes(sev)) pushErr(errors, `${p}.severity`, `severity يجب أن تكون واحدة من: ${ALLOWED_SEVERITIES.join(', ')}`);
        }

        if (lvl.notify !== undefined) {
          if (!Array.isArray(lvl.notify)) pushErr(errors, `${p}.notify`, 'notify يجب أن يكون مصفوفة نصوص');
          else {
            lvl.notify.forEach((x: any, j: number) => {
              const s = normString(x);
              if (!s) pushErr(errors, `${p}.notify[${j}]`, 'notify عنصر فارغ');
            });
          }
        }

        if (lvl.channels !== undefined) {
          if (!Array.isArray(lvl.channels)) pushErr(errors, `${p}.channels`, 'channels يجب أن يكون مصفوفة');
          else {
            lvl.channels.forEach((x: any, j: number) => {
              const s = normString(x) as any;
              if (!ALLOWED_CHANNELS.includes(s)) pushErr(errors, `${p}.channels[${j}]`, `قناة غير مدعومة: ${s}`);
            });
          }
        }

        if (lvl.titleAr !== undefined && typeof lvl.titleAr !== 'string') pushErr(errors, `${p}.titleAr`, 'titleAr يجب أن يكون نصًا');
        if (lvl.messageAr !== undefined && typeof lvl.messageAr !== 'string') pushErr(errors, `${p}.messageAr`, 'messageAr يجب أن يكون نصًا');
      });

      // monotonic check
      const numericAfter = levels.map((l: any) => asNumber(l.afterMinutes) ?? -1);
      for (let i = 1; i < numericAfter.length; i++) {
        if (numericAfter[i] >= 0 && numericAfter[i - 1] >= 0 && numericAfter[i] < numericAfter[i - 1]) {
          pushErr(errors, path, 'مستويات afterMinutes يجب أن تكون مرتبة تصاعديًا (أو سيتم ترتيبها تلقائيًا عند التنفيذ)');
          break;
        }
      }
    };

    validateLevels(input.escalations.approvals, '$.escalations.approvals');
    validateLevels(input.escalations.workflows, '$.escalations.workflows');
  }

  // ui
  if (input.ui !== undefined) {
    if (!isPlainObject(input.ui)) pushErr(errors, '$.ui', 'ui يجب أن يكون كائن');
    else {
      checkUnknownKeys(errors, input.ui, '$.ui', ['locale', 'labels']);
      if (input.ui.locale !== undefined) {
        const loc = normString(input.ui.locale);
        if (!['ar', 'en'].includes(loc)) pushErr(errors, '$.ui.locale', 'locale يجب أن تكون ar أو en');
      }
      if (input.ui.labels !== undefined) {
        if (!isPlainObject(input.ui.labels)) pushErr(errors, '$.ui.labels', 'labels يجب أن يكون كائن مفاتيح/قيم نصية');
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function compilePolicyDslV1(dsl: GovernancePolicyDslV1): GovernancePolicyCompat {
  const approvals = Array.isArray(dsl.escalations?.approvals) ? dsl.escalations.approvals : [];
  const workflows = Array.isArray(dsl.escalations?.workflows) ? dsl.escalations.workflows : [];

  const normalizeLevels = (levels: EscalationLevel[]): EscalationLevel[] => {
    return levels
      .map((l) => ({
        afterMinutes: Math.max(0, Number(l.afterMinutes ?? 0) || 0),
        severity: (l.severity || 'warning') as any,
        notify: Array.isArray(l.notify) ? l.notify.map((x) => String(x).trim()).filter(Boolean) : [],
        channels: Array.isArray(l.channels) ? (l.channels as Record<string, unknown>).map((x: any /* typed */) => String(x).trim()).filter(Boolean) : ['in_app'],
        titleAr: l.titleAr ? String(l.titleAr) : undefined,
        messageAr: l.messageAr ? String(l.messageAr) : undefined,
      }))
      .sort((a, b) => a.afterMinutes - b.afterMinutes);
  };

  return {
    version: dsl.version,
    routing: { approvals: { defaultApproverRole: dsl.routing.approvals.defaultApproverRole } },
    sla: {
      approvals: { defaultHours: Number(dsl.sla.approvals.defaultHours) || 48 },
      workflows: { defaultMinutes: Number(dsl.sla.workflows.defaultMinutes) || 60 },
    },
    escalations: {
      approvals: normalizeLevels(approvals),
      workflows: normalizeLevels(workflows),
    },
  };
}

export function normalizeToPolicyDslV1(input: any): { dsl: GovernancePolicyDslV1; warnings: string[] } {
  const warnings: string[] = [];

  // Already DSL
  if (isPlainObject(input) && input.spec === POLICY_DSL_SPEC_V1) {
    return { dsl: input as GovernancePolicyDslV1, warnings };
  }

  // Legacy -> DSL upgrade
  const legacy = (input || {}) as GovernancePolicyCompat;

  if (!legacy?.routing || !legacy?.sla || !legacy?.escalations) {
    warnings.push('تم استخدام سياسة افتراضية لأن المدخل لا يطابق DSL أو الشكل القديم بالكامل.');
    return { dsl: POLICY_DSL_DEFAULT_V1, warnings };
  }

  warnings.push('تم ترقية سياسة قديمة إلى Policy DSL v1 تلقائيًا.');

  const dsl: GovernancePolicyDslV1 = {
    spec: POLICY_DSL_SPEC_V1,
    version: String(legacy.version || 'upgraded-1'),
    routing: {
      approvals: {
        defaultApproverRole: String(legacy.routing?.approvals?.defaultApproverRole || "org_admin"),
      },
    },
    sla: {
      approvals: { defaultHours: Number(legacy.sla?.approvals?.defaultHours ?? 48) || 48 },
      workflows: { defaultMinutes: Number(legacy.sla?.workflows?.defaultMinutes ?? 60) || 60 },
    },
    escalations: {
      approvals: Array.isArray(legacy.escalations?.approvals) ? (legacy.escalations!.approvals as any) : [],
      workflows: Array.isArray(legacy.escalations?.workflows) ? (legacy.escalations!.workflows as any) : [],
    },
    ui: { locale: 'ar' },
  };

  return { dsl, warnings };
}

export const POLICY_DSL_JSON_SCHEMA_V1: any = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Atheel Governance Policy DSL v1',
  type: 'object',
  additionalProperties: false,
  required: ['spec', 'version', 'routing', 'sla', 'escalations'],
  properties: {
    spec: { const: POLICY_DSL_SPEC_V1, description: 'معرّف مواصفة Policy DSL' },
    version: { type: 'string', minLength: 1, description: 'نسخة السياسة داخل الحزمة' },
    routing: {
      type: 'object',
      additionalProperties: false,
      required: ['approvals'],
      properties: {
        approvals: {
          type: 'object',
          additionalProperties: false,
          required: ['defaultApproverRole'],
          properties: {
            defaultApproverRole: { type: 'string', description: 'الدور الافتراضي للمعتمد' },
          },
          'x-ui': { titleAr: 'التوجيه والاعتمادات' },
        },
      },
      'x-ui': { titleAr: 'التوجيه' },
    },
    sla: {
      type: 'object',
      additionalProperties: false,
      required: ['approvals', 'workflows'],
      properties: {
        approvals: {
          type: 'object',
          additionalProperties: false,
          required: ['defaultHours'],
          properties: {
            defaultHours: { type: 'number', minimum: 1, maximum: 720, default: 48, description: 'SLA الافتراضي للموافقات بالساعات' },
          },
          'x-ui': { titleAr: 'SLA للموافقات' },
        },
        workflows: {
          type: 'object',
          additionalProperties: false,
          required: ['defaultMinutes'],
          properties: {
            defaultMinutes: { type: 'number', minimum: 1, maximum: 10080, default: 60, description: 'SLA الافتراضي لسير العمل بالدقائق' },
          },
          'x-ui': { titleAr: 'SLA لسير العمل' },
        },
      },
      'x-ui': { titleAr: 'اتفاقيات مستوى الخدمة' },
    },
    escalations: {
      type: 'object',
      additionalProperties: false,
      required: ['approvals', 'workflows'],
      properties: {
        approvals: {
          type: 'array',
          items: { $ref: '#/$defs/escalationLevel' },
          default: POLICY_DSL_DEFAULT_V1.escalations.approvals,
          'x-ui': { titleAr: 'تصعيدات الموافقات' },
        },
        workflows: {
          type: 'array',
          items: { $ref: '#/$defs/escalationLevel' },
          default: POLICY_DSL_DEFAULT_V1.escalations.workflows,
          'x-ui': { titleAr: 'تصعيدات سير العمل' },
        },
      },
      'x-ui': { titleAr: 'محرك التصعيد' },
    },
    ui: {
      type: 'object',
      additionalProperties: false,
      properties: {
        locale: { type: 'string', enum: ['ar', 'en'], default: 'ar' },
        labels: { type: 'object', additionalProperties: { type: 'string' } },
      },
      'x-ui': { titleAr: 'إعدادات الواجهة' },
    },
  },
  $defs: {
    escalationLevel: {
      type: 'object',
      additionalProperties: false,
      required: ['afterMinutes'],
      properties: {
        afterMinutes: { type: 'number', minimum: 0, description: 'الزمن بعد الاستحقاق بالدقائق' },
        severity: { type: 'string', enum: ALLOWED_SEVERITIES },
        notify: { type: 'array', items: { type: 'string' } },
        channels: { type: 'array', items: { type: 'string', enum: ALLOWED_CHANNELS } },
        titleAr: { type: 'string' },
        messageAr: { type: 'string' },
      },
      'x-ui': { titleAr: 'مستوى تصعيد' },
    },
  },
};

export const POLICY_DSL_UI_V1 = {
  spec: POLICY_DSL_SPEC_V1,
  version: 'ui-1',
  sections: [
    {
      key: 'routing',
      titleAr: 'التوجيه',
      fields: [
        {
          path: 'routing.approvals.defaultApproverRole',
          type: 'enum',
          titleAr: 'الدور الافتراضي للمعتمد',
          enum: ['org_admin', 'project_manager', 'curator', 'content_editor', 'experience_designer', 'analyst', 'viewer', 'super_admin'],
          helpAr: 'عند إرسال طلب موافقة بدون تحديد معتمد، يتم اختيار أول عضو يطابق هذا الدور داخل الجهة.',
        },
      ],
    },
    {
      key: 'sla',
      titleAr: 'اتفاقيات مستوى الخدمة',
      fields: [
        {
          path: 'sla.approvals.defaultHours',
          type: 'number',
          min: 1,
          max: 720,
          step: 1,
          titleAr: 'SLA افتراضي للموافقات (ساعات)',
        },
        {
          path: 'sla.workflows.defaultMinutes',
          type: 'number',
          min: 1,
          max: 10080,
          step: 1,
          titleAr: 'SLA افتراضي لسير العمل (دقائق)',
        },
      ],
    },
    {
      key: 'escalations_approvals',
      titleAr: 'تصعيدات الموافقات',
      arrayPath: 'escalations.approvals',
      itemFields: [
        { path: 'afterMinutes', type: 'number', min: 0, step: 1, titleAr: 'بعد كم دقيقة من الاستحقاق؟' },
        { path: 'severity', type: 'enum', enum: ALLOWED_SEVERITIES, titleAr: 'الشدة' },
        { path: 'channels', type: 'multi_enum', enum: ALLOWED_CHANNELS, titleAr: 'القنوات' },
        { path: 'notify', type: 'string_array', titleAr: 'المستلمون (current_approver أو أدوار)' },
        { path: 'titleAr', type: 'string', titleAr: 'عنوان التنبيه' },
        { path: 'messageAr', type: 'string', titleAr: 'نص التنبيه' },
      ],
      noteAr: 'يتم ترتيب المستويات تصاعديًا تلقائيًا، مع منع التكرار عبر EscalationState.',
    },
    {
      key: 'escalations_workflows',
      titleAr: 'تصعيدات سير العمل',
      arrayPath: 'escalations.workflows',
      itemFields: [
        { path: 'afterMinutes', type: 'number', min: 0, step: 1, titleAr: 'بعد كم دقيقة؟' },
        { path: 'severity', type: 'enum', enum: ALLOWED_SEVERITIES, titleAr: 'الشدة' },
        { path: 'channels', type: 'multi_enum', enum: ALLOWED_CHANNELS, titleAr: 'القنوات' },
        { path: 'notify', type: 'string_array', titleAr: 'المستلمون (أدوار)' },
        { path: 'titleAr', type: 'string', titleAr: 'عنوان التنبيه' },
        { path: 'messageAr', type: 'string', titleAr: 'نص التنبيه' },
      ],
      noteAr: 'يتم استعمال هذه المستويات في escalations.evaluateWorkflow (عند توفر مصدر SLA لسير العمل).',
    },
  ],
};
