export type GovTemplateMeta = {
  orgNameAr?: string;
  orgNameEn?: string;
  // Wave50: الجهة المستلمة (للخطاب الحكومي)
  recipientNameAr?: string;
  recipientNameEn?: string;
  /** نوع الجهة المستلمة لتطبيق قالب حكومي ثابت حسب النوع */
  recipientKind?:
    | 'heritage_authority'
    | 'municipality'
    | 'museum'
    | 'season'
    | 'tourism_destination'
    | 'government'
    | 'semi_government'
    | 'private'
    | 'ngo'
    | 'auto';

  reportTitleAr: string;
  reportSubtitleAr?: string;
  projectNameAr?: string;
  experienceTitleAr?: string;
  versionLabel?: string;
  confidentialityLabelAr?: string;
  generatedAtIso?: string;
  verificationUrl?: string;
  qrPngDataUrl?: string;

  /** رمز تحقق قصير لربط الصفحة بالحزمة */
  verificationCode?: string;

  /** معرف وثيقة/حزمة (مثل ApprovalPacket ID) لصفحة التحقق */
  documentId?: string;

  /** نص اختياري لتوضيح آلية التحقق */
  verificationNoteAr?: string;

  /** شعارات اختيارية (Data URL) */
  issuerLogoPngDataUrl?: string;
  recipientLogoPngDataUrl?: string;

  approvals?: {
    statusAr?: string;
    approvalId?: string;
    dueAtIso?: string;
    decidedAtIso?: string;
    decisionNote?: string;
    signers?: Array<{ nameAr: string; roleAr?: string; statusAr?: string; signedAtIso?: string }>;
  };
};

export type RenderOptions = {
  templateMeta: GovTemplateMeta;
  languageCode?: 'ar' | 'en';
};

export type SlideSpec = {
  title: string;
  bullets: string[];
};

export type PptxBuildOptions = RenderOptions & {
  addSignatureSlide?: boolean;
};

export type PdfBuildOptions = RenderOptions & {
  addSignaturePage?: boolean;
  pageSize?: 'A4' | 'Letter';
};

export type ZipFile = { name: string; buffer: Buffer };
