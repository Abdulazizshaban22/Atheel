import type { Metadata } from 'next';
import './globals.css';
// Cesium widgets styles (needed for 3D Tiles viewer)
import 'cesium/Build/Cesium/Widgets/widgets.css';

export const metadata: Metadata = {
  title: 'أَثِيل | منصة تشغيل الثقافة السعودية',
  description: 'منصة تشغيل وإدارة المشاريع والمحتوى والتجارب الثقافية للجهات والوجهات والمتاحف'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
