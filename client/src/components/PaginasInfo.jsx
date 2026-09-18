import Modal from './Modal';

const PREGUNTAS = [
    ['¿Cómo hago un pedido?',
        'Elegí platos del menú, sumalos al carrito y confirmá. Para pedir necesitás una cuenta de cliente: crearla es gratis y lleva un minuto.'],
    ['¿Puedo pedirle a varios locales a la vez?',
        'Sí. Tu pedido se divide solo: cada local recibe su parte, la prepara y te la envía. En "Mis pedidos" ves el estado de cada una.'],
    ['¿Qué pasa si un local rechaza mi pedido?',
        'Esa parte no se cobra y las unidades vuelven a estar disponibles para otros clientes. Lo que pediste a otros locales sigue su curso.'],
    ['¿Cómo pago?',
        'El pago se coordina con cada local al recibir el pedido, en efectivo o con tarjeta. FoodieByte no guarda datos de tarjetas.'],
    ['¿Cómo sé si un plato es vegano o sin TACC?',
        'Los platos llevan las etiquetas "Vegano" y "Sin TACC" cuando el local lo indica. Ante cualquier duda, preguntale al local desde la ficha del plato.'],
    ['Tengo un local, ¿cómo vendo en FoodieByte?',
        'Creá tu cuenta, abrí el menú de tu usuario y elegí "Quiero vender en FoodieByte". Un administrador revisa la solicitud y, cuando la aprueba, se habilita el panel de tu local.']
];

const PAGINAS = {
    preguntas: {
        titulo: 'Preguntas frecuentes',
        contenido: (
            <div className="texto-legal preguntas-frecuentes">
                {PREGUNTAS.map(([pregunta, respuesta]) => (
                    <details key={pregunta}>
                        <summary>{pregunta}</summary>
                        <p>{respuesta}</p>
                    </details>
                ))}
            </div>
        )
    },
    terminos: {
        titulo: 'Términos y condiciones',
        contenido: (
            <div className="texto-legal">
                <p>
                    FoodieByte es un proyecto académico, desarrollado como trabajo final de carrera en la UCES.
                    Los locales, los platos y los pedidos que se ven en esta demostración son ficticios.
                </p>
                <h3>Cuentas</h3>
                <p>
                    Cada persona es responsable de los datos que carga y de mantener su contraseña en reserva.
                    Una cuenta puede ser desactivada por un administrador; su historial se conserva.
                </p>
                <h3>Pedidos</h3>
                <ul>
                    <li>El precio de cada plato lo fija el local y se toma del sistema en el momento de confirmar.</li>
                    <li>Cada local prepara y envía su parte del pedido. Puede rechazarla si no puede cumplirla; en ese caso no se cobra.</li>
                    <li>Un pedido enviado o rechazado no se puede modificar.</li>
                </ul>
                <h3>Locales</h3>
                <p>
                    Para vender hay que pedir el alta y ser aprobado por un administrador. La plataforma cobra una
                    comisión sobre lo que cada local efectivamente despacha.
                </p>
                <h3>Imágenes</h3>
                <p>Las fotos de los platos de la demostración son de Unsplash y se usan bajo su licencia.</p>
            </div>
        )
    },
    privacidad: {
        titulo: 'Política de privacidad',
        contenido: (
            <div className="texto-legal">
                <h3>Qué datos guardamos</h3>
                <ul>
                    <li>Tu nombre y tu correo electrónico.</li>
                    <li>Tu contraseña, siempre cifrada (con bcrypt): nadie puede leerla, ni siquiera un administrador.</li>
                    <li>Tus pedidos y las consultas que hacés sobre los platos.</li>
                    <li>Si pedís vender, los datos de tu local: nombre, dirección, teléfono y rubro.</li>
                </ul>
                <h3>Para qué los usamos</h3>
                <p>Solo para que la plataforma funcione: identificarte, registrar tus pedidos y mostrarle a cada local lo que le corresponde. No se comparten con terceros.</p>
                <h3>Tu sesión</h3>
                <p>Al ingresar, tu navegador guarda un token que vence a las 24 horas. Al cerrar sesión se borra.</p>
                <h3>Dar de baja tu cuenta</h3>
                <p>Escribinos a soporte@foodiebyte.com. La cuenta se desactiva y deja de poder usarse; los pedidos se conservan porque forman parte de la contabilidad de los locales.</p>
            </div>
        )
    }
};

/** Páginas informativas del pie: se abren en una ventana, sin salir de donde estabas. */
function PaginasInfo({ pagina, alCerrar }) {
    const { titulo, contenido } = PAGINAS[pagina] || PAGINAS.preguntas;
    return (
        <Modal titulo={titulo} tamano="ancho" alCerrar={alCerrar}
            pie={<button type="button" className="boton boton--oscuro" onClick={alCerrar} data-autofocus>Entendido</button>}>
            {contenido}
        </Modal>
    );
}

export default PaginasInfo;
