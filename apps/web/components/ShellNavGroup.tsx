type Item = { href: string; label: string; muted?: boolean };

export function ShellNavGroup(props: { title: string; items: Item[]; activeHref?: string }) {
  return (
    <section className="shell-nav-group">
      <div className="shell-nav-title">{props.title}</div>
      <div className="shell-nav-items">
        {props.items.map((item) => {
          const active = props.activeHref === item.href || props.activeHref?.startsWith(item.href + '/');
          return (
            <a key={item.href} href={item.href} className={`shell-nav-item ${active ? 'active' : ''} ${item.muted ? 'muted' : ''}`}>
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
