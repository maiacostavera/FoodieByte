import { useEffect, useMemo, useState } from 'react';
import api, { mensajeDeError } from '../../api/client';
import { useFoodie } from '../../state/FoodieContext';
import { imagenDelPlato } from '../../utils/imagenes';
import { LIMITES } from '../../utils/limites';
import Modal from '../Modal';
import Icono from '../Icono';

const FORMULARIO_VACIO = {
    nombre: '', descripcion: '', precio: '', stock: 10,
    categoria: '', tiempo_prep: '20-30 min',
    es_vegano: false, es_sintacc: false
};

/** Alta y edición de platos, con vista previa de la foto antes de subirla. */
function FormularioPlato({ plato, categorias, alCerrar, alGuardar }) {
    const { mostrarAviso } = useFoodie();
    const esEdicion = Boolean(plato);

    const [datos, setDatos] = useState(() => (plato
        ? {
            nombre: plato.nombre || '',
            descripcion: plato.descripcion || '',
            precio: plato.precio ?? '',
            stock: plato.stock ?? 0,
            categoria: plato.categoria || categorias[0] || '',
            tiempo_prep: plato.tiempo_prep || '20-30 min',
            es_vegano: Boolean(plato.es_vegano),
            es_sintacc: Boolean(plato.es_sintacc)
        }
        : { ...FORMULARIO_VACIO, categoria: categorias[0] || '' }));
    const [archivo, setArchivo] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    // Vista previa local del archivo elegido; se libera al cambiarlo o al cerrar.
    const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo]);
    useEffect(() => () => { if (vistaPrevia) URL.revokeObjectURL(vistaPrevia); }, [vistaPrevia]);
    const imagenActual = vistaPrevia || (plato ? imagenDelPlato(plato.categoria, plato.imagenUrl) : null);

    const actualizar = (campo, valor) => setDatos(prev => ({ ...prev, [campo]: valor }));

    const guardar = async (evento) => {
        evento.preventDefault();
        setError('');
        if (!datos.nombre.trim()) return setError('El nombre es obligatorio.');
        if (!(Number(datos.precio) > 0)) return setError('El precio tiene que ser mayor a 0.');
        if (Number(datos.stock) < 0 || Number(datos.stock) > LIMITES.stock) {
            return setError(`El stock tiene que estar entre 0 y ${LIMITES.stock}.`);
        }

        const formulario = new FormData();
        Object.entries(datos).forEach(([clave, valor]) => formulario.append(clave, valor));
        if (archivo) formulario.append('imagen', archivo);

        setGuardando(true);
        try {
            // Sin cabecera Content-Type manual: el navegador arma el boundary
            // correcto del multipart, que si se pisa a mano rompe la subida.
            if (esEdicion) await api.put(`/platos/${plato.id}`, formulario);
            else await api.post('/platos', formulario);
            mostrarAviso(esEdicion ? 'Cambios guardados.' : 'Plato publicado.', 'exito');
            alGuardar();
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo guardar el plato.'));
            setGuardando(false);
        }
    };

    return (
        <Modal titulo={esEdicion ? 'Editar plato' : 'Nuevo plato'} tamano="ancho" alCerrar={alCerrar}
            subtitulo={esEdicion ? plato.nombre : 'Se publica en el catálogo apenas lo guardes.'}
            pie={
                <>
                    <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
                    <button type="submit" form="formulario-plato" className="boton boton--primario" disabled={guardando}>
                        {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Publicar plato'}
                    </button>
                </>
            }>
            <form id="formulario-plato" className="formulario" onSubmit={guardar} noValidate>
                <div className="campo">
                    <label htmlFor="plato-nombre" className="campo__etiqueta">Nombre</label>
                    <input id="plato-nombre" className="entrada" data-autofocus maxLength={LIMITES.nombre}
                        placeholder="Ej.: Pizza Margherita" value={datos.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
                </div>

                <div className="campo">
                    <label htmlFor="plato-descripcion" className="campo__etiqueta">Descripción</label>
                    <textarea id="plato-descripcion" className="entrada" maxLength={LIMITES.descripcion}
                        placeholder="Ingredientes, porción, cómo se sirve…"
                        value={datos.descripcion} onChange={(e) => actualizar('descripcion', e.target.value)} />
                </div>

                <div className="grilla-campos">
                    <div className="campo">
                        <label htmlFor="plato-precio" className="campo__etiqueta">Precio ($)</label>
                        <input id="plato-precio" type="number" className="entrada" min="1" step="100"
                            value={datos.precio} onChange={(e) => actualizar('precio', e.target.value)} />
                    </div>
                    <div className="campo">
                        <label htmlFor="plato-stock" className="campo__etiqueta">Stock</label>
                        <input id="plato-stock" type="number" className="entrada" min="0" max={LIMITES.stock}
                            value={datos.stock} onChange={(e) => actualizar('stock', e.target.value)} />
                    </div>
                    <div className="campo">
                        <label htmlFor="plato-categoria" className="campo__etiqueta">Categoría</label>
                        <select id="plato-categoria" className="entrada" value={datos.categoria}
                            onChange={(e) => actualizar('categoria', e.target.value)}>
                            {categorias.map(categoria => <option key={categoria} value={categoria}>{categoria}</option>)}
                        </select>
                    </div>
                    <div className="campo">
                        <label htmlFor="plato-tiempo" className="campo__etiqueta">Tiempo de preparación</label>
                        <input id="plato-tiempo" className="entrada" maxLength={LIMITES.tiempoPrep}
                            value={datos.tiempo_prep} onChange={(e) => actualizar('tiempo_prep', e.target.value)} />
                    </div>
                </div>

                <div className="campo">
                    <span className="campo__etiqueta">Foto</span>
                    <div className="selector-imagen">
                        {imagenActual
                            ? <img className="selector-imagen__vista" src={imagenActual} alt="Vista previa de la foto" />
                            : <span className="selector-imagen__vista"><Icono nombre="imagen" tamano={28} /></span>}
                        <div className="campo">
                            <label htmlFor="plato-imagen" className="solo-lectores">Elegir una foto</label>
                            <input id="plato-imagen" type="file" accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setArchivo(e.target.files[0] || null)} />
                            <span className="campo__ayuda">JPG, PNG o WebP, hasta 5 MB.{esEdicion && ' Si no elegís una, queda la actual.'}</span>
                        </div>
                    </div>
                </div>

                <div className="interruptores">
                    <label className="interruptor">
                        <input type="checkbox" checked={datos.es_vegano} onChange={(e) => actualizar('es_vegano', e.target.checked)} />
                        <Icono nombre="hoja" tamano={16} />Vegano
                    </label>
                    <label className="interruptor">
                        <input type="checkbox" checked={datos.es_sintacc} onChange={(e) => actualizar('es_sintacc', e.target.checked)} />
                        <Icono nombre="escudo" tamano={16} />Sin TACC
                    </label>
                </div>

                {error && <p role="alert" className="mensaje mensaje--error"><Icono nombre="alerta" tamano={18} />{error}</p>}
            </form>
        </Modal>
    );
}

export default FormularioPlato;
