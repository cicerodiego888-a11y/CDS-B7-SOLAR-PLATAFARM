'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { ApiError, fetchApi } from '../../../lib/api';
import { recordStatusLabel } from '../../../lib/operational';

type ConsumerUnit = {
  id: string;
  number: string;
  address?: string | null;
  status: string;
  consumer: { id: string; name: string; document: string; documentType: string };
  distributor: { id: string; name: string; code: string };
};

export default function UnidadeConsumidoraDetalhePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ConsumerUnit | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApi<ConsumerUnit>(`/consumer-units/${params.id}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Não foi possível carregar a unidade consumidora.'));
  }, [params.id]);

  if (error) return <div className="shell"><ErrorMessage message={error} /></div>;
  if (!data) return <div className="shell"><LoadingState message="Carregando UC..." /></div>;

  return (
    <div className="shell">
      <PageHeader
        title={`UC ${data.number}`}
        description={`${data.distributor.name} · titular ${data.consumer.name}`}
        actions={<StatusBadge label={recordStatusLabel(data.status)} status={data.status} />}
      />
      <section className="metrics-grid">
        <article className="card">
          <span>Número</span>
          <strong>{data.number}</strong>
        </article>
        <article className="card">
          <span>Distribuidora</span>
          <strong><Link href={`/distribuidoras/${data.distributor.id}`}>{data.distributor.name}</Link></strong>
        </article>
        <article className="card">
          <span>Consumidor titular</span>
          <strong><Link href={`/consumidores/${data.consumer.id}`}>{data.consumer.name}</Link></strong>
        </article>
        <article className="card">
          <span>Documento</span>
          <strong>{data.consumer.documentType} {data.consumer.document}</strong>
        </article>
        <article className="card">
          <span>Endereço</span>
          <strong>{data.address || '—'}</strong>
        </article>
        <article className="card">
          <span>Usina vinculada</span>
          <strong>Não aplicável nesta sprint</strong>
        </article>
      </section>
    </div>
  );
}
