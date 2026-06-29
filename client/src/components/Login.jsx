import React, { useState, useContext } from 'react';
import axios from 'axios';
import { FoodieContext } from '../state/AppContext';

const Login = ({ alIrARegistro, alCerrar }) => {
    const { login } = useContext(FoodieContext);
    const [datos, setDatos] = useState({ email: '', password: '' });
    const [hoverBoton, setHoverBoton] = useState(false);
    const [hoverLink, setHoverLink] = useState(false);

    const manejarCambio = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });

    const enviarFormulario = async (e) => {
        e.preventDefault();

        try {
            const res = await axios.post('http://localhost:3000/api/usuarios/login', datos);

            if (res.data && res.data.token && res.data.usuario) {
                login(res.data.usuario, res.data.token);
                if (alCerrar) alCerrar();
            } else {
                alert("Error en la estructura de datos del servidor.");
            }
        } catch (err) {
            console.error(err);
            alert("Credenciales incorrectas. Verifica tu correo y contraseña.");
        }
    };

    return (
        <div style={estiloContenedorFondo}>
            <div style={estiloTarjeta}>
                <h2 style={estiloTitulo}>Inicio de Sesión</h2>
                <p style={estiloSubtitulo}>Ingresa tus credenciales para acceder a la plataforma</p>

                <form onSubmit={enviarFormulario} style={estiloFormulario}>
                    <div style={estiloGrupoInput}>
                        <label style={estiloLabel}>Correo electrónico</label>
                        <input type="email" name="email" placeholder="juan.perez@ejemplo.com" required
                            value={datos.email} onChange={manejarCambio} style={estiloInput} />
                    </div>

                    <div style={estiloGrupoInput}>
                        <label style={estiloLabel}>Contraseña</label>
                        <input type="password" name="password" placeholder="Escribe tu contraseña" required
                            value={datos.password} onChange={manejarCambio} style={estiloInput} />
                    </div>

                    <button type="submit"
                        style={hoverBoton ? { ...estiloBoton, backgroundColor: '#b71c1c' } : estiloBoton}
                        onMouseEnter={() => setHoverBoton(true)} onMouseLeave={() => setHoverBoton(false)}>
                        Iniciar Sesión
                    </button>
                </form>

                <p style={estiloFooter}>
                    ¿No tienes cuenta?{' '}
                    <span onClick={alIrARegistro}
                        style={hoverLink ? { ...estiloEnlace, textDecoration: 'underline' } : estiloEnlace}
                        onMouseEnter={() => setHoverLink(true)} onMouseLeave={() => setHoverLink(false)}>
                        Regístrate aquí
                    </span>
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
const estiloInput = { padding: '12px 16px', borderRadius: '4px', border: '1px solid #e0e0e0', outline: 'none', fontSize: '0.95rem', color: '#212121', backgroundColor: '#fafafa', transition: 'border-color 0.2s ease', fontFamily: "'Poppins', sans-serif" };
const estiloBoton = { padding: '14px', backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', marginTop: '4px', transition: 'background-color 0.2s ease', fontFamily: "'Poppins', sans-serif" };
const estiloFooter = { textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#757575' };
const estiloEnlace = { color: '#d32f2f', cursor: 'pointer', fontWeight: '500', transition: 'text-decoration 0.2s ease' };

export default Login;
