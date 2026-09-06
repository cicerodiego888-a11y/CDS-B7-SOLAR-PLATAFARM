export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="ui-state">
      <div className="ui-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
