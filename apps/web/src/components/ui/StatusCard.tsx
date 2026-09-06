import { StatusBadge } from './StatusBadge';

type Props = {
  title: string;
  label: string;
  status?: string | null;
  description?: string;
};

export function StatusCard({ title, label, status, description }: Props) {
  return (
    <article className="card">
      <span>{title}</span>
      <StatusBadge label={label} status={status} />
      {description ? <small>{description}</small> : null}
    </article>
  );
}
