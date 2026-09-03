import { useState } from 'react';
import { estilos } from './estilos';

/** Gestión global de usuarios y evaluación de solicitudes de vendedor. */
function GestionUsuarios({ usuarios, alCambiarRol, alRechazarSolicitud, alEliminar }) {
    const [solicitudAbierta, setSolicitudAbierta] = useState(null);

    const postulantes = usuarios.filter(u => u.solicitud_vendedor && u.rol === 'foodie');

    return (
        <div style={estilos.panelBlanco}>
            <h3 style={estilos.tituloSeccion}>
                Gestión Global de Usuarios
                {postulantes.length > 0 && (
                    <span style={estiloContadorSolicitudes}>
                        {postulantes.length} solicitud{postulantes.length === 1 ? '' : 'es'} pendiente{postulantes.length === 1 ? '' : 's'}
                    </span>
                )}
            </h3>

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
                        {usuarios.map(u => {
                            const esPostulante = u.solicitud_vendedor && u.rol === 'foodie';
                            return (
                                <tr key={u.id} style={estilos.filaBody}>
                                    <td style={{ ...estilos.celdaBody, fontWeight: '600' }}>#{u.id}</td>
                                    <td style={{ ...estilos.celdaBody, fontWeight: '500', color: '#212121' }}>
                                        {u.nombre}
                                        {esPostulante && <span style={estiloBadgePostulante}>POSTULANTE</span>}
                                    </td>
                                    <td style={estilos.celdaBody}>{u.email}</td>
                                    <td style={estilos.celdaBody}>
                                        <select value={u.rol || ''}
                                            onChange={(e) => alCambiarRol(u.id, e.target.value)}
                                            style={estilos.selectPequeno}
                                            aria-label={`Rol de ${u.nombre}`}>
                                            <option value="foodie">Foodie</option>
                                            <option value="vendedor">Vendedor</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td style={estilos.celdaBody}>
                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-AR') : '-'}
                                    </td>
                                    <td style={estilos.celdaBody}>
                                        {esPostulante && (
                                            <>
                                                {/* Los datos del formulario de alta ahora se guardan y se
                                                    pueden consultar antes de aprobar la solicitud. */}
                                                <button
                                                    onClick={() => setSolicitudAbierta(u)}
                                                    style={{ ...estilos.botonEditar, backgroundColor: '#546e7a', ...estiloBotonBloque }}>
                                                    Ver solicitud
                                                </button>
                                                <button onClick={() => alCambiarRol(u.id, 'vendedor')}
                                                    style={{ ...estilos.botonEditar, backgroundColor: '#2e7d32', ...estiloBotonBloque }}>
                                                    Aprobar Vendedor
                                                </button>
                                                <button onClick={() => alRechazarSolicitud(u.id)}
                                                    style={{ ...estiloBotonRechazar, ...estiloBotonBloque }}>
                                                    Rechazar Solicitud
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => alEliminar(u.id)}
                                            style={{ ...estilos.botonEliminar, ...estiloBotonBloque, marginBottom: 0 }}>
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {solicitudAbierta && (
                <div style={estilos.modalOverlay} onClick={() => setSolicitudAbierta(null)}>
                    <div style={estilos.modalContenido} onClick={e => e.stopPropagation()}>
                        <div style={estilos.modalHeader}>
                            <h3 style={{ margin: 0, color: '#212121' }}>Solicitud de {solicitudAbierta.nombre}</h3>
                            <button onClick={() => setSolicitudAbierta(null)} style={estilos.botonCerrarModal} aria-label="Cerrar">✕</button>
                        </div>

                        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Dato titulo="Nombre del local" valor={solicitudAbierta.nombre_local} />
                            <Dato titulo="Categoría principal" valor={solicitudAbierta.categoria_local} />
                            <Dato titulo="Teléfono de contacto" valor={solicitudAbierta.telefono} />
                            <Dato titulo="Dirección comercial" valor={solicitudAbierta.direccion} />
                            <Dato titulo="Descripción de los productos" valor={solicitudAbierta.descripcion_productos} />
                            <Dato titulo="Fecha de la solicitud" valor={
                                solicitudAbierta.solicitud_fecha
                                    ? new Date(solicitudAbierta.solicitud_fecha).toLocaleString('es-AR')
                                    : null
                            } />
                        </dl>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '28px' }}>
                            <button onClick={() => { alRechazarSolicitud(solicitudAbierta.id); setSolicitudAbierta(null); }}
                                style={estiloBotonRechazar}>
                                Rechazar
                            </button>
                            <button onClick={() => { alCambiarRol(solicitudAbierta.id, 'vendedor'); setSolicitudAbierta(null); }}
                                style={{ ...estilos.botonPrimario, backgroundColor: '#2e7d32' }}>
                                Aprobar como Vendedor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Dato = ({ titulo, valor }) => (
    <div>
        <dt style={{ color: '#757575', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{titulo}</dt>
        <dd style={{ margin: '4px 0 0 0', color: '#212121', fontSize: '0.95rem', lineHeight: '1.5' }}>
            {valor || <span style={{ color: '#bdbdbd', fontStyle: 'italic' }}>Sin especificar</span>}
        </dd>
    </div>
);

const estiloBadgePostulante = { marginLeft: '8px', backgroundColor: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' };
const estiloContadorSolicitudes = { marginLeft: '12px', backgroundColor: '#fff8e1', color: '#f57f17', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', verticalAlign: 'middle' };
const estiloBotonBloque = { marginBottom: '8px', display: 'block', width: '100%', boxSizing: 'border-box', marginRight: 0 };
const estiloBotonRechazar = { backgroundColor: 'transparent', color: '#d32f2f', border: '1px solid #d32f2f', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif" };

export default GestionUsuarios;
