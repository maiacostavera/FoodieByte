// Formato único para los importes. Antes la función estaba copiada en cinco
// archivos con opciones distintas, y la ficha del producto mostraba $1.200
// mientras el resto de la aplicación mostraba $1.200,00.
export const formatearMoneda = (valor) =>
    `$${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
