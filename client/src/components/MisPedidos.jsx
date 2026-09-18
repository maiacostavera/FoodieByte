import { useEffect, useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { formatearFechaHora, formatearMoneda, tiempoRelativo } from '../utils/formato';
import { imagenDelPlato } from '../utils/imagenes';
import EstadoPedido from './EstadoPedido';
import Icono from './Icono';

// Misma regla que el servidor: la parte de un local está Pendiente mientras
// quede algo sin responder, Rechazada si se rechazó todo y Enviada si no.
const estadoDeLasLineas = (lineas) => {
    if (lineas.some(linea => linea.estado === 'Pendiente')) return 'Pendiente';
    if (lineas.every(linea => linea.estado === 'Rechazado')) return 'Rechazado';
    return 'Enviado';
};

function MisPedidos({ alVerMenu }) {
    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelado = false;
        // El servidor identifica al usuario por el token: nunca se manda un id
        // en la URL, que permitiría leer los pedidos de otra persona.
        api.get('/pedidos/mis-pedidos')
            .then(({ data }) => { if (!cancelado) setPedidos(data); })
            .catch((err) => { if (!cancelado) setError(mensajeDeError(err, 'No se pudieron cargar tus pedidos.')); })
            .finally(() => { if (!cancelado) setCargando(false); });
        return () => { cancelado = true; };
    }, []);

    return (
        <div className="contenedor pagina">
            <div className="encabezado-pagina">
                <button type="button" className="boton boton--icono" onClick={alVerMenu} aria-label="Volver al menú">
                    <Icono nombre="flecha-izquierda" />
                </button>
                <div>
                    <h1>Mis pedidos</h1>
                    <p>Cada local confirma su parte: acá ves en qué estado está cada una.</p>
                </div>
            </div>

            {cargando ? (
                <div className="lista-pedidos" aria-hidden="true">
                    {[1, 2, 3].map(n => <div key={n} className="esqueleto esqueleto--pedido" />)}
                </div>
            ) : error ? (
                <p role="alert" className="mensaje mensaje--error"><Icono nombre="alerta" tamano={18} />{error}</p>
            ) : pedidos.length === 0 ? (
                <div className="vacio tarjeta">
                    <span className="vacio__icono"><Icono nombre="recibo" tamano={26} /></span>
                    <p className="vacio__titulo">Todavía no hiciste pedidos</p>
                    <p>Cuando confirmes tu primer pedido, lo vas a poder seguir desde acá.</p>
                    <button type="button" className="boton boton--primario" onClick={alVerMenu}>Ver el menú</button>
                </div>
            ) : (
                <div className="lista-pedidos">
                    {pedidos.map(pedido => <TarjetaPedido key={pedido.id} pedido={pedido} />)}
                </div>
            )}
        </div>
    );
}

function TarjetaPedido({ pedido }) {
    const lineas = pedido.items || [];

    // Las líneas se agrupan por local: cada uno despacha o rechaza su parte.
    const grupos = [];
    for (const linea of lineas) {
        const clave = linea.vendedorId ?? 'sin-local';
        let grupo = grupos.find(g => g.clave === clave);
        if (!grupo) {
            grupo = { clave, nombre: linea.vendedor?.nombre_local || linea.vendedor?.nombre || 'Local', lineas: [] };
            grupos.push(grupo);
        }
        grupo.lineas.push(linea);
    }

    const huboRechazos = lineas.some(linea => linea.estado === 'Rechazado');
    // Lo rechazado no se cobra: el total que se muestra es el de lo que sí se envía.
    const total = lineas
        .filter(linea => linea.estado !== 'Rechazado')
        .reduce((acc, linea) => acc + Number(linea.subtotal), 0);

    return (
        <article className="pedido tarjeta">
            <header className="pedido__cabecera">
                <div>
                    <p className="pedido__numero">Pedido #{pedido.id}</p>
                    <p className="pedido__fecha">{formatearFechaHora(pedido.createdAt)} · {tiempoRelativo(pedido.createdAt)}</p>
                </div>
                <EstadoPedido estado={pedido.estado} />
            </header>

            {grupos.map(grupo => (
                <div key={grupo.clave}>
                    <div className="pedido__local">
                        <span className="pedido__local-nombre"><Icono nombre="tienda" tamano={16} />{grupo.nombre}</span>
                        {grupos.length > 1 && <EstadoPedido estado={estadoDeLasLineas(grupo.lineas)} chico />}
                    </div>
                    {grupo.lineas.map(linea => (
                        <div key={linea.id} className={`pedido__linea${linea.estado === 'Rechazado' ? ' pedido__linea--rechazada' : ''}`}>
                            <img src={imagenDelPlato(linea.plato?.categoria, linea.plato?.imagenUrl)} alt="" loading="lazy" />
                            <span>{linea.cantidad} × {linea.nombrePlato}</span>
                            <span className="pedido__subtotal">{formatearMoneda(linea.subtotal)}</span>
                        </div>
                    ))}
                </div>
            ))}

            <footer className="pedido__pie">
                <span className="texto-secundario">{huboRechazos ? 'Total, sin lo rechazado' : 'Total'}</span>
                <strong className="pedido__total">{formatearMoneda(total)}</strong>
            </footer>
        </article>
    );
}

export default MisPedidos;
