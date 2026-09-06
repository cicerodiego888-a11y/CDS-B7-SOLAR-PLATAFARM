import { getStatusTone } from '../../constants/inverters';

type Props = {
  label: string;
  status?: string | null;
};

export function StatusBadge({ label, status }: Props) {
  return <span className={`ui-badge ui-badge-${getStatusTone(status)}`}>{label}</span>;
}
