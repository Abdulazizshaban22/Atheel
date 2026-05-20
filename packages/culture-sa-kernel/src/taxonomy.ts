export type SaudiRegion =
  | 'Riyadh'
  | 'Makkah'
  | 'Madinah'
  | 'Eastern'
  | 'Qassim'
  | 'Hail'
  | 'Tabuk'
  | 'NorthernBorders'
  | 'Jouf'
  | 'Baha'
  | 'Asir'
  | 'Jazan'
  | 'Najran';

export type CultureTheme =
  | 'UNESCO_Intangible'
  | 'UNESCO_WorldHeritage'
  | 'Architecture'
  | 'Crafts'
  | 'Food'
  | 'Coffee'
  | 'Poetry_Story'
  | 'Music_Performance'
  | 'Markets_Trade'
  | 'Oasis_Desert'
  | 'Sea_Coastal'
  | 'Hajj_Routes'
  | 'Contemporary_Creative';

export type CultureFormat =
  | 'Festival'
  | 'Exhibition'
  | 'Workshop'
  | 'GuidedTour'
  | 'Performance'
  | 'PopUp'
  | 'SchoolProgram'
  | 'DigitalStory'
  | 'AR_XR'
  | 'CulinaryExperience';

export type CultureAudience =
  | 'Families'
  | 'Youth'
  | 'Tourists'
  | 'Schools'
  | 'Professionals'
  | 'Community'
  | 'Women'
  | 'Elders'
  | 'PeopleWithDisabilities'
  | 'Mixed';


export type MocCulturalSector =
  | 'Heritage'
  | 'Museums'
  | 'Cultural_Archaeological_Sites'
  | 'Theater_Performing_Arts'
  | 'Festivals_Events'
  | 'Books_Publishing'
  | 'Architecture_Design'
  | 'Natural_Heritage'
  | 'Film'
  | 'Fashion'
  | 'Language_Translation'
  | 'Culinary_Arts'
  | 'Literature'
  | 'Libraries'
  | 'Visual_Arts'
  | 'Music';

export const MOC_CULTURAL_SECTORS: Array<{
  code: MocCulturalSector;
  nameAr: string;
  nameEn: string;
  keywords: string[];
}> = [
  { code: 'Heritage', nameAr: 'التراث', nameEn: 'Heritage', keywords: ['تراث', 'موروث', 'هوية', 'تقاليد', 'حِمى', 'الدرعية', 'جدة التاريخية'] },
  { code: 'Museums', nameAr: 'المتاحف', nameEn: 'Museums', keywords: ['متحف', 'متاحف', 'معروضات', 'قاعات'] },
  { code: 'Cultural_Archaeological_Sites', nameAr: 'المواقع الثقافية والأثرية', nameEn: 'Cultural & Archaeological Sites', keywords: ['موقع أثري', 'مواقع أثرية', 'موقع ثقافي', 'آثار', 'ترميم'] },
  { code: 'Theater_Performing_Arts', nameAr: 'المسرح والفنون الأدائية', nameEn: 'Theater & Performing Arts', keywords: ['مسرح', 'عرض', 'أداء', 'استعراض', 'performing', 'theater'] },
  { code: 'Festivals_Events', nameAr: 'المهرجانات والفعاليات الثقافية', nameEn: 'Cultural Festivals & Events', keywords: ['مهرجان', 'فعالية', 'كرنفال', 'موسم', 'events', 'festival'] },
  { code: 'Books_Publishing', nameAr: 'الكتب والنشر', nameEn: 'Books & Publishing', keywords: ['كتاب', 'كتب', 'نشر', 'دار نشر', 'معرض كتاب'] },
  { code: 'Architecture_Design', nameAr: 'العمارة والتصميم', nameEn: 'Architecture & Design', keywords: ['عمارة', 'تصميم', 'تصميم معماري', 'هوية عمرانية', 'جناح', 'بوث'] },
  { code: 'Natural_Heritage', nameAr: 'التراث الطبيعي', nameEn: 'Natural Heritage', keywords: ['تراث طبيعي', 'محمية', 'بيئة', 'طبيعة', 'واحة', 'جبال', 'ساحل'] },
  { code: 'Film', nameAr: 'الأفلام', nameEn: 'Film', keywords: ['فيلم', 'سينما', 'مهرجان سينمائي', 'film', 'cinema'] },
  { code: 'Fashion', nameAr: 'الأزياء', nameEn: 'Fashion', keywords: ['أزياء', 'موضة', 'fashion', 'عرض أزياء'] },
  { code: 'Language_Translation', nameAr: 'اللغة والترجمة', nameEn: 'Language & Translation', keywords: ['لغة', 'ترجمة', 'تعريب', 'قاموس'] },
  { code: 'Culinary_Arts', nameAr: 'فنون الطهي', nameEn: 'Culinary Arts', keywords: ['طهي', 'مطبخ', 'أكلات', 'تذوق', 'culinary', 'food festival'] },
  { code: 'Literature', nameAr: 'الأدب', nameEn: 'Literature', keywords: ['أدب', 'رواية', 'قصة', 'شعر', 'أمسية'] },
  { code: 'Libraries', nameAr: 'المكتبات', nameEn: 'Libraries', keywords: ['مكتبة', 'مكتبات', 'قراءة', 'إعارة'] },
  { code: 'Visual_Arts', nameAr: 'الفنون البصرية', nameEn: 'Visual Arts', keywords: ['فنون بصرية', 'فن تشكيلي', 'لوحات', 'معرض فني', 'visual arts'] },
  { code: 'Music', nameAr: 'الموسيقى', nameEn: 'Music', keywords: ['موسيقى', 'حفل', 'أوركسترا', 'غناء', 'music'] },
];

export const SAUDI_REGIONS: Array<{ code: SaudiRegion; nameAr: string; hubs: string[] }> = [
  { code: 'Riyadh', nameAr: 'منطقة الرياض', hubs: ['الرياض', 'الدرعية', 'وادي حنيفة'] },
  { code: 'Makkah', nameAr: 'منطقة مكة المكرمة', hubs: ['جدة التاريخية', 'الطائف', 'مكة'] },
  { code: 'Madinah', nameAr: 'منطقة المدينة المنورة', hubs: ['المدينة', 'العلا (شمال غرب)'] },
  { code: 'Eastern', nameAr: 'المنطقة الشرقية', hubs: ['الدمام', 'الخبر', 'الأحساء'] },
  { code: 'Qassim', nameAr: 'منطقة القصيم', hubs: ['بريدة', 'عنيزة'] },
  { code: 'Hail', nameAr: 'منطقة حائل', hubs: ['حائل', 'جبة', 'الشويمس'] },
  { code: 'Tabuk', nameAr: 'منطقة تبوك', hubs: ['تبوك', 'البحر الأحمر'] },
  { code: 'NorthernBorders', nameAr: 'منطقة الحدود الشمالية', hubs: ['عرعر', 'رفحاء'] },
  { code: 'Jouf', nameAr: 'منطقة الجوف', hubs: ['سكاكا', 'دومة الجندل'] },
  { code: 'Baha', nameAr: 'منطقة الباحة', hubs: ['ذي عين', 'الغابة الرطبة'] },
  { code: 'Asir', nameAr: 'منطقة عسير', hubs: ['أبها', 'رجال ألمع'] },
  { code: 'Jazan', nameAr: 'منطقة جازان', hubs: ['الجبال', 'ساحل جازان', 'جزر فرسان'] },
  { code: 'Najran', nameAr: 'منطقة نجران', hubs: ['نجران', 'القرى الطينية'] },
];

export const CULTURE_THEMES: Array<{ code: CultureTheme; nameAr: string; keywordsAr: string[] }> = [
  { code: 'UNESCO_Intangible', nameAr: 'التراث الثقافي غير المادي', keywordsAr: ['العرضة', 'المجلس', 'القهوة', 'السدو', 'القط العسيري', 'المزمار'] },
  { code: 'UNESCO_WorldHeritage', nameAr: 'مواقع التراث العالمي', keywordsAr: ['الدرعية', 'جدة التاريخية', 'الحِجر', 'الأحساء', 'حِمى', 'فن الصخور'] },
  { code: 'Architecture', nameAr: 'العمارة والهوية العمرانية', keywordsAr: ['نجد', 'حجاز', 'جنوب', 'ساحل', 'طين', 'حجر'] },
  { code: 'Crafts', nameAr: 'الحرف والصناعات التقليدية', keywordsAr: ['سدو', 'نقش', 'نجارة', 'فخار', 'سعف'] },
  { code: 'Food', nameAr: 'المطبخ والأطعمة', keywordsAr: ['حنيذ', 'مفطح', 'مقلقل', 'خبز'] },
  { code: 'Coffee', nameAr: 'القهوة السعودية', keywordsAr: ['قهوة', 'خولاني', 'دلة', 'هيل'] },
  { code: 'Poetry_Story', nameAr: 'الشعر والسرد', keywordsAr: ['نبطي', 'حكايات', 'أمثال'] },
  { code: 'Music_Performance', nameAr: 'الفنون الأدائية', keywordsAr: ['عرضة', 'مزمار', 'سمسمية', 'طرب'] },
  { code: 'Markets_Trade', nameAr: 'الأسواق والطرق التجارية', keywordsAr: ['سوق', 'طريق', 'قوافل'] },
  { code: 'Oasis_Desert', nameAr: 'الواحات والصحراء', keywordsAr: ['واحة', 'نخيل', 'كثبان'] },
  { code: 'Sea_Coastal', nameAr: 'الثقافة البحرية والساحلية', keywordsAr: ['غوص', 'لؤلؤ', 'صيادين'] },
  { code: 'Hajj_Routes', nameAr: 'طرق الحج التاريخية', keywordsAr: ['درب زبيدة', 'محطات', 'قوافل'] },
  { code: 'Contemporary_Creative', nameAr: 'الإبداع المعاصر', keywordsAr: ['سينما', 'موسيقى', 'تصميم', 'فنون رقمية'] },
];

export const CULTURE_FORMATS: Array<{ code: CultureFormat; nameAr: string }> = [
  { code: 'Festival', nameAr: 'مهرجان' },
  { code: 'Exhibition', nameAr: 'معرض' },
  { code: 'Workshop', nameAr: 'ورشة' },
  { code: 'GuidedTour', nameAr: 'جولة' },
  { code: 'Performance', nameAr: 'عرض' },
  { code: 'PopUp', nameAr: 'فعالية مؤقتة' },
  { code: 'SchoolProgram', nameAr: 'برنامج مدرسي' },
  { code: 'DigitalStory', nameAr: 'قصة رقمية' },
  { code: 'AR_XR', nameAr: 'تجربة XR/AR' },
  { code: 'CulinaryExperience', nameAr: 'تجربة تذوق' },
];

export const CULTURE_AUDIENCES: Array<{ code: CultureAudience; nameAr: string }> = [
  { code: 'Families', nameAr: 'العائلات' },
  { code: 'Youth', nameAr: 'الشباب' },
  { code: 'Tourists', nameAr: 'السياح' },
  { code: 'Schools', nameAr: 'المدارس' },
  { code: 'Professionals', nameAr: 'المهنيون' },
  { code: 'Community', nameAr: 'المجتمع المحلي' },
  { code: 'Women', nameAr: 'النساء' },
  { code: 'Elders', nameAr: 'كبار السن' },
  { code: 'PeopleWithDisabilities', nameAr: 'ذوو الإعاقة' },
  { code: 'Mixed', nameAr: 'متنوع' },
];
