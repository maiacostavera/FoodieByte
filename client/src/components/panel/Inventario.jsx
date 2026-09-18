import { useState } from 'react';
import { formatearMoneda } from '../../utils/formato';
import { imagenDelPlato } from '../../utils/imagenes';
import Icono from '../Icono';

/** Menú del local (o todos los platos, para el administrador), con búsqueda y acciones. */
function Inventario({ platos, esAdmin, alAgregar, alEditar, alEliminar }) {
    const [filtro, setFiltro] = useState('');
    const texto = filtro.trim().toLowerCase();
    const visibles = texto
        ? platos.filter(plato =>
            `${plato.nombre} ${plato.categoria} ${plato.vendedor?.nombre_local || ''}`.toLowerCase().includes(texto))
        : platos;

    return (
        <section aria-label={esAdmin ? 'Platos de la plataforma' : 'Mi menú'}>
            <div className="barra-herramientas">
                <div className="buscador">
                    <Icono nombre="buscar" tamano={18} />
                    <label htmlFor="buscar-plato" className="solo-lectores">Buscar plato</label>
                    <input id="buscar-plato" type="search" className="entrada entrada--chica"
                        placeholder={esAdmin ? 'Buscar por plato, categoría o local…' : 'Buscar en tu menú…'}
                        value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                </div>
                <button type="button" className="boton boton--primario" onClick={alAgregar}>
                    <Icono nombre="mas" tamano={18} />Agregar plato
                </button>
            </div>

            {platos.length === 0 ? (
                <div className="vacio tarjeta">
                    <span className="vacio__icono"><Icono nombre="plato" tamano={26} /></span>
                    <p className="vacio__titulo">Todavía no hay platos publicados</p>
                    <p>Cargá el primero con “Agregar plato”.</p>
                </div>
            ) : (
                <div className="tarjeta tabla-contenedor">
                    <table className="tabla">
                        <thead>
                            <tr>
                                <th>Plato</th>
                                {esAdmin && <th>Local</th>}
                                <th className="a-la-derecha">Precio</th>
                                <th>Stock</th>
                                <th><span className="solo-lectores">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibles.map(plato => (
                                <tr key={plato.id}>
                                    <td>
                                        <div className="celda-principal">
                                            <img src={imagenDelPlato(plato.categoria, plato.imagenUrl)} alt="" loading="lazy" />
                                            <div>
                                                <strong>{plato.nombre}</strong>
                                                <span>
                                                    {plato.categoria}
                                                    {plato.es_vegano && ' · Vegano'}
                                                    {plato.es_sintacc && ' · Sin TACC'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {esAdmin && <td>{plato.vendedor?.nombre_local || plato.vendedor?.nombre || '—'}</td>}
                                    <td className="a-la-derecha">{formatearMoneda(plato.precio)}</td>
                                    <td><EtiquetaStock stock={Number(plato.stock)} /></td>
                                    <td>
                                        <div className="acciones-fila">
                                            <button type="button" className="boton boton--fantasma boton--icono boton--chico"
                                                onClick={() => alEditar(plato)} aria-label={`Editar ${plato.nombre}`}>
                                                <Icono nombre="lapiz" tamano={16} />
                                            </button>
                                            <button type="button" className="boton boton--fantasma boton--icono boton--chico"
                                                onClick={() => alEliminar(plato)} aria-label={`Eliminar ${plato.nombre}`}>
                                                <Icono nombre="basura" tamano={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibles.length === 0 && <p className="vacio">No hay platos que coincidan con “{filtro}”.</p>}
                </div>
            )}
        </section>
    );
}

function EtiquetaStock({ stock }) {
    if (stock === 0) return <span className="etiqueta etiqueta--peligro">Agotado</span>;
    if (stock < 5) return <span className="etiqueta etiqueta--alerta">Quedan {stock}</span>;
    return <span className="etiqueta">{stock} un.</span>;
}

export default Inventario;
