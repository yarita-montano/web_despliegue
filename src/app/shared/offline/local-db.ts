import Dexie, { Table } from 'dexie';

export interface CachedIncidente {
  id_incidente: number;
  id_categoria?: number;
  descripcion_usuario?: string;
  resumen_ia?: string;
  latitud: number;
  longitud: number;
  estado_nombre?: string;
  created_at: string;
  cached_at: string;
}

export interface OutboxItem {
  id?: number;
  client_id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  created_at: string;
  attempts: number;
  last_error?: string;
}

export class AppLocalDB extends Dexie {
  incidentes!: Table<CachedIncidente, number>;
  outbox!: Table<OutboxItem, number>;

  constructor() {
    super('emergencia-offline');
    this.version(1).stores({
      incidentes: 'id_incidente, created_at',
      outbox: '++id, client_id, created_at',
    });
  }
}

export const localDB = new AppLocalDB();
