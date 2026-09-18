import { useCallback, useEffect, useState } from 'react';
import api, { mensajeDeError } from '../../api/client';
import { useFoodie } from '../../state/FoodieContext';
import Icono from '../Icono';
import ResumenVentas from './ResumenVentas';
import Comandas from './Comandas';
import Inventario from './Inventario';
import FormularioPlato from './FormularioPlato';
import GestionUsuarios from './GestionUsuarios';
import Liquidaciones from './Liquidaciones';
import PedidosPlataforma from './PedidosPlataforma';

const NOMBRE_DEL_ROL = { foodie: 'cliente', vendedor: 'local', admin: 'administrador' };

/**
 * Panel de gestión. El local ve su resumen, sus comandas y su menú; el
 * administrador, la plataforma completa. El servidor ya devuelve solo lo que
 * le corresponde a cada rol: acá no se filtra nada por seguridad.
 */
function PanelGestion({ categorias, alCambiarCatalogo }) {
    const { usuario, mostrarAviso, confirmar } = useFoodie();
    const esAdmin = usuario.rol === 'admin';

    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [pestana, setPestana] = useState('resumen');
    const [actualizando, setActualizando] = useState(false);
    // undefined: formulario cerrado · null: plato nuevo · un plato: edición
    const [platoEnEdicion, setPlatoEnEdicion] = useState(undefined);

    const pedirDatos = useCallback(async () => {
        const rutas = esAdmin
            ? ['/admin/platos', '/admin/pedidos', '/admin/estadisticas', '/admin/usuarios', '/admin/comisiones-vendedores']
            : ['/platos/mis-platos', '/pedidos/comandas', '/pedidos/estadisticas'];
        const [platos, comandas, estadisticas, usuarios, comisiones] = await Promise.all(rutas.map(ruta => api.get(ruta)));
        return {
            platos: platos.data,
            comandas: comandas.data,
            estadisticas: estadisticas.data,
            usuarios: usuarios?.data || [],
            comisiones: comisiones?.data || []
        };
    }, [esAdmin]);

    const mostrarFalla = (err) => setError(mensajeDeError(err, 'No se pudieron cargar los datos del panel.'));

    // Carga inicial. Si el panel se cierra antes de que lleguen los datos, se descartan.
    useEffect(() => {
        let cancelado = false;
        pedirDatos()
            .then((nuevos) => { if (!cancelado) { setDatos(nuevos); setError(''); } })
            .catch((err) => { if (!cancelado) setError(mensajeDeError(err, 'No se pudieron cargar los datos del panel.')); });
        return () => { cancelado = true; };
    }, [pedirDatos]);

    const cargarDatos = async () => {
        try {
            setDatos(await pedirDatos());
            setError('');
        } catch (err) {
            mostrarFalla(err);
        }
    };

    const actualizar = async () => {
        setActualizando(true);
        await cargarDatos();
        setActualizando(false);
    };

    // Después de cada acción se vuelven a pedir los datos: en un pedido con
    // varios locales, el estado general lo recalcula el servidor.
    const ejecutar = async (accion, mensajeDeFalla, { cambiaCatalogo = false } = {}) => {
        try {
            const mensaje = await accion();
            await cargarDatos();
            if (cambiaCatalogo) alCambiarCatalogo();
            mostrarAviso(mensaje, 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, mensajeDeFalla), 'error');
        }
    };

    const cambiarEstadoPedido = async (pedido, nuevoEstado) => {
        const rechazar = nuevoEstado === 'Rechazado';
        const confirmado = await confirmar(rechazar
            ? {
                titulo: `¿Rechazar el pedido #${pedido.id}?`,
                mensaje: 'Las unidades vuelven al stock y el cliente ve tu parte como rechazada. No se puede deshacer.',
                textoConfirmar: 'Rechazar pedido',
                peligro: true
            }
            : {
                titulo: `¿Marcar el pedido #${pedido.id} como enviado?`,
                mensaje: `Confirmás que el pedido de ${pedido.usuario?.nombre || 'el cliente'} ya salió. No se puede deshacer.`,
                textoConfirmar: 'Marcar enviado'
            });
        if (!confirmado) return;

        await ejecutar(async () => {
            await api.put(`/pedidos/${pedido.id}/estado`, { nuevoEstado });
            return rechazar
                ? `Pedido #${pedido.id} rechazado: las unidades volvieron al stock.`
                : `Pedido #${pedido.id} marcado como enviado.`;
        }, 'No se pudo actualizar el pedido.', { cambiaCatalogo: rechazar });
    };

    const cambiarRol = async (cuenta, nuevoRol) => {
        const aprobando = cuenta.solicitud_vendedor && nuevoRol === 'vendedor';
        const confirmado = await confirmar(aprobando
            ? {
                titulo: `¿Aprobar ${cuenta.nombre_local || `el local de ${cuenta.nombre}`}?`,
                mensaje: `${cuenta.nombre} va a poder publicar platos y recibir pedidos. Tiene que volver a iniciar sesión para ver el panel de su local.`,
                textoConfirmar: 'Aprobar local'
            }
            : {
                titulo: `¿Cambiar el rol de ${cuenta.nombre}?`,
                mensaje: `Pasa a ser ${NOMBRE_DEL_ROL[nuevoRol]} y tiene que volver a iniciar sesión.` +
                    (cuenta.rol === 'vendedor' ? ' Sus platos dejan de mostrarse en el catálogo.' : ''),
                textoConfirmar: 'Cambiar rol'
            });
        if (!confirmado) return;

        await ejecutar(async () => {
            await api.put(`/admin/usuarios/${cuenta.id}/rol`, { nuevoRol });
            return aprobando ? `${cuenta.nombre_local || cuenta.nombre} ya puede vender.` : 'Rol actualizado.';
        }, 'No se pudo cambiar el rol.', { cambiaCatalogo: true });
    };

    const rechazarSolicitud = async (cuenta) => {
        const confirmado = await confirmar({
            titulo: `¿Rechazar la solicitud de ${cuenta.nombre}?`,
            mensaje: 'La cuenta sigue activa como cliente y puede volver a pedir el alta más adelante.',
            textoConfirmar: 'Rechazar solicitud',
            peligro: true
        });
        if (!confirmado) return;

        await ejecutar(async () => {
            await api.put(`/admin/usuarios/${cuenta.id}/rechazar-vendedor`);
            return 'Solicitud rechazada.';
        }, 'No se pudo rechazar la solicitud.');
    };

    // Las cuentas no se borran: desactivarlas conserva sus pedidos y liquidaciones.
    const cambiarActivacion = async (cuenta, activar) => {
        const confirmado = await confirmar(activar
            ? {
                titulo: `¿Reactivar la cuenta de ${cuenta.nombre}?`,
                mensaje: 'Va a poder iniciar sesión de nuevo y, si es un local, sus platos vuelven al catálogo.',
                textoConfirmar: 'Reactivar'
            }
            : {
                titulo: `¿Desactivar la cuenta de ${cuenta.nombre}?`,
                mensaje: 'No va a poder iniciar sesión y, si es un local, sus platos salen del catálogo. Sus pedidos y ventas se conservan.',
                textoConfirmar: 'Desactivar',
                peligro: true
            });
        if (!confirmado) return;

        await ejecutar(async () => {
            await api.put(`/admin/usuarios/${cuenta.id}/${activar ? 'reactivar' : 'desactivar'}`);
            return activar ? 'Cuenta reactivada.' : 'Cuenta desactivada.';
        }, 'No se pudo cambiar el estado de la cuenta.', { cambiaCatalogo: true });
    };

    const eliminarPlato = async (plato) => {
        const confirmado = await confirmar({
            titulo: `¿Eliminar “${plato.nombre}”?`,
            mensaje: 'Sale del catálogo y se borra su foto. Los pedidos que ya lo incluían se conservan.',
            textoConfirmar: 'Eliminar plato',
            peligro: true
        });
        if (!confirmado) return;

        await ejecutar(async () => {
            await api.delete(esAdmin ? `/admin/platos/${plato.id}` : `/platos/${plato.id}`);
            return 'Plato eliminado.';
        }, 'No se pudo eliminar el plato.', { cambiaCatalogo: true });
    };

    const alGuardarPlato = async () => {
        setPlatoEnEdicion(undefined);
        await cargarDatos();
        alCambiarCatalogo();
    };

    const pendientes = datos ? datos.comandas.filter(p => (p.estadoVendedor || p.estado) === 'Pendiente').length : 0;
    const solicitudes = datos ? datos.usuarios.filter(u => u.activo && u.solicitud_vendedor && u.rol === 'foodie').length : 0;

    const pestanas = esAdmin
        ? [
            { clave: 'resumen', etiqueta: 'Resumen', icono: 'grafico' },
            { clave: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios', contador: solicitudes },
            { clave: 'liquidaciones', etiqueta: 'Liquidaciones', icono: 'billete' },
            { clave: 'menu', etiqueta: 'Platos', icono: 'plato' },
            { clave: 'pedidos', etiqueta: 'Pedidos', icono: 'recibo' }
        ]
        : [
            { clave: 'resumen', etiqueta: 'Resumen', icono: 'grafico' },
            { clave: 'comandas', etiqueta: 'Comandas', icono: 'recibo', contador: pendientes },
            { clave: 'menu', etiqueta: 'Mi menú', icono: 'plato' }
        ];

    return (
        <div className="contenedor panel">
            <div className="panel__cabecera">
                <div>
                    <h1 className="panel__saludo">Hola, {usuario.nombre}</h1>
                    <p className="panel__rol">
                        <Icono nombre={esAdmin ? 'escudo' : 'tienda'} tamano={18} />
                        {esAdmin ? 'Administración de la plataforma' : `${usuario.nombre_local || 'Tu local'} · Panel del local`}
                    </p>
                </div>
                <button type="button" className="boton" onClick={actualizar} disabled={actualizando}>
                    <Icono nombre="refrescar" tamano={18} />{actualizando ? 'Actualizando…' : 'Actualizar'}
                </button>
            </div>

            <div className="pestanas panel__pestanas" role="tablist" aria-label="Secciones del panel">
                {pestanas.map(({ clave, etiqueta, icono, contador }) => (
                    <button key={clave} type="button" role="tab" id={`pestana-${clave}`} className="pestana"
                        aria-selected={pestana === clave} aria-controls="contenido-panel" onClick={() => setPestana(clave)}>
                        <Icono nombre={icono} tamano={17} />{etiqueta}
                        {contador > 0 && <span className="contador">{contador}</span>}
                    </button>
                ))}
            </div>

            {error && <p role="alert" className="mensaje mensaje--error"><Icono nombre="alerta" tamano={18} />{error}</p>}

            {datos ? (
                <div role="tabpanel" id="contenido-panel" aria-labelledby={`pestana-${pestana}`}>
                    {pestana === 'resumen' && <ResumenVentas esAdmin={esAdmin} estadisticas={datos.estadisticas} alIrA={setPestana} />}
                    {pestana === 'comandas' && <Comandas comandas={datos.comandas} alCambiarEstado={cambiarEstadoPedido} />}
                    {pestana === 'menu' && (
                        <Inventario platos={datos.platos} esAdmin={esAdmin} alAgregar={() => setPlatoEnEdicion(null)}
                            alEditar={setPlatoEnEdicion} alEliminar={eliminarPlato} />
                    )}
                    {pestana === 'usuarios' && (
                        <GestionUsuarios usuarios={datos.usuarios} idPropio={usuario.id} alCambiarRol={cambiarRol}
                            alRechazarSolicitud={rechazarSolicitud} alCambiarActivacion={cambiarActivacion} />
                    )}
                    {pestana === 'liquidaciones' && (
                        <Liquidaciones comisiones={datos.comisiones} porcentaje={datos.estadisticas.porcentajeComision} />
                    )}
                    {pestana === 'pedidos' && <PedidosPlataforma pedidos={datos.comandas} />}
                </div>
            ) : !error && (
                <div className="grilla-kpi" aria-hidden="true">
                    {[1, 2, 3, 4].map(n => <div key={n} className="esqueleto esqueleto--kpi" />)}
                </div>
            )}

            {platoEnEdicion !== undefined && (
                <FormularioPlato plato={platoEnEdicion} categorias={categorias}
                    alCerrar={() => setPlatoEnEdicion(undefined)} alGuardar={alGuardarPlato} />
            )}
        </div>
    );
}

export default PanelGestion;
