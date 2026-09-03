import { useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';

const Login = ({ alIrARegistro, alCerrar }) => {
    const { login, mostrarAviso } = useFoodie();
    const [datos, setDatos] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [hoverBoton, setHoverBoton] = useState(false);
    const [hoverLink, setHoverLink] = useState(false);

    const manejarCambio = (e) => {
        setDatos({ ...datos, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const enviarFormulario = async (e) => {
        e.preventDefault();
        setEnviando(true);
        setError('');

        try {
            const { data } = await api.post('/usuarios/login', datos);
            login(data.usuario, data.token);
            mostrarAviso(`¡Bienvenido, ${data.usuario.nombre}!`, 'exito');
            if (alCerrar) alCerrar();
        } catch (err) {
            // El error se muestra en el formulario, donde el usuario está mirando.
            setError(mensajeDeError(err, 'No se pudo iniciar sesión.'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div style={estiloContenedorFondo}>
            <div style={estiloTarjeta}>
                <h2 style={estiloTitulo}>Inicio de Sesión</h2>
                <p style={estiloSubtitulo}>Ingresá tus credenciales para acceder a la plataforma</p>

                <form onSubmit={enviarFormulario} style={estiloFormulario} noValidate>
                    <div style={estiloGrupoInput}>
                        <label htmlFor="login-email" style={estiloLabel}>Correo electrónico</label>
                        <input id="login-email" type="email" name="email" placeholder="juan.perez@ejemplo.com"
                            required autoComplete="email"
                            value={datos.email} onChange={manejarCambio} style={estiloInput} />
                    </div>

                    <div style={estiloGrupoInput}>
                        <label htmlFor="login-password" style={estiloLabel}>Contraseña</label>
                        <input id="login-password" type="password" name="password" placeholder="Escribí tu contraseña"
                            required autoComplete="current-password"
                            value={datos.password} onChange={manejarCambio} style={estiloInput} />
                    </div>

                    {error && <p role="alert" style={estiloError}>{error}</p>}

                    <button type="submit" disabled={enviando}
                        style={{
                            ...estiloBoton,
                            backgroundColor: hoverBoton && !enviando ? '#b71c1c' : '#d32f2f',
                            opacity: enviando ? 0.7 : 1,
                            cursor: enviando ? 'wait' : 'pointer'
                        }}
                        onMouseEnter={() => setHoverBoton(true)} onMouseLeave={() => setHoverBoton(false)}>
                        {enviando ? 'Ingresando…' : 'Iniciar Sesión'}
                    </button>
                </form>

                <p style={estiloFooter}>
                    ¿No tenés cuenta?{' '}
                    <button type="button" onClick={alIrARegistro}
                        style={{ ...estiloEnlace, textDecoration: hoverLink ? 'underline' : 'none' }}
                        onMouseEnter={() => setHoverLink(true)} onMouseLeave={() => setHoverLink(false)}>
                        Registrate acá
                    </button>
                </p>
            </div>
        </div>
    );
};

const estiloContenedorFondo = { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '40px 20px', fontFamily: "'Poppins', sans-serif" };
const estiloTarjeta = { backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #eeeeee' };
const estiloTitulo = { textAlign: 'center', color: '#212121', margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '600' };
const estiloSubtitulo = { textAlign: 'center', color: '#757575', margin: '0 0 32px 0', fontSize: '0.9rem' };
const estiloFormulario = { display: 'flex', flexDirection: 'column', gap: '20px' };
const estiloGrupoInput = { display: 'flex', flexDirection: 'column', gap: '6px' };
const estiloLabel = { color: '#424242', fontSize: '0.9rem', fontWeight: '500' };
const estiloInput = { padding: '12px 16px', borderRadius: '4px', border: '1px solid #e0e0e0', outline: 'none', fontSize: '0.95rem', color: '#212121', backgroundColor: '#fafafa', fontFamily: "'Poppins', sans-serif" };
const estiloError = { color: '#c62828', fontSize: '0.85rem', fontWeight: '500', backgroundColor: '#ffebee', padding: '10px 14px', borderRadius: '4px', margin: 0 };
const estiloBoton = { padding: '14px', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '1rem', marginTop: '4px', transition: 'background-color 0.2s ease', fontFamily: "'Poppins', sans-serif" };
const estiloFooter = { textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#757575' };
const estiloEnlace = { color: '#d32f2f', cursor: 'pointer', fontWeight: '500', background: 'none', border: 'none', padding: 0, fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif" };

export default Login;
