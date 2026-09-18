import { useState } from 'react';
import { formatearFecha, formatearFechaHora, iniciales, tiempoRelativo } from '../../utils/formato';
import Icono from '../Icono';
import Modal from '../Modal';

const ROLES = [['foodie', 'Cliente'], ['vendedor', 'Local'], ['admin', 'Administrador']];
const FILTROS = [['todos', 'Todos'], ['foodie', 'Clientes'], ['vendedor', 'Locales'], ['admin', 'Admins'], ['desactivados', 'Desactivados']];

const esPostulante = (usuario) => usuario.activo && usuario.solicitud_vendedor && usuario.rol === 'foodie';

/**
 * Gestión de usuarios y evaluación de solicitudes de alta de local.
 * Las cuentas no se borran: se desactivan, así sus pedidos y ventas se conservan.
 */
function GestionUsuarios({ usuarios, idPropio, alCambiarRol, alRechazarSolicitud, alCambiarActivacion }) {
    const [filtro, setFiltro] = useState('todos');
    const [texto, setTexto] = useState('');
    const [solicitudAbierta, setSolicitudAbierta] = useState(null);

    const postulantes = usuarios.filter(esPostulante);
    const busqueda = texto.trim().toLowerCase();
    const visibles = usuarios.filter(usuario => {
        if (filtro === 'desactivados' && usuario.activo) return false;
        if (!['todos', 'desactivados'].includes(filtro) && usuario.rol !== filtro) return false;
        return !busqueda || `${usuario.nombre} ${usuario.email} ${usuario.nombre_local || ''}`.toLowerCase().includes(busqueda);
    });

    const aprobar = (usuario) => { setSolicitudAbierta(null); alCambiarRol(usuario, 'vendedor'); };
    const rechazar = (usuario) => { setSolicitudAbierta(null); alRechazarSolicitud(usuario); };

    return (
        <>
            {postulantes.length > 0 && (
                <section className="panel__seccion" aria-labelledby="titulo-solicitudes">
                    <div className="encabezado-seccion">
                        <div>
                            <h2 id="titulo-solicitudes">Solicitudes de alta <span className="contador">{postulantes.length}</span></h2>
                            <p>Revisá los datos y decidí si el local puede empezar a vender.</p>
                        </div>
                    </div>
                    <div className="solicitudes">
                        {postulantes.map(usuario => (
                            <article key={usuario.id} className="solicitud tarjeta">
                                <div className="solicitud__cabecera">
                                    <span className="avatar">{iniciales(usuario.nombre)}</span>
                                    <div>
                                        <p className="solicitud__local">{usuario.nombre_local || 'Local sin nombre'}</p>
                                        <p className="solicitud__detalle">
                                            {usuario.nombre} · {usuario.categoria_local || 'Sin rubro'}
                                            {usuario.solicitud_fecha && ` · ${tiempoRelativo(usuario.solicitud_fecha)}`}
                                        </p>
                                    </div>
                                </div>
                                {usuario.descripcion_productos && <p className="texto-secundario">{usuario.descripcion_productos}</p>}
                                <div className="solicitud__acciones">
                                    <button type="button" className="boton boton--chico" onClick={() => setSolicitudAbierta(usuario)}>Ver datos</button>
                                    <button type="button" className="boton boton--peligro boton--chico" onClick={() => rechazar(usuario)}>Rechazar</button>
                                    <button type="button" className="boton boton--exito boton--chico" onClick={() => aprobar(usuario)}>
                                        <Icono nombre="check" tamano={16} grosor={3} />Aprobar local
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section className="panel__seccion" aria-labelledby="titulo-usuarios">
                <div className="encabezado-seccion">
                    <div>
                        <h2 id="titulo-usuarios">Usuarios</h2>
                        <p>Las cuentas no se borran: se desactivan y su historial se conserva.</p>
                    </div>
                </div>
                <div className="barra-herramientas">
                    <div className="buscador">
                        <Icono nombre="buscar" tamano={18} />
                        <label htmlFor="buscar-usuario" className="solo-lectores">Buscar usuario</label>
                        <input id="buscar-usuario" type="search" className="entrada entrada--chica"
                            placeholder="Buscar por nombre, correo o local…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </div>
                    <div className="pestanas" role="group" aria-label="Filtrar por tipo de cuenta">
                        {FILTROS.map(([valor, etiqueta]) => (
                            <button key={valor} type="button" className="pestana" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
                                {etiqueta}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="tarjeta tabla-contenedor">
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Alta</th>
                                <th><span className="solo-lectores">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map(usuario => {
                                const esPropio = usuario.id === idPropio;
                                return (
                                    <tr key={usuario.id} className={usuario.activo ? undefined : 'tabla__fila--apagada'}>
                                        <td>
                                            <div className="celda-principal">
                                                <span className="avatar avatar--chico">{iniciales(usuario.nombre)}</span>
                                                <div>
                                                    <strong>
                                                        {usuario.nombre}
                                                        {esPropio && <span className="etiqueta etiqueta--oscura">Vos</span>}
                                                        {esPostulante(usuario) && <span className="etiqueta etiqueta--info">Postulante</span>}
                                                    </strong>
                                                    <span>{usuario.email}{usuario.rol === 'vendedor' && usuario.nombre_local ? ` · ${usuario.nombre_local}` : ''}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <label htmlFor={`rol-${usuario.id}`} className="solo-lectores">Rol de {usuario.nombre}</label>
                                            <select id={`rol-${usuario.id}`} className="entrada entrada--chica" value={usuario.rol}
                                                disabled={esPropio} onChange={(e) => alCambiarRol(usuario, e.target.value)}>
                                                {ROLES.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            {usuario.activo
                                                ? <span className="etiqueta etiqueta--exito">Activa</span>
                                                : <span className="etiqueta">Desactivada</span>}
                                        </td>
                                        <td className="texto-tenue">{formatearFecha(usuario.createdAt)}</td>
                                        <td>
                                            <div className="acciones-fila">
                                                {!esPropio && (usuario.activo ? (
                                                    <button type="button" className="boton boton--peligro boton--chico"
                                                        onClick={() => alCambiarActivacion(usuario, false)}>Desactivar</button>
                                                ) : (
                                                    <button type="button" className="boton boton--chico"
                                                        onClick={() => alCambiarActivacion(usuario, true)}>Reactivar</button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {visibles.length === 0 && <p className="vacio">No hay usuarios con ese filtro.</p>}
                </div>
            </section>

            {solicitudAbierta && (
                <Modal titulo={solicitudAbierta.nombre_local || 'Solicitud de alta'} subtitulo={`Pedida por ${solicitudAbierta.nombre}`}
                    tamano="ancho" alCerrar={() => setSolicitudAbierta(null)}
                    pie={
                        <>
                            <button type="button" className="boton boton--peligro" onClick={() => rechazar(solicitudAbierta)}>Rechazar</button>
                            <button type="button" className="boton boton--exito" onClick={() => aprobar(solicitudAbierta)}>
                                <Icono nombre="check" tamano={16} grosor={3} />Aprobar local
                            </button>
                        </>
                    }>
                    <dl className="datos-solicitud">
                        <Dato titulo="Rubro" valor={solicitudAbierta.categoria_local} />
                        <Dato titulo="Teléfono" valor={solicitudAbierta.telefono} />
                        <Dato titulo="Correo" valor={solicitudAbierta.email} />
                        <Dato titulo="Pedida el" valor={solicitudAbierta.solicitud_fecha && formatearFechaHora(solicitudAbierta.solicitud_fecha)} />
                        <Dato titulo="Dirección" valor={solicitudAbierta.direccion} ancho />
                        <Dato titulo="Qué va a vender" valor={solicitudAbierta.descripcion_productos} ancho />
                    </dl>
                </Modal>
            )}
        </>
    );
}

const Dato = ({ titulo, valor, ancho = false }) => (
    <div className={ancho ? 'datos-solicitud__ancho' : undefined}>
        <dt>{titulo}</dt>
        <dd>{valor || <span className="texto-tenue">Sin especificar</span>}</dd>
    </div>
);

export default GestionUsuarios;
