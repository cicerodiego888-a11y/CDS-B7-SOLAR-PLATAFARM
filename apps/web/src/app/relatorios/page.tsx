import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

export default function RelatoriosPage() {
  return (
    <div className="shell">
      <PageHeader title="Relatórios" description="Visões consolidadas de geração, status e operação." />
      <section className="panel">
        <EmptyState title="Relatórios ainda não disponíveis" description="Esta área será preenchida após a ativação das integrações." />
      </section>
    </div>
  );
}
