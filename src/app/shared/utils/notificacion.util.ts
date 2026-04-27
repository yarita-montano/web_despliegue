/**
 * Función de utilidad para mostrar notificaciones al usuario
 * @param mensaje - El mensaje a mostrar
 * @param tipo - El tipo de notificación: 'success', 'error', 'warning', 'info'
 */
export function notificacion(
  mensaje: string,
  tipo: 'success' | 'error' | 'warning' | 'info' = 'info'
): void {
  // Por ahora usamos alert. En el futuro se puede integrar con un sistema de toast/snack
  const prefijos = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const mensajeCompleto = `${prefijos[tipo]} ${mensaje}`;

  // Mostrar en consola también para debugging
  console.log(`[${tipo.toUpperCase()}] ${mensaje}`);

  // En producción, aquí se integraría con un sistema de notificaciones visual
  // como Toastr, Snackbar, etc.
}
