export default function Page() {
  return (
    <main className="container stack">
      <div className="card stack">
        <div className="badge">وحدة</div>
        <h1 style={{ margin: 0 }}>إدارة التجارب والمسارات</h1>
        <ul><li>تعريف التجارب
المسارات والمحطات
النشر والقياس</li></ul>
        <div className="row">
          <a className="btn" href="/workbench">افتح Workbench (CRUD موحد)</a>
          <a className="btn btn-ghost" href="/approvals">الموافقات</a>
          <a className="btn btn-ghost" href="/attachments">المرفقات</a>
        </div>
      </div>
    </main>
  );
}
