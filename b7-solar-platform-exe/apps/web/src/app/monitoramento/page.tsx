'use client';

import { useEffect, useState } from 'react';

type Overview = {
  totals: { plants: number; active: number; warning: number; offline: number; openAlerts: number };
  plants: Array<{ id: string; name: string; status: string; customer?: { name: string } }>;
};

export default function MonitoramentoPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/monitoring/overview`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Falha ao consultar API')))
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <main className="shell"><h1>Monitoramento</h1><p>{error}</p></main>;
  if (!data) return <main className="shell"><h1>Monitoramento</h1><p>Carregando...</p></main>;

  return (
    <main className="shell">
      <header className="header">
        <div><div className="eyebrow">B7 SOLAR</div><h1>Monitoramento</h1><p>Visão operacional das usinas.</p></div>
        <div className="status">● API conectada</div>
      </header>
      <section className="cards">
        <article className="card"><span>Usinas</span><strong>{data.totals.plants}</strong><small>Total cadastradas</small></article>
        <article className="card"><span>Normais</span><strong>{data.totals.active}</strong><small>Operação normal</small></article>
        <article className="card"><span>Atenção</span><strong>{data.totals.warning}</strong><small>Precisam de análise</small></article>
        <article className="card"><span>Alertas</span><strong>{data.totals.openAlerts}</strong><small>Em aberto</small></article>
      </section>
      <section className="panel">
        <div className="panel-title"><div><h2>Usinas monitoradas</h2><p>Dados provenientes do núcleo central.</p></div></div>
        <div style={{overflowX:'auto', marginTop:20}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr><th style={{textAlign:'left',padding:12}}>Usina</th><th style={{textAlign:'left',padding:12}}>Cliente</th><th style={{textAlign:'left',padding:12}}>Status</th></tr></thead>
            <tbody>{data.plants.map(p => <tr key={p.id}><td style={{padding:12,borderTop:'1px solid #eee'}}>{p.name}</td><td style={{padding:12,borderTop:'1px solid #eee'}}>{p.customer?.name || '—'}</td><td style={{padding:12,borderTop:'1px solid #eee'}}>{p.status}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
