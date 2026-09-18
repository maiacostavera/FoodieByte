const CLASES = {
    Pendiente: 'estado--pendiente',
    Enviado: 'estado--enviado',
    Rechazado: 'estado--rechazado'
};

/** Estado de un pedido o de una línea: punto de color y texto, nunca solo color. */
function EstadoPedido({ estado, chico = false }) {
    return (
        <span className={`estado ${CLASES[estado] || ''}${chico ? ' estado--chico' : ''}`}>{estado}</span>
    );
}

export default EstadoPedido;
