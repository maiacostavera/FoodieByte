import { useState } from 'react';
import api, { mensajeDeError } from '../../api/client';
import { estilos } from './estilos';

const FORMULARIO_VACIO = {
    nombre: '', descripcion: '', precio: '', stock: 1,
    categoria: '', tiempo_prep: '20-30 min',
    es_vegano: false, es_sintacc: false
};

/** Modal de alta y edición de platos del inventario. */
function FormularioPlato({ plato, categorias, alCerrar, alGuardar, mostrarAviso }) {
    const esEdicion = Boolean(plato);

    const [datos, setDatos] = useState(() => (
        plato
            ? {
                nombre: plato.nombre || '',
                descripcion: plato.descripcion || '',
                precio: plato.precio ?? '',
                stock: plato.stock ?? 1,
                categoria: plato.categoria || categorias[0] || '',
                tiempo_prep: plato.tiempo_prep || '20-30 min',
                es_vegano: Boolean(plato.es_vegano),
                es_sintacc: Boolean(plato.es_sintacc)
            }
            : { ...FORMULARIO_VACIO, categoria: categorias[0] || '' }
    ));

    const [archivoImagen, setArchivoImagen] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const actualizar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

    const manejarSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!datos.nombre.trim()) return setError('El nombre es obligatorio.');
        if (Number(datos.precio) <= 0) return setError('El precio debe ser mayor a 0.');
        if (Number(datos.stock) < 0 || Number(datos.stock) > 100) {
            return setError('El stock debe estar entre 0 y 100.');
        }

        const fd = new FormData();
        Object.entries(datos).forEach(([clave, valor]) => fd.append(clave, valor));
        if (archivoImagen) fd.append('imagen', archivoImagen);

        setGuardando(true);
        try {
            // Sin cabecera Content-Type manual: el navegador arma el boundary
            // correcto del multipart, que si se pisa a mano rompe la subida.
            if (esEdicion) {
                await api.put(`/platos/${plato.id}`, fd);
            } else {
                await api.post('/platos', fd);
            }
            mostrarAviso(esEdicion ? 'Plato actualizado.' : 'Plato publicado con éxito.', 'exito');
            alGuardar();
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo guardar el plato.'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div style={estilos.modalOverlay} onClick={alCerrar}>
            <div style={estilos.modalContenido} onClick={e => e.stopPropagation()}>
                <div style={estilos.modalHeader}>
                    <h3 style={{ margin: 0, color: '#212121' }}>
                        {esEdicion ? 'Editar Información del Plato' : 'Agregar Nuevo Plato'}
                    </h3>
                    <button onClick={alCerrar} style={estilos.botonCerrarModal} aria-label="Cerrar">✕</button>
                </div>

                <form onSubmit={manejarSubmit} style={estilos.formulario} noValidate>
                    <div style={estilos.grupoInput}>
                        <label htmlFor="plato-nombre" style={estilos.label}>Nombre del Plato</label>
                        <input id="plato-nombre" type="text" value={datos.nombre}
                            onChange={e => actualizar('nombre', e.target.value)} style={estilos.input} />
                    </div>

                    <div style={estilos.grupoInput}>
                        <label htmlFor="plato-descripcion" style={estilos.label}>Descripción</label>
                        <textarea id="plato-descripcion" value={datos.descripcion}
                            onChange={e => actualizar('descripcion', e.target.value)}
                            style={{ ...estilos.input, minHeight: '80px', resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={estilos.grupoInput}>
                            <label htmlFor="plato-precio" style={estilos.label}>Precio ($)</label>
                            <input id="plato-precio" type="number" min="1" step="0.01" value={datos.precio}
                                onChange={e => actualizar('precio', e.target.value)} style={estilos.input} />
                        </div>
                        <div style={estilos.grupoInput}>
                            <label htmlFor="plato-stock" style={estilos.label}>Stock</label>
                            <input id="plato-stock" type="number" min="0" max="100" value={datos.stock}
                                onChange={e => actualizar('stock', e.target.value)} style={estilos.input} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={estilos.grupoInput}>
                            <label htmlFor="plato-categoria" style={estilos.label}>Categoría</label>
                            <select id="plato-categoria" value={datos.categoria}
                                onChange={e => actualizar('categoria', e.target.value)} style={estilos.input}>
                                {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div style={estilos.grupoInput}>
                            <label htmlFor="plato-tiempo" style={estilos.label}>Tiempo de Prep.</label>
                            <input id="plato-tiempo" type="text" value={datos.tiempo_prep}
                                onChange={e => actualizar('tiempo_prep', e.target.value)} style={estilos.input} />
                        </div>
                    </div>

                    <div style={estilos.grupoInput}>
                        <label htmlFor="plato-imagen" style={estilos.label}>Imagen del Plato</label>
                        <div style={estilos.uploadContainer}>
                            <input id="plato-imagen" type="file" accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setArchivoImagen(e.target.files[0])} style={estilos.inputFile} />
                            <span style={{ fontSize: '0.8rem', color: '#757575' }}>
                                Formatos .jpg, .png o .webp · máximo 5 MB
                            </span>
                            {archivoImagen && <span style={estilos.fileName}>Seleccionado: {archivoImagen.name}</span>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
                        <label style={estilos.checkboxLabel}>
                            <input type="checkbox" checked={datos.es_vegano}
                                onChange={e => actualizar('es_vegano', e.target.checked)} /> Opción Vegana
                        </label>
                        <label style={estilos.checkboxLabel}>
                            <input type="checkbox" checked={datos.es_sintacc}
                                onChange={e => actualizar('es_sintacc', e.target.checked)} /> Sin TACC
                        </label>
                    </div>

                    {error && <p role="alert" style={{ color: '#c62828', backgroundColor: '#ffebee', padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                        <button type="button" onClick={alCerrar} style={estilos.botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={guardando}
                            style={{ ...estilos.botonPrimario, opacity: guardando ? 0.6 : 1 }}>
                            {guardando ? 'Guardando…' : esEdicion ? 'Guardar Cambios' : 'Publicar Plato'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FormularioPlato;
