export interface EvaluacionResponse {
  id_evaluacion: number;
  id_incidente: number;
  id_taller: number;
  id_tecnico?: number | null;
  estrellas: number;           // 1..5
  comentario?: string | null;
  created_at: string;
}
