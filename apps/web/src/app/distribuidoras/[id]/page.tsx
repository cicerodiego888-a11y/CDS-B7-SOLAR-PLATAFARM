'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiError, fetchApi } from '../../../lib/api';
import { recordStatusLabel } from '../../../lib/operational';

type Distributor = {
  id: string;
  name: string;
  code: string;
  cnpj?: string | null;
  status: string;
  consumerUnits: Array<{
    id: string;
    number: string;
    status: string;
    consumer: { id: string; name: string };
  }>;
};

export default function DistribuidoraDetalhePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Distributor | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<Distributor>(`/distributors/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a distribuidora.'));
  }, [params.id]);

  if (error) return <div className="shell"><ErrorMessage message={error} /></div>;
  if (!data) return <div className="shell"><LoadingState message="Carregando distribuidora..." /></div>;

  return (
    <div className="shell">
      <PageHeader
        title={data.name}
        description={`Código ${data.code}${data.cnpj ? ` · CNPJ ${data.cnpj}` : ''}`}
        actions={<StatusBadge label={recordStatusLabel(data.status)} status={data.status} />}
      />
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Unidades consumidoras</h2>
            <p>{data.consumerUnits.length} UC(s) vinculada(s).</p>
          </div>
        </div>
        <DataTable
          rows={data.consumerUnits}
          rowKey={(row) => row.id}
          columns={[
            { key: 'number', header: 'UC', render: (row) => <Link href={`/unidades-consumidoras/${row.id}`}>{row.number}</Link> },
            { key: 'consumer', header: 'Consumidor', render: (row) => <Link href={`/consumidores/${row.consumer.id}`}>{row.consumer.name}</Link> },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge label={recordStatusLabel(row.status)} status={row.status} /> },
          ]}
          empty={<EmptyState title="Nenhuma UC" description="Esta distribuidora ainda não possui unidades consumidoras." />}
        />
      </section>
    </div>
  );
}
