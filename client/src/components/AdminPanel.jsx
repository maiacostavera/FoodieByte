import { useState, useEffect, useCallback } from 'react';
import api, { mensajeDeError } from '../api/client';
import { imagenDelPlato } from '../utils/imagenes';
import { useFoodie } from '../state/FoodieContext';
import { estilos, formatearMoneda } from './admin/estilos';
import FormularioPlato from './admin/FormularioPlato';
import TablaComandas from './admin/TablaComandas';
import Liquidaciones from './admin/Liquidaciones';
import GestionUsuarios from './admin/GestionUsuarios';

function AdminPanel({ rol, categorias, onRefreshPlatos, onDatosActualizados }) {
    const { mostrarAviso } = useFoodie();
    const esAdmin = rol === 'admin';

    const [platos, setPlatos] = useState([]);
    const [comandas, setComandas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [comisiones, setComisiones] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [vistaActiva, setVistaActiva] = useState('inventario');
    const [platoEnEdicion, setPlatoEnEdicion] = useState(null);
    const [modalAbierto, setModalAbierto] = useState(false);

    // El servidor ya devuelve solo lo que corresponde al rol: el vendedor
    // recibe únicamente su inventario y sus comandas, sin filtrar en el navegador.
    const cargarDatos = useCallback(async () => {
        setCargando(true);
        try {
            const peticiones = [
                api.get(esAdmin ? '/admin/platos' : '/platos/mis-platos'),
                api.get(esAdmin ? '/admin/pedidos' : '/pedidos/comandas')
            ];

            if (esAdmin) {
                peticiones.push(
                    api.get('/admin/usuarios'),
                    api.get('/admin/estadisticas'),
                    api.get('/admin/comisiones-vendedores')
                );
            }

            const respuestas = await Promise.all(peticiones);
            setPlatos(respuestas[0].data);
            setComandas(respuestas[1].data);

            if (esAdmin) {
                setUsuarios(respuestas[2].data);
                setKpis(respuestas[3].data);
                setComisiones(respuestas[4].data);
            }
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudieron cargar los datos del panel.'), 'error');
        } finally {
            setCargando(false);
        }
    }, [esAdmin, mostrarAviso]);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    const cambiarEstadoPedido = async (id, nuevoEstado) => {
        try {
            await api.put(`/pedidos/${id}/estado`, { nuevoEstado });
            // Se recargan las comandas: en un pedido con varios locales, el
            // estado general lo recalcula el servidor.
            await cargarDatos();
            // El cambio de estado altera la facturación: hay que refrescar
            // también el resumen de ventas que vive fuera de este componente.
            if (onDatosActualizados) onDatosActualizados();
            mostrarAviso(`Pedido #${id} marcado como ${nuevoEstado}.`, 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo actualizar el estado.'), 'error');
        }
    };

    const cambiarRolUsuario = async (id, nuevoRol) => {
        try {
            await api.put(`/admin/usuarios/${id}/rol`, { nuevoRol });
            await cargarDatos();
            mostrarAviso('Rol actualizado.', 'exito');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo cambiar el rol.'), 'error');
        }
    };

    const rechazarSolicitud = async (id) => {
        if (!window.confirm('¿Confirmás el rechazo de esta solicitud de vendedor?')) return;
        try {
            await api.put(`/admin/usuarios/${id}/rechazar-vendedor`);
            await cargarDatos();
            mostrarAviso('Solicitud rechazada.', 'info');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo rechazar la solicitud.'), 'error');
        }
    };

    const eliminarUsuario = async (id) => {
        if (!window.confirm('¿Confirmás la eliminación permanente de este usuario y de todos sus datos?')) return;
        try {
            await api.delete(`/admin/usuarios/${id}`);
            await cargarDatos();
            mostrarAviso('Usuario eliminado.', 'info');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo eliminar el usuario.'), 'error');
        }
    };

    const eliminarPlato = async (id) => {
        if (!window.confirm('¿Confirmás que querés eliminar este plato del menú de forma permanente?')) return;
        try {
            await api.delete(esAdmin ? `/admin/platos/${id}` : `/platos/${id}`);
            setPlatos(prev => prev.filter(p => p.id !== id));
            if (onRefreshPlatos) onRefreshPlatos();
            if (onDatosActualizados) onDatosActualizados();
            mostrarAviso('Plato eliminado.', 'info');
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo eliminar el plato.'), 'error');
        }
    };

    const abrirAlta = () => { setPlatoEnEdicion(null); setModalAbierto(true); };
    const abrirEdicion = (plato) => { setPlatoEnEdicion(plato); setModalAbierto(true); };

    const alGuardarPlato = async () => {
        setModalAbierto(false);
        await cargarDatos();
        if (onRefreshPlatos) onRefreshPlatos();
        if (onDatosActualizados) onDatosActualizados();
    };

    const estadoDe = (pedido) => pedido.estadoVendedor || pedido.estado;
    const pendientes = comandas.filter(p => estadoDe(p) === 'Pendiente');
    const enviados = comandas.filter(p => estadoDe(p) === 'Enviado');
    const rechazados = comandas.filter(p => estadoDe(p) === 'Rechazado');

    const tabs = [
        { key: 'inventario', label: 'Gestión de Menú' },
        { key: 'dashboard', label: esAdmin ? 'Liquidaciones' : 'Comandas y Ventas' }
    ];
    if (esAdmin) tabs.push({ key: 'usuarios', label: 'Gestión de Usuarios' });

    if (cargando) {
        return <p style={{ textAlign: 'center', padding: '60px 0', color: '#757575', fontFamily: "'Poppins', sans-serif" }}>Cargando el panel de gestión…</p>;
    }

    return (
        <div style={estilos.contenedorPrincipal}>
            <div style={estilos.cabecera}>
                <h2 style={estilos.tituloPrincipal}>Panel de Gestión</h2>
                {esAdmin && <span style={estilos.badgeAdmin}>ADMINISTRADOR</span>}
            </div>

            {esAdmin && kpis && (
                <div style={estilos.gridKPIs}>
                    <KPI titulo="Usuarios Totales" valor={kpis.usuariosTotales} />
                    <KPI titulo="Platos Publicados" valor={kpis.platosPublicados} />
                    <KPI titulo="Locales en la Plataforma" valor={kpis.localesActivos} />
                    <KPI titulo="Pedidos Enviados" valor={`${kpis.pedidosEnviados} / ${kpis.pedidosTotales}`} />
                    <KPI titulo="Volumen de Ventas" valor={formatearMoneda(kpis.volumenVentas)} />
                    <KPI
                        titulo={`Ganancias (Comisión ${(kpis.porcentajeComision * 100).toFixed(0)}%)`}
                        valor={formatearMoneda(kpis.gananciasPlataforma)}
                        color="#2e7d32"
                    />
                </div>
            )}

            <div style={estilos.tabsContainer}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setVistaActiva(tab.key)}
                        style={vistaActiva === tab.key ? estilos.tabActivo : estilos.tabInactivo}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {vistaActiva === 'inventario' && (
                <div style={estilos.panelBlanco}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                        <h3 style={estilos.tituloSeccionInline}>Inventario y Menú Activo</h3>
                        <button onClick={abrirAlta} style={estilos.botonPrimario}>Agregar Nuevo Plato</button>
                    </div>

                    {platos.length === 0 ? (
                        <p style={estilos.textoVacio}>Todavía no publicaste ningún plato. Usá «Agregar Nuevo Plato» para empezar.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={estilos.tabla}>
                                <thead>
                                    <tr style={estilos.filaHeader}>
                                        <th style={estilos.celdaHeader}>Miniatura</th>
                                        <th style={estilos.celdaHeader}>Nombre</th>
                                        <th style={estilos.celdaHeader}>Categoría</th>
                                        <th style={estilos.celdaHeader}>Precio</th>
                                        <th style={estilos.celdaHeader}>Stock</th>
                                        {esAdmin && <th style={estilos.celdaHeader}>Local</th>}
                                        <th style={estilos.celdaHeader}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {platos.map(p => (
                                        <tr key={p.id} style={estilos.filaBody}>
                                            <td style={estilos.celdaBody}>
                                                <div style={estilos.miniaturaWrapper}>
                                                    <img src={imagenDelPlato(p.categoria, p.imagenUrl)} alt="" style={estilos.miniatura} />
                                                </div>
                                            </td>
                                            <td style={{ ...estilos.celdaBody, fontWeight: '500', color: '#212121' }}>{p.nombre}</td>
                                            <td style={estilos.celdaBody}>{p.categoria}</td>
                                            <td style={{ ...estilos.celdaBody, color: '#d32f2f', fontWeight: '600' }}>{formatearMoneda(p.precio)}</td>
                                            <td style={estilos.celdaBody}>
                                                <span style={p.stock < 5 ? estilos.stockAlerta : undefined}>{p.stock} un.</span>
                                            </td>
                                            {esAdmin && (
                                                <td style={estilos.celdaBody}>{p.vendedor?.nombre_local || p.vendedor?.nombre || '-'}</td>
                                            )}
                                            <td style={estilos.celdaBody}>
                                                <button onClick={() => abrirEdicion(p)} style={estilos.botonEditar}>Editar</button>
                                                <button onClick={() => eliminarPlato(p.id)} style={estilos.botonEliminar}>Eliminar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {vistaActiva === 'dashboard' && (
                esAdmin ? (
                    <Liquidaciones comisiones={comisiones} porcentaje={kpis?.porcentajeComision} />
                ) : (
                    <>
                        <div style={estilos.panelBlanco}>
                            <h3 style={estilos.tituloSeccion}>Control de Comandas Recibidas</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <ColumnaComandas titulo="Comandas Pendientes" color="#f57c00" pedidos={pendientes} rol={rol} alCambiarEstado={cambiarEstadoPedido} />
                                <ColumnaComandas titulo="Historial: Enviados" color="#388e3c" pedidos={enviados} rol={rol} alCambiarEstado={cambiarEstadoPedido} />
                                <ColumnaComandas titulo="Historial: Rechazados" color="#757575" pedidos={rechazados} rol={rol} alCambiarEstado={cambiarEstadoPedido} />
                            </div>
                        </div>
                    </>
                )
            )}

            {vistaActiva === 'usuarios' && esAdmin && (
                <GestionUsuarios
                    usuarios={usuarios}
                    alCambiarRol={cambiarRolUsuario}
                    alRechazarSolicitud={rechazarSolicitud}
                    alEliminar={eliminarUsuario}
                />
            )}

            {modalAbierto && (
                <FormularioPlato
                    plato={platoEnEdicion}
                    categorias={categorias}
                    alCerrar={() => setModalAbierto(false)}
                    alGuardar={alGuardarPlato}
                    mostrarAviso={mostrarAviso}
                />
            )}
        </div>
    );
}

const KPI = ({ titulo, valor, color }) => (
    <div style={estilos.cardKPI}>
        <span style={estilos.labelKPI}>{titulo}</span>
        <strong style={{ ...estilos.valorKPI, ...(color ? { color } : {}) }}>{valor}</strong>
    </div>
);

const ColumnaComandas = ({ titulo, color, pedidos, rol, alCambiarEstado }) => (
    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: '16px' }}>
        <h4 style={{ margin: '0 0 16px 0', color, fontSize: '1.1rem', fontWeight: '600' }}>
            {titulo} <span style={{ color: '#9e9e9e', fontWeight: '500' }}>({pedidos.length})</span>
        </h4>
        <TablaComandas pedidos={pedidos} rol={rol} alCambiarEstado={alCambiarEstado} />
    </div>
);

export default AdminPanel;
