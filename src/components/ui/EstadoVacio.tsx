export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
      {mensaje}
    </div>
  );
}
