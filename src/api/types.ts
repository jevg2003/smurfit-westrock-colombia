export interface TrmRegistro {
  valor: string;
  unidad: string;
  vigenciadesde: string;
  vigenciahasta: string;
}

export interface PuntoTrm {
  fecha: string;
  valor: number;
  variacionPct: number | null;
  atipico: boolean;
}
