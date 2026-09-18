import { useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';
import { navegar, RUTAS } from '../utils/rutas';
import { LIMITES } from '../utils/limites';
import Icono from './Icono';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Signup({ alRegistrarse, alVerTerminos }) {
    const { mostrarAviso } = useFoodie();
    const [datos, setDatos] = useState({ nombre: '', email: '', password: '' });
    const [terminos, setTerminos] = useState(false);
    const [errores, setErrores] = useState({});
    const [enviando, setEnviando] = useState(false);

    const validar = () => {
        const nuevos = {};
        if (datos.nombre.trim().length < 2) nuevos.nombre = 'Escribí tu nombre (al menos 2 letras).';
        if (!EMAIL_REGEX.test(datos.email)) nuevos.email = 'Ingresá un correo válido.';
        if (datos.password.length < 6) nuevos.password = 'La contraseña tiene que tener al menos 6 caracteres.';
        if (!terminos) nuevos.terminos = 'Para crear la cuenta tenés que aceptar los términos.';
        setErrores(nuevos);
        return Object.keys(nuevos).length === 0;
    };

    const actualizar = (campo) => (evento) => {
        setDatos(prev => ({ ...prev, [campo]: evento.target.value }));
        if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: undefined }));
    };

    const enviar = async (evento) => {
        evento.preventDefault();
        if (!validar()) return;
        setEnviando(true);
        try {
            const { data } = await api.post('/usuarios/register', datos);
            mostrarAviso(data.mensaje || 'Cuenta creada. Ya podés ingresar.', 'exito');
            alRegistrarse(datos.email);
        } catch (err) {
            setErrores({ general: mensajeDeError(err, 'No se pudo crear la cuenta.') });
            setEnviando(false);
        }
    };

    return (
        <>
            <h1 className="acceso__titulo">Creá tu cuenta</h1>
            <p className="acceso__subtitulo">Es gratis y te lleva un minuto.</p>

            <form className="formulario" onSubmit={enviar} noValidate>
                <Campo id="alta-nombre" etiqueta="Nombre y apellido" error={errores.nombre}>
                    <input id="alta-nombre" className="entrada" autoComplete="name" placeholder="Ej.: Lucía Fernández" autoFocus
                        maxLength={LIMITES.nombre} value={datos.nombre} onChange={actualizar('nombre')}
                        aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? 'alta-nombre-error' : undefined} />
                </Campo>
                <Campo id="alta-email" etiqueta="Correo electrónico" error={errores.email}>
                    <input id="alta-email" type="email" className="entrada" autoComplete="email" placeholder="nombre@ejemplo.com"
                        maxLength={LIMITES.email} value={datos.email} onChange={actualizar('email')}
                        aria-invalid={Boolean(errores.email)} aria-describedby={errores.email ? 'alta-email-error' : undefined} />
                </Campo>
                <Campo id="alta-password" etiqueta="Contraseña" error={errores.password} ayuda="Mínimo 6 caracteres.">
                    <input id="alta-password" type="password" className="entrada" autoComplete="new-password"
                        maxLength={LIMITES.password} value={datos.password} onChange={actualizar('password')}
                        aria-invalid={Boolean(errores.password)} aria-describedby="alta-password-ayuda" />
                </Campo>

                <div className="campo">
                    <div>
                        <label className="casilla">
                            <input type="checkbox" checked={terminos} onChange={(e) => {
                                setTerminos(e.target.checked);
                                if (errores.terminos) setErrores(prev => ({ ...prev, terminos: undefined }));
                            }} />
                            Acepto los términos y condiciones
                        </label>{' '}
                        <button type="button" className="enlace" onClick={alVerTerminos}>(leerlos)</button>
                    </div>
                    {errores.terminos && <span className="campo__error">{errores.terminos}</span>}
                </div>

                {errores.general && <p role="alert" className="mensaje mensaje--error"><Icono nombre="alerta" tamano={18} />{errores.general}</p>}

                <button type="submit" className="boton boton--primario boton--grande boton--bloque" disabled={enviando}>
                    {enviando ? 'Creando la cuenta…' : 'Crear cuenta'}
                </button>
            </form>

            <p className="acceso__alternativa">
                ¿Ya tenés cuenta?{' '}
                <button type="button" className="enlace" onClick={() => navegar(RUTAS.ingresar)}>Ingresá</button>
            </p>
        </>
    );
}

function Campo({ id, etiqueta, error, ayuda, children }) {
    return (
        <div className="campo">
            <label htmlFor={id} className="campo__etiqueta">{etiqueta}</label>
            {children}
            {error ? <span id={`${id}-error`} className="campo__error">{error}</span>
                : ayuda && <span id={`${id}-ayuda`} className="campo__ayuda">{ayuda}</span>}
        </div>
    );
}

export default Signup;
