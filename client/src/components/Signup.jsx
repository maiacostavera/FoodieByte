import { useState } from 'react';
import api, { mensajeDeError } from '../api/client';
import { useFoodie } from '../state/FoodieContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Signup({ alIrALogin }) {
    const { mostrarAviso } = useFoodie();
    const [datos, setDatos] = useState({ nombre: '', email: '', password: '' });
    const [errores, setErrores] = useState({});
    const [terminos, setTerminos] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [hoverBoton, setHoverBoton] = useState(false);
    const [hoverLink, setHoverLink] = useState(false);

    const validar = () => {
        const nuevosErrores = {};
        if (!datos.nombre.trim() || datos.nombre.trim().length < 2) {
            nuevosErrores.nombre = 'El nombre debe tener al menos 2 caracteres.';
        }
        if (!EMAIL_REGEX.test(datos.email)) {
            nuevosErrores.email = 'Ingresá un email válido.';
        }
        if (datos.password.length < 6) {
            nuevosErrores.password = 'La contraseña debe tener al menos 6 caracteres.';
        }
        if (!terminos) {
            nuevosErrores.terminos = 'Debés aceptar los términos y condiciones.';
        }
        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const actualizar = (campo, valor) => {
        setDatos(prev => ({ ...prev, [campo]: valor }));
        if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: undefined }));
    };

    const manejarEnvio = async (e) => {
        e.preventDefault();
        if (!validar()) return;

        setEnviando(true);
        try {
            const { data } = await api.post('/usuarios/register', datos);
            mostrarAviso(data.mensaje, 'exito');
            alIrALogin();
        } catch (err) {
            setErrores({ general: mensajeDeError(err, 'No se pudo crear la cuenta.') });
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div style={estiloContenedorFondo}>
            <div style={estiloTarjeta}>
                <h2 style={estiloTitulo}>Crear Cuenta</h2>
                <p style={estiloSubtitulo}>Completá tus datos para unirte a la plataforma</p>

                <form onSubmit={manejarEnvio} style={estiloFormulario} noValidate>
                    <div style={estiloGrupoInput}>
                        <label htmlFor="alta-nombre" style={estiloLabel}>Nombre completo</label>
                        <input id="alta-nombre" type="text" placeholder="Ej. Juan Pérez" autoComplete="name"
                            value={datos.nombre} onChange={e => actualizar('nombre', e.target.value)} style={estiloInput} />
                        {errores.nombre && <span style={estiloError}>{errores.nombre}</span>}
                    </div>

                    <div style={estiloGrupoInput}>
                        <label htmlFor="alta-email" style={estiloLabel}>Correo electrónico</label>
                        <input id="alta-email" type="email" placeholder="juan.perez@ejemplo.com" autoComplete="email"
                            value={datos.email} onChange={e => actualizar('email', e.target.value)} style={estiloInput} />
                        {errores.email && <span style={estiloError}>{errores.email}</span>}
                    </div>

                    <div style={estiloGrupoInput}>
                        <label htmlFor="alta-password" style={estiloLabel}>Contraseña</label>
                        <input id="alta-password" type="password" placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                            value={datos.password} onChange={e => actualizar('password', e.target.value)} style={estiloInput} />
                        {errores.password && <span style={estiloError}>{errores.password}</span>}
                    </div>

                    <div style={{ marginTop: '4px' }}>
                        <label style={estiloCheckboxLabel}>
                            <input type="checkbox" checked={terminos}
                                onChange={(e) => setTerminos(e.target.checked)} style={{ cursor: 'pointer' }} />
                            Acepto los términos y condiciones
                        </label>
                        {errores.terminos && <span style={estiloError}>{errores.terminos}</span>}
                    </div>

                    {errores.general && <p role="alert" style={estiloErrorGeneral}>{errores.general}</p>}

                    <button type="submit" disabled={enviando}
                        style={{
                            ...estiloBoton,
                            backgroundColor: hoverBoton && !enviando ? '#b71c1c' : '#d32f2f',
                            opacity: enviando ? 0.7 : 1,
                            cursor: enviando ? 'wait' : 'pointer'
                        }}
                        onMouseEnter={() => setHoverBoton(true)} onMouseLeave={() => setHoverBoton(false)}>
                        {enviando ? 'Creando cuenta…' : 'Crear Cuenta'}
                    </button>
                </form>

                <p style={estiloFooter}>
                    ¿Ya tenés una cuenta?{' '}
                    <button type="button" onClick={alIrALogin}
                        style={{ ...estiloEnlace, textDecoration: hoverLink ? 'underline' : 'none' }}
                        onMouseEnter={() => setHoverLink(true)} onMouseLeave={() => setHoverLink(false)}>
                        Iniciá sesión acá
                    </button>
                </p>
            </div>
        </div>
    );
}

const estiloContenedorFondo = { display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '40px 20px', fontFamily: "'Poppins', sans-serif" };
const estiloTarjeta = { backgroundColor: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '420px', padding: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #eeeeee' };
const estiloTitulo = { textAlign: 'center', color: '#212121', margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: '600' };
const estiloSubtitulo = { textAlign: 'center', color: '#757575', margin: '0 0 32px 0', fontSize: '0.9rem' };
const estiloFormulario = { display: 'flex', flexDirection: 'column', gap: '20px' };
const estiloGrupoInput = { display: 'flex', flexDirection: 'column', gap: '6px' };
const estiloLabel = { color: '#424242', fontSize: '0.9rem', fontWeight: '500' };
const estiloInput = { padding: '12px 16px', borderRadius: '4px', border: '1px solid #e0e0e0', outline: 'none', fontSize: '0.95rem', color: '#212121', backgroundColor: '#fafafa', fontFamily: "'Poppins', sans-serif" };
const estiloError = { color: '#d32f2f', fontSize: '0.8rem', fontWeight: '500' };
const estiloErrorGeneral = { color: '#c62828', fontSize: '0.85rem', fontWeight: '500', backgroundColor: '#ffebee', padding: '10px 14px', borderRadius: '4px', margin: 0 };
const estiloCheckboxLabel = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#757575', cursor: 'pointer' };
const estiloBoton = { padding: '14px', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '1rem', marginTop: '4px', transition: 'background-color 0.2s ease', fontFamily: "'Poppins', sans-serif" };
const estiloFooter = { textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#757575' };
const estiloEnlace = { color: '#d32f2f', cursor: 'pointer', fontWeight: '500', background: 'none', border: 'none', padding: 0, fontSize: '0.9rem', fontFamily: "'Poppins', sans-serif" };

export default Signup;
