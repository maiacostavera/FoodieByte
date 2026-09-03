import axios from 'axios';

// La URL de la API sale del entorno (.env), no está escrita en el código:
// así el mismo build sirve para desarrollo y para producción.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    timeout: 15000
});

// Adjunta el token a cada request sin que cada componente tenga que acordarse.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Callback que AppContext registra para cerrar la sesión cuando el token vence.
let alExpirarSesion = null;
export const registrarManejadorDeSesion = (fn) => { alExpirarSesion = fn; };

api.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        // Un 401 con token guardado significa sesión vencida o revocada:
        // antes esto fallaba en silencio y el usuario seguía "logueado".
        if (error.response?.status === 401 && localStorage.getItem('token')) {
            if (alExpirarSesion) alExpirarSesion();
        }
        return Promise.reject(error);
    }
);

/** Extrae el mensaje que devuelve la API, con un respaldo legible. */
export const mensajeDeError = (error, respaldo = 'Ocurrió un error inesperado.') => {
    if (error.response?.data?.mensaje) return error.response.data.mensaje;
    if (error.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder.';
    if (!error.response) return 'No se pudo conectar con el servidor. ¿Está corriendo el backend?';
    return respaldo;
};

export default api;
