type Props = {
  title: string;
  description: string;
  icon?: string;
};

export function EmptyState({ title, description, icon = '☀' }: Props) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
