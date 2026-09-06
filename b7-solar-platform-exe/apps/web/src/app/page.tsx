const cards = [
  ['Usinas', '1', 'Monitoradas'],
  ['Geração hoje', '0 kWh', 'Aguardando integração'],
  ['Alertas', '0', 'Nenhum alerta'],
  ['Status', 'ONLINE', 'Sistema operacional'],
];

export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <div>
          <div className="eyebrow">B7 SOLAR</div>
          <h1>Sistema de Monitoramento</h1>
          <p>Central operacional das usinas fotovoltaicas.</p>
        </div>
        <div className="status">● Sistema online</div>
      </header>

      <section className="cards">
        {cards.map(([title, value, note]) => (
          <article className="card" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Visão das usinas</h2>
            <p>A integração com fabricantes será ativada na próxima etapa.</p>
          </div>
          <a href="/monitoramento" style={{background:"#172033",color:"white",padding:"11px 16px",borderRadius:10,fontWeight:700,textDecoration:"none"}}>Abrir monitoramento</a>
        </div>
        <div className="empty">
          <div className="empty-icon">☀</div>
          <h3>Monitoramento preparado</h3>
          <p>Cadastre a primeira usina e conecte o fabricante do inversor.</p>
        </div>
      </section>
    </main>
  );
}