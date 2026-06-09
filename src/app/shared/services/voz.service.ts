import { Injectable, signal } from '@angular/core';

/**
 * Dictado por voz con la Web Speech API del navegador (webkitSpeechRecognition).
 * Solo transcribe voz -> texto en el cliente; no envía audio al backend.
 */
@Injectable({ providedIn: 'root' })
export class VozService {
  /** El navegador soporta reconocimiento de voz (Chrome/Edge sí; Firefox no). */
  readonly soportado = signal(false);
  /** Hay una captura de voz en curso. */
  readonly escuchando = signal(false);

  private Reconocedor: any;

  constructor() {
    const w = window as any;
    this.Reconocedor = w.SpeechRecognition || w.webkitSpeechRecognition || null;
    this.soportado.set(!!this.Reconocedor);
  }

  /**
   * Captura una frase y resuelve con el texto transcrito (trim). Rechaza con un
   * Error legible si no hay soporte, se deniega el micrófono o no se oye voz.
   */
  dictar(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!this.Reconocedor) {
        reject(new Error('Tu navegador no soporta dictado por voz'));
        return;
      }

      const rec = new this.Reconocedor();
      rec.lang = 'es-ES';
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      let texto = '';
      this.escuchando.set(true);

      rec.onresult = (ev: any) => {
        texto = ev?.results?.[0]?.[0]?.transcript ?? '';
      };

      rec.onerror = (ev: any) => {
        this.escuchando.set(false);
        const code = ev?.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          reject(new Error('Permiso de micrófono denegado'));
        } else if (code === 'no-speech') {
          reject(new Error('No se detectó voz, intenta de nuevo'));
        } else {
          reject(new Error('Error de reconocimiento de voz'));
        }
      };

      rec.onend = () => {
        this.escuchando.set(false);
        resolve(texto.trim());
      };

      try {
        rec.start();
      } catch {
        this.escuchando.set(false);
        reject(new Error('No se pudo iniciar el micrófono'));
      }
    });
  }
}
