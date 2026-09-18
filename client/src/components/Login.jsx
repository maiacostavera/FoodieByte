import { useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';
import { navegar, RUTAS } from '../utils/rutas';
import Icono from './Icono';

// Atajos para presentar la demo con las cuentas que crean los seeders (ver el
// README). Solo existen con `npm run dev`: en el build de producción la lista
// queda vacía, el bloque no aparece y estas contraseñas no llegan al código.
const CUENTAS_DEMO = import.meta.env.DEV
    ? [
        { rol: 'Cliente', email: 'lucia@foodiebyte.com', password: 'demo1234' },
        { rol: 'Local', email: 'lanonna@foodiebyte.com', password: 'demo1234' },
        { rol: 'Administrador', email: 'admin@foodiebyte.com', password: 'admin1234' }
    ]
    : [];

function Login({ emailInicial = '' }) {
    const { login, mostrarAviso } = useFoodie();
    const [datos, setDatos] = useState({ email: emailInicial, password: '' });
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    const ingresar = async (credenciales) => {
        setEnviando(true);
        setError('');
        try {
            const { data } = await api.post('/usuarios/login', credenciales);
            login(data.usuario, data.token);
            mostrarAviso(`¡Hola, ${data.usuario.nombre}!`, 'exito');
            // No hace falta nada más: la aplicación ve la sesión nueva y sale de esta pantalla.
        } catch (err) {
            // El error se muestra en el formulario, donde el usuario está mirando.
            setError(mensajeDeError(err, 'No se pudo iniciar sesión.'));
            setEnviando(false);
        }
    };

    const actualizar = (evento) => {
        setDatos(prev => ({ ...prev, [evento.target.name]: evento.target.value }));
        if (error) setError('');
    };

    return (
        <>
            <h1 className="acceso__titulo">Ingresá a tu cuenta</h1>
            <p className="acceso__subtitulo">Para pedir, seguir tus pedidos o gestionar tu local.</p>

            <form className="formulario" onSubmit={(e) => { e.preventDefault(); ingresar(datos); }} noValidate>
                <div className="campo">
                    <label htmlFor="login-email" className="campo__etiqueta">Correo electrónico</label>
                    <input id="login-email" name="email" type="email" className="entrada" autoComplete="email"
                        placeholder="nombre@ejemplo.com" required autoFocus={!emailInicial}
                        value={datos.email} onChange={actualizar} />
                </div>
                <div className="campo">
                    <label htmlFor="login-password" className="campo__etiqueta">Contraseña</label>
                    <input id="login-password" name="password" type="password" className="entrada" autoComplete="current-password"
                        placeholder="Tu contraseña" required autoFocus={Boolean(emailInicial)}
                        value={datos.password} onChange={actualizar} />
                </div>

                {error && <p role="alert" className="mensaje mensaje--error"><Icono nombre="alerta" tamano={18} />{error}</p>}

                <button type="submit" className="boton boton--primario boton--grande boton--bloque" disabled={enviando}>
                    {enviando ? 'Ingresando…' : 'Ingresar'}
                </button>
            </form>

            <p className="acceso__alternativa">
                ¿No tenés cuenta?{' '}
                <button type="button" className="enlace" onClick={() => navegar(RUTAS.registro)}>Creala gratis</button>
            </p>

            {CUENTAS_DEMO.length > 0 && (
                <div className="cuentas-demo">
                    <p className="cuentas-demo__titulo"><Icono nombre="info" tamano={14} />Entrar con una cuenta de la demo</p>
                    <div className="cuentas-demo__lista">
                        {CUENTAS_DEMO.map(({ rol, email, password }) => (
                            <button key={email} type="button" className="cuenta-demo" disabled={enviando}
                                onClick={() => { setDatos({ email, password }); ingresar({ email, password }); }}>
                                <strong>{rol}</strong>
                                <span>{email}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export default Login;
