import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminPanel({ token, vendedorId, rol, onRefreshPlatos }) {
    const [misPlatos, setMisPlatos] = useState([]);
    const [misPedidos, setMisPedidos] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [estadisticasAdmin, setEstadisticasAdmin] = useState(null);
    const [comisionesVendedores, setComisionesVendedores] = useState([]);

    const [vistaActiva, setVistaActiva] = useState('inventario');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [editando, setEditando] = useState(null);
    const [creandoNuevo, setCreandoNuevo] = useState(false);
    const [archivoImagen, setArchivoImagen] = useState(null);
    const [formDataLocal, setFormDataLocal] = useState({
        nombre: '', descripcion: '', precio: 0, stock: 1,
        categoria: 'Pizzas', tiempo_prep: '20-30 min',
        es_vegano: false, es_sintacc: false, imagenUrl: ''
    });

    useEffect(() => {
        fetchPlatos();
        fetchPedidos();
        if (rol === 'admin') {
            fetchUsuarios();
            fetchEstadisticasAdmin();
            fetchComisionesVendedores();
        }
    }, [rol]);

    const fetchPlatos = async () => {
        try {
            const url = rol === 'admin'
                ? 'http://localhost:3000/api/admin/platos'
                : 'http://localhost:3000/api/platos';
            const config = rol === 'admin'
                ? { headers: { 'authorization': `Bearer ${token}` } }
                : {};
            const res = await axios.get(url, config);
            setMisPlatos(res.data);
        } catch (err) {
            console.error("Error cargando platos", err);
        }
    };

    const fetchPedidos = async () => {
        try {
            const url = rol === 'admin'
                ? 'http://localhost:3000/api/admin/pedidos'
                : 'http://localhost:3000/api/pedidos/todos';
            const res = await axios.get(url, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            setMisPedidos(res.data);
        } catch (err) {
            console.error("Error cargando pedidos", err);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/admin/usuarios', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            setUsuarios(res.data);
        } catch (err) {
            console.error("Error cargando usuarios", err);
        }
    };

    const fetchEstadisticasAdmin = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/admin/estadisticas', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            console.log("Respuesta de /api/admin/estadisticas:", res.data);
            setEstadisticasAdmin(res.data);
        } catch (err) {
            console.error("Error cargando estadísticas admin", err);
        }
    };

    const fetchComisionesVendedores = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/admin/comisiones-vendedores', {
                headers: { 'authorization': `Bearer ${token}` }
            });
            setComisionesVendedores(res.data);
        } catch (err) {
            console.error("Error cargando comisiones:", err);
        }
    };

    const cambiarEstadoPedido = async (id, nuevoEstado) => {
        try {
            await axios.put(`http://localhost:3000/api/pedidos/${id}/estado`, { nuevoEstado }, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            setMisPedidos(prev => prev.map(pedido => pedido.id === id ? { ...pedido, estado: nuevoEstado } : pedido));
        } catch (err) {
            alert("Error al actualizar el estado del pedido.");
        }
    };

    const cambiarRolUsuario = async (id, nuevoRol) => {
        try {
            await axios.put(`http://localhost:3000/api/admin/usuarios/${id}/rol`, { nuevoRol }, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            fetchUsuarios();
            fetchEstadisticasAdmin();
        } catch (err) {
            alert(err.response?.data?.mensaje || "Error al cambiar el rol.");
        }
    };

    const rechazarSolicitud = async (id) => {
        if (!window.confirm("¿Confirma el rechazo de esta solicitud de vendedor?")) return;
        try {
            await axios.put(`http://localhost:3000/api/admin/usuarios/${id}/rechazar-vendedor`, {}, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            fetchUsuarios();
            fetchEstadisticasAdmin();
        } catch (err) {
            alert(err.response?.data?.mensaje || "Error al rechazar solicitud.");
        }
    };

    const eliminarUsuario = async (id) => {
        if (!window.confirm("¿Confirma la eliminación permanente de este usuario?")) return;
        try {
            await axios.delete(`http://localhost:3000/api/admin/usuarios/${id}`, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            fetchUsuarios();
            fetchEstadisticasAdmin();
        } catch (err) {
            alert(err.response?.data?.mensaje || "Error al eliminar usuario.");
        }
    };

    const eliminarPlato = async (id) => {
        if (!window.confirm("¿Confirma que desea eliminar este plato del menú de forma permanente?")) return;
        try {
            const url = rol === 'admin'
                ? `http://localhost:3000/api/admin/platos/${id}`
                : `http://localhost:3000/api/platos/${id}`;
            await axios.delete(url, {
                headers: { 'authorization': `Bearer ${token}` }
            });
            setMisPlatos(prev => prev.filter(p => p.id !== id));
            if (onRefreshPlatos) onRefreshPlatos();
        } catch (err) {
            alert(err.response?.data?.mensaje || "Error al eliminar el plato.");
        }
    };

    const abrirAlta = () => {
        setCreandoNuevo(true);
        setEditando(null);
        setArchivoImagen(null);
        setFormDataLocal({ nombre: '', descripcion: '', precio: 0, stock: 1, categoria: 'Pizzas', tiempo_prep: '20-30 min', es_vegano: false, es_sintacc: false, imagenUrl: '' });
        setModalAbierto(true);
    };

    const abrirEdicion = (plato) => {
        setEditando(plato);
        setCreandoNuevo(false);
        setArchivoImagen(null);
        setFormDataLocal({ ...plato });
        setModalAbierto(true);
    };

    const manejarSubmit = async (e) => {
        e.preventDefault();

        if (!formDataLocal.nombre.trim()) return alert("El nombre es obligatorio.");
        if (formDataLocal.precio <= 0) return alert("El precio debe ser mayor a 0.");
        if (formDataLocal.stock < 1) return alert("El stock debe ser mayor a 0.");

        const fd = new FormData();
        fd.append('nombre', formDataLocal.nombre.trim());
        fd.append('descripcion', formDataLocal.descripcion);
        fd.append('precio', formDataLocal.precio);
        fd.append('categoria', formDataLocal.categoria);
        fd.append('stock', formDataLocal.stock);
        fd.append('tiempo_prep', formDataLocal.tiempo_prep);
        fd.append('es_vegano', formDataLocal.es_vegano);
        fd.append('es_sintacc', formDataLocal.es_sintacc);
        fd.append('vendedorId', vendedorId);

        if (archivoImagen) {
            fd.append('imagen', archivoImagen);
        }

        try {
            if (creandoNuevo) {
                await axios.post('http://localhost:3000/api/platos', fd, {
                    headers: { 'authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.put(`http://localhost:3000/api/platos/${editando.id}`, fd, {
                    headers: { 'authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            }
            setModalAbierto(false);
            fetchPlatos();
            if (onRefreshPlatos) onRefreshPlatos();
        } catch (err) {
            alert(err.response?.data?.mensaje || "Error interno al procesar la solicitud.");
        }
    };

    const facturacionTotal = misPedidos.reduce((acc, p) => acc + parseFloat(p.total), 0);
    const volumenVentas = misPedidos.length;

    // Filtro estricto de multitenencia: El vendedor solo ve sus platos, el admin ve todo
    const misPlatosFiltrados = rol === 'admin' ? misPlatos : misPlatos.filter(plato => String(plato.vendedorId) === String(vendedorId) || String(plato.usuarioId) === String(vendedorId));

    const pendientes = misPedidos.filter(p => p.estado === 'Pendiente');
    const enviados = misPedidos.filter(p => p.estado === 'Enviado');
    const rechazados = misPedidos.filter(p => p.estado === 'Rechazado');

    const renderTablaPedidos = (listaPedidos) => (
        <div style={{ overflowX: 'auto' }}>
            <table style={estilos.tabla}>
                <thead>
                    <tr style={estilos.filaHeader}>
                        <th style={estilos.celdaHeader}>ID Pedido</th>
                        {rol === 'admin' && <th style={estilos.celdaHeader}>Cliente</th>}
                        <th style={estilos.celdaHeader}>Fecha</th>
                        <th style={estilos.celdaHeader}>Productos</th>
                        <th style={estilos.celdaHeader}>Monto</th>
                        <th style={estilos.celdaHeader}>Estado</th>
                        <th style={estilos.celdaHeader}>Operación</th>
                    </tr>
                </thead>
                <tbody>
                    {listaPedidos.map(pedido => {
                        let productos = [];
                        try { productos = JSON.parse(pedido.productos); } catch (e) {}
                        return (
                            <tr key={pedido.id} style={estilos.filaBody}>
                                <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>#{pedido.id}</td>
                                {rol === 'admin' && (
                                    <td style={estilos.celdaBody}>{pedido.usuario?.nombre || `ID: ${pedido.usuarioId}`}</td>
                                )}
                                <td style={estilos.celdaBody}>{new Date(pedido.createdAt).toLocaleDateString('es-AR')}</td>
                                <td style={{ ...estilos.celdaBody, maxWidth: '200px', fontSize: '0.85rem' }}>
                                    {productos.length > 0
                                        ? productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')
                                        : '-'
                                    }
                                </td>
                                <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>${pedido.total}</td>
                                <td style={estilos.celdaBody}>
                                    <span style={obtenerEstiloBadge(pedido.estado)}>{pedido.estado}</span>
                                </td>
                                <td style={estilos.celdaBody}>
                                    {rol === 'vendedor' ? (
                                        <select
                                            value={pedido.estado}
                                            onChange={(e) => cambiarEstadoPedido(pedido.id, e.target.value)}
                                            style={estilos.selectPequeno}
                                        >
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="Enviado">Enviado</option>
                                            <option value="Rechazado">Rechazado</option>
                                        </select>
                                    ) : (
                                        <span style={{ fontWeight: '600', color: '#757575', fontSize: '0.85rem', backgroundColor: '#f5f5f5', padding: '6px 12px', borderRadius: '4px', display: 'inline-block' }}>
                                            {pedido.estado}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const tabs = [
        { key: 'inventario', label: 'Gestión de Menú' },
        { key: 'dashboard', label: 'Dashboard de Ventas' }
    ];
    if (rol === 'admin') {
        tabs.push({ key: 'usuarios', label: 'Gestión de Usuarios' });
    }

    console.log("Datos recibidos en estadísticas:", estadisticasAdmin);

    return (
        <div style={estilos.contenedorPrincipal}>
            <div style={estilos.cabecera}>
                <h2 style={estilos.tituloPrincipal}>Panel de Gestión</h2>
                {rol === 'admin' && <span style={estilos.badgeAdmin}>ADMINISTRADOR</span>}
            </div>
            {/* ESTADÍSTICAS RÁPIDAS ADMIN */}
            {rol === 'admin' && estadisticasAdmin && (
                <div style={estilos.gridKPIs}>
                    <div style={estilos.cardKPI}>
                        <span style={estilos.labelKPI}>Usuarios Totales</span>
                        <strong style={estilos.valorKPI}>{estadisticasAdmin?.usuariosTotales || 0}</strong>
                    </div>
                    <div style={estilos.cardKPI}>
                        <span style={estilos.labelKPI}>Platos Publicados</span>
                        <strong style={estilos.valorKPI}>{estadisticasAdmin?.platosPublicados || 0}</strong>
                    </div>
                    <div style={estilos.cardKPI}>
                        <span style={estilos.labelKPI}>Locales en la Plataforma</span>
                        <strong style={estilos.valorKPI}>{estadisticasAdmin?.localesActivos || 0}</strong>
                    </div>
                    <div style={estilos.cardKPI}>
                        <span style={estilos.labelKPI}>Pedidos Enviados</span>
                        <strong style={estilos.valorKPI}>{estadisticasAdmin?.pedidosEnviados || 0}</strong>
                    </div>
                    <div style={estilos.cardKPI}>
                        <span style={estilos.labelKPI}>Ganancias (Comisión 5%)</span>
                        <strong style={{ ...estilos.valorKPI, color: '#2e7d32' }}>
                            $ {estadisticasAdmin.gananciasPlataforma ? Number(estadisticasAdmin.gananciasPlataforma).toLocaleString('es-AR') : '0'}
                        </strong>
                    </div>
                </div>
            )}
            {/* TABS */}
            <div style={estilos.tabsContainer}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setVistaActiva(tab.key)}
                        style={vistaActiva === tab.key ? estilos.tabActivo : estilos.tabInactivo}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {/* VISTA: INVENTARIO */}
            {vistaActiva === 'inventario' && (
                <div style={estilos.panelBlanco}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={estilos.tituloSeccionInline}>Inventario y Menú Activo</h3>
                        <button onClick={abrirAlta} style={estilos.botonPrimario}>
                            Agregar Nuevo Plato
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={estilos.tabla}>
                            <thead>
                                <tr style={estilos.filaHeader}>
                                    <th style={estilos.celdaHeader}>Miniatura</th>
                                    <th style={estilos.celdaHeader}>Nombre</th>
                                    <th style={estilos.celdaHeader}>Categoría</th>
                                    <th style={estilos.celdaHeader}>Precio</th>
                                    <th style={estilos.celdaHeader}>Stock</th>
                                    {rol === 'admin' && <th style={estilos.celdaHeader}>Vendedor</th>}
                                    <th style={estilos.celdaHeader}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {misPlatosFiltrados.map(p => (
                                    <tr key={p.id} style={estilos.filaBody}>
                                        <td style={estilos.celdaBody}>
                                            <div style={estilos.miniaturaWrapper}>
                                                <img
                                                    src={p.imagenUrl ? (p.imagenUrl.startsWith('/uploads') ? `http://localhost:3000${p.imagenUrl}` : p.imagenUrl) : `/src/assets/${(p.categoria || 'default').toLowerCase()}.webp`}
                                                    alt="miniatura"
                                                    style={estilos.miniatura}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ ...estilos.celdaBody, fontWeight: '500', color: '#212121' }}>{p.nombre}</td>
                                        <td style={estilos.celdaBody}>{p.categoria}</td>
                                        <td style={{ ...estilos.celdaBody, color: '#d32f2f', fontWeight: '600' }}>${p.precio}</td>
                                        <td style={estilos.celdaBody}>
                                            <span style={p.stock < 5 ? estilos.stockAlerta : {}}>{p.stock} un.</span>
                                        </td>
                                        {rol === 'admin' && (
                                            <td style={estilos.celdaBody}>{p.vendedor?.nombre || '-'}</td>
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
                </div>
            )}
            {/* VISTA: DASHBOARD */}
            {vistaActiva === 'dashboard' && (
                <>
                    {rol === 'admin' ? (
                        <div style={estilos.panelBlanco}>
                            <h3 style={estilos.tituloSeccion}>Liquidación y Comisiones por Local (5%)</h3>
                            {comisionesVendedores.length === 0 ? (
                                <p style={{ color: '#757575', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                                    No hay ventas registradas para comisionar.
                                </p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={estilos.tabla}>
                                        <thead>
                                            <tr style={estilos.filaHeader}>
                                                <th style={estilos.celdaHeader}>ID Vendedor</th>
                                                <th style={estilos.celdaHeader}>Nombre del Local</th>
                                                <th style={estilos.celdaHeader}>Total Vendido ($)</th>
                                                <th style={estilos.celdaHeader}>Comisión a Cobrar (5%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comisionesVendedores.map(item => (
                                                <tr key={item.id} style={estilos.filaBody}>
                                                    <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>#{item.id}</td>
                                                    <td style={{ ...estilos.celdaBody, fontWeight: '500', color: '#212121' }}>{item.nombre}</td>
                                                    <td style={estilos.celdaBody}>$ {Number(item.totalVentas).toLocaleString('es-AR')}</td>
                                                    <td style={{ ...estilos.celdaBody, fontWeight: '600', color: '#2e7d32' }}>
                                                        $ {Number(item.comisionDebida).toLocaleString('es-AR')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div style={estilos.gridKPIs}>
                                <div style={estilos.cardKPI}>
                                    <span style={estilos.labelKPI}>Volumen de Ventas</span>
                                    <strong style={estilos.valorKPI}>{volumenVentas} pedidos</strong>
                                </div>
                                <div style={estilos.cardKPI}>
                                    <span style={estilos.labelKPI}>Facturación Total</span>
                                    <strong style={{ ...estilos.valorKPI, color: '#d32f2f' }}>${facturacionTotal.toFixed(2)}</strong>
                                </div>
                            </div>
                            <div style={estilos.panelBlanco}>
                                <h3 style={estilos.tituloSeccion}>Control de Comandas Recibidas</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {/* SECCIÓN 1: PENDIENTES */}
                                    <div style={{ borderLeft: '4px solid #f57c00', paddingLeft: '16px' }}>
                                        <h4 style={{ margin: '0 0 16px 0', color: '#f57c00', fontSize: '1.1rem', fontWeight: '600' }}>Comandas Pendientes</h4>
                                        {pendientes.length === 0 ? (
                                            <p style={{ color: '#757575', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No hay pedidos pendientes.</p>
                                        ) : (
                                            renderTablaPedidos(pendientes)
                                        )}
                                    </div>
                                    {/* SECCIÓN 2: ENVIADOS */}
                                    <div style={{ borderLeft: '4px solid #388e3c', paddingLeft: '16px' }}>
                                        <h4 style={{ margin: '0 0 16px 0', color: '#388e3c', fontSize: '1.1rem', fontWeight: '600' }}>Historial: Enviados</h4>
                                        {enviados.length === 0 ? (
                                            <p style={{ color: '#757575', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No hay pedidos enviados.</p>
                                        ) : (
                                            renderTablaPedidos(enviados)
                                        )}
                                    </div>
                                    {/* SECCIÓN 3: RECHAZADOS */}
                                    <div style={{ borderLeft: '4px solid #757575', paddingLeft: '16px' }}>
                                        <h4 style={{ margin: '0 0 16px 0', color: '#757575', fontSize: '1.1rem', fontWeight: '600' }}>Historial: Rechazados</h4>
                                        {rechazados.length === 0 ? (
                                            <p style={{ color: '#757575', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No hay pedidos rechazados.</p>
                                        ) : (
                                            renderTablaPedidos(rechazados)
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
            {/* VISTA: USUARIOS (ADMIN) */}
            {vistaActiva === 'usuarios' && rol === 'admin' && (
                <div style={estilos.panelBlanco}>
                    <h3 style={estilos.tituloSeccion}>Gestión Global de Usuarios</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={estilos.tabla}>
                            <thead>
                                <tr style={estilos.filaHeader}>
                                    <th style={estilos.celdaHeader}>ID</th>
                                    <th style={estilos.celdaHeader}>Nombre</th>
                                    <th style={estilos.celdaHeader}>Email</th>
                                    <th style={estilos.celdaHeader}>Rol</th>
                                    <th style={estilos.celdaHeader}>Registrado</th>
                                    <th style={estilos.celdaHeader}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id} style={estilos.filaBody}>
                                        <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>#{u.id}</td>
                                        <td style={{ ...estilos.celdaBody, fontWeight: '500', color: '#212121' }}>
                                            {u.nombre}
                                            {u.solicitud_vendedor && u.rol === 'foodie' && (
                                                <span style={{ marginLeft: '8px', backgroundColor: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>POSTULANTE</span>
                                            )}
                                        </td>
                                        <td style={estilos.celdaBody}>{u.email}</td>
                                        <td style={estilos.celdaBody}>
                                            <select
                                                value={u.rol || ''}
                                                onChange={(e) => cambiarRolUsuario(u.id, e.target.value)}
                                                style={estilos.selectPequeno}
                                            >
                                                <option value="" disabled>Seleccione</option>
                                                <option value="foodie">Foodie</option>
                                                <option value="vendedor">Vendedor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td style={estilos.celdaBody}>
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-AR') : '-'}
                                        </td>
                                        <td style={estilos.celdaBody}>
                                            {u.solicitud_vendedor && u.rol === 'foodie' && (
                                                <>
                                                    <button onClick={() => cambiarRolUsuario(u.id, 'vendedor')} style={{ ...estilos.botonEditar, backgroundColor: '#2e7d32', marginBottom: '8px', display: 'block', width: '100%', boxSizing: 'border-box' }}>Aprobar Vendedor</button>
                                                    <button onClick={() => rechazarSolicitud(u.id)} style={{ backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', marginBottom: '8px', display: 'block', width: '100%', boxSizing: 'border-box', fontFamily: "'Poppins', sans-serif", transition: 'all 0.2s ease' }}>Rechazar Solicitud</button>
                                                </>
                                            )}
                                            <button onClick={() => eliminarUsuario(u.id)} style={{ ...estilos.botonEliminar, display: 'block', width: '100%', boxSizing: 'border-box' }}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* MODAL: FORMULARIO PLATO */}
            {modalAbierto && (
                <div style={estilos.modalOverlay}>
                    <div style={estilos.modalContenido}>
                        <div style={estilos.modalHeader}>
                            <h3 style={{ margin: 0, color: '#212121' }}>{creandoNuevo ? 'Agregar Nuevo Plato' : 'Editar Información del Plato'}</h3>
                            <button onClick={() => setModalAbierto(false)} style={estilos.botonCerrarModal}>✕</button>
                        </div>
                        <form onSubmit={manejarSubmit} style={estilos.formulario}>
                            <div style={estilos.grupoInput}>
                                <label style={estilos.label}>Nombre del Plato</label>
                                <input type="text" required value={formDataLocal.nombre} onChange={e => setFormDataLocal({ ...formDataLocal, nombre: e.target.value })} style={estilos.input} />
                            </div>
                            <div style={estilos.grupoInput}>
                                <label style={estilos.label}>Descripción</label>
                                <textarea required value={formDataLocal.descripcion} onChange={e => setFormDataLocal({ ...formDataLocal, descripcion: e.target.value })} style={{ ...estilos.input, minHeight: '80px', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={estilos.grupoInput}>
                                    <label style={estilos.label}>Precio ($)</label>
                                    <input type="number" required min="1" step="0.01" value={formDataLocal.precio} onChange={e => setFormDataLocal({ ...formDataLocal, precio: e.target.value })} style={estilos.input} />
                                </div>
                                <div style={estilos.grupoInput}>
                                    <label style={estilos.label}>Stock Inicial</label>
                                    <input type="number" required min="1" max="100" value={formDataLocal.stock} onChange={e => setFormDataLocal({ ...formDataLocal, stock: e.target.value })} style={estilos.input} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div style={estilos.grupoInput}>
                                    <label style={estilos.label}>Categoría</label>
                                    <select value={formDataLocal.categoria} onChange={e => setFormDataLocal({ ...formDataLocal, categoria: e.target.value })} style={estilos.input}>
                                        <option value="Pizzas">Pizzas</option>
                                        <option value="Hamburguesas">Hamburguesas</option>
                                        <option value="Empanadas">Empanadas</option>
                                        <option value="Parrilla">Parrilla</option>
                                        <option value="Sushi">Sushi</option>
                                        <option value="Vegano">Vegano</option>
                                        <option value="Postres">Postres</option>
                                    </select>
                                </div>
                                <div style={estilos.grupoInput}>
                                    <label style={estilos.label}>Tiempo de Prep.</label>
                                    <input type="text" value={formDataLocal.tiempo_prep} onChange={e => setFormDataLocal({ ...formDataLocal, tiempo_prep: e.target.value })} style={estilos.input} />
                                </div>
                            </div>
                            <div style={estilos.grupoInput}>
                                <label style={estilos.label}>Imagen del Plato (.jpg)</label>
                                <div style={estilos.uploadContainer}>
                                    <input
                                        type="file"
                                        accept="image/jpeg"
                                        onChange={(e) => setArchivoImagen(e.target.files[0])}
                                        style={estilos.inputFile}
                                    />
                                    {archivoImagen && <span style={estilos.fileName}>Archivo seleccionado: {archivoImagen.name}</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
                                <label style={estilos.checkboxLabel}>
                                    <input type="checkbox" checked={formDataLocal.es_vegano} onChange={e => setFormDataLocal({ ...formDataLocal, es_vegano: e.target.checked })} /> Opción Vegana
                                </label>
                                <label style={estilos.checkboxLabel}>
                                    <input type="checkbox" checked={formDataLocal.es_sintacc} onChange={e => setFormDataLocal({ ...formDataLocal, es_sintacc: e.target.checked })} /> Sin TACC
                                </label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setModalAbierto(false)} style={estilos.botonSecundario}>Cancelar</button>
                                <button type="submit" style={estilos.botonPrimario}>{creandoNuevo ? 'Publicar Plato' : 'Guardar Cambios'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const estilos = {
    contenedorPrincipal: { padding: '40px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Poppins', sans-serif", backgroundColor: '#fafafa', minHeight: '100vh' },
    cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    tituloPrincipal: { margin: 0, color: '#212121', fontSize: '1.8rem', fontWeight: '700' },
    badgeAdmin: { backgroundColor: '#212121', color: '#ffffff', padding: '6px 16px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '1px' },

    tabsContainer: { display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #eeeeee' },
    tabActivo: { backgroundColor: '#212121', color: '#ffffff', border: 'none', padding: '10px 20px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' },
    tabInactivo: { backgroundColor: 'transparent', color: '#757575', border: '1px solid #e0e0e0', borderBottom: 'none', padding: '10px 20px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' },

    botonPrimario: { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s ease' },
    botonSecundario: { backgroundColor: 'transparent', color: '#757575', border: '1px solid #e0e0e0', padding: '12px 24px', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" },

    gridKPIs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    cardKPI: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '6px' },
    labelKPI: { color: '#757575', fontSize: '0.9rem', fontWeight: '500' },
    valorKPI: { color: '#1976d2', fontSize: '2rem', fontWeight: '600' },

    panelBlanco: { backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '30px' },
    tituloSeccion: { margin: '0 0 24px 0', color: '#212121', fontSize: '1.2rem', fontWeight: '600' },
    tituloSeccionInline: { margin: 0, color: '#212121', fontSize: '1.2rem', fontWeight: '600' },

    tabla: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    filaHeader: { borderBottom: '2px solid #eeeeee' },
    celdaHeader: { padding: '14px 12px', color: '#757575', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.3px' },
    filaBody: { borderBottom: '1px solid #f5f5f5', transition: 'background-color 0.15s ease' },
    celdaBody: { padding: '14px 12px', color: '#424242', fontSize: '0.9rem', verticalAlign: 'middle' },

    stockAlerta: { color: '#d32f2f', fontWeight: '600' },

    miniaturaWrapper: { width: '50px', height: '50px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    miniatura: { width: '100%', height: '100%', objectFit: 'cover' },

    botonEditar: { backgroundColor: '#1976d2', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', marginRight: '8px', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s ease' },
    botonEliminar: { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s ease' },

    selectPequeno: { padding: '6px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", outline: 'none', backgroundColor: '#ffffff' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    modalContenido: { backgroundColor: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #eeeeee' },
    botonCerrarModal: { background: 'none', border: 'none', fontSize: '1.5rem', color: '#757575', cursor: 'pointer' },

    formulario: { display: 'flex', flexDirection: 'column', gap: '20px' },
    grupoInput: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#424242', fontSize: '0.9rem', fontWeight: '600' },
    input: { padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.95rem', fontFamily: "'Poppins', sans-serif", outline: 'none', backgroundColor: '#ffffff', transition: 'border-color 0.2s ease' },

    uploadContainer: { border: '1px dashed #bdbdbd', padding: '16px', borderRadius: '4px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' },
    inputFile: { fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem' },
    fileName: { fontSize: '0.85rem', color: '#d32f2f', fontWeight: '500' },

    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#424242', fontSize: '0.9rem', cursor: 'pointer' }
};

const obtenerEstiloBadge = (estado) => {
    const base = { padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', display: 'inline-block' };
    if (estado === 'Enviado') return { ...base, backgroundColor: '#e8f5e9', color: '#2e7d32' };
    if (estado === 'Rechazado') return { ...base, backgroundColor: '#ffebee', color: '#c62828' };
    return { ...base, backgroundColor: '#fff8e1', color: '#f57f17' };
};

export default AdminPanel;
