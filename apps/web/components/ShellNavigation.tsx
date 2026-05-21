import { NavigationSection, isItemActive } from '../lib/navigation';

type ShellNavigationProps = {
  pathname: string | null;
  sections: NavigationSection[];
};

export function ShellNavigation(props: ShellNavigationProps) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      {props.sections.map((section) => (
        <section key={section.key} className="card stack" style={{ gap: 10 }}>
          <div className="stack" style={{ gap: 4 }}>
            <strong>{section.label}</strong>
            <p className="muted" style={{ margin: 0 }}>{section.description}</p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {section.items.map((item) => {
              const active = isItemActive(props.pathname, item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`btn ${active ? '' : 'btn-ghost'}`}
                  aria-current={active ? 'page' : undefined}
                  title={item.description || item.label}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
