import { useState, useEffect, useCallback, useMemo } from 'react';
import api, { mensajeDeError, registrarManejadorDeSesion } from '../api/client';
import { FoodieContext } from './FoodieContext';

const CLAVE_USUARIO = 'foodie_usuario';
const CLAVE_TOKEN = 'token';
const CLAVE_CARRITO = 'foodie_carrito';

const leerJSON = (clave) => {
    try {
        const valor = localStorage.getItem(clave);
        return valor ? JSON.parse(valor) : null;
    } catch {
        return null;
    }
};

const AppProvider = ({ children }) => {
    // El usuario se lee del almacenamiento en la inicialización del estado,
    // no dentro de un efecto: evita el parpadeo de "sesión cerrada" al recargar.
    const [usuario, setUsuario] = useState(() => leerJSON(CLAVE_USUARIO));
    const [token, setToken] = useState(() => localStorage.getItem(CLAVE_TOKEN));
    const [carrito, setCarrito] = useState(() => leerJSON(CLAVE_CARRITO) || []);
    const [aviso, setAviso] = useState(null);

    /** Muestra un mensaje temporal en pantalla (reemplaza a los alert()). */
    const mostrarAviso = useCallback((texto, tipo = 'info') => {
        setAviso({ texto, tipo, id: Date.now() });
    }, []);

    const cerrarAviso = useCallback(() => setAviso(null), []);

    const login = useCallback((datosUsuario, tokenRecibido) => {
        localStorage.setItem(CLAVE_TOKEN, tokenRecibido);
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(datosUsuario));
        setToken(tokenRecibido);
        setUsuario(datosUsuario);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_USUARIO);
        localStorage.removeItem(CLAVE_CARRITO);
        setToken(null);
        setUsuario(null);
        setCarrito([]);
    }, []);

    // Si la API responde 401 (token vencido o revocado), se cierra la sesión
    // y se avisa, en lugar de dejar al usuario con una sesión muerta.
    useEffect(() => {
        registrarManejadorDeSesion(() => {
            logout();
            mostrarAviso('Tu sesión expiró. Iniciá sesión nuevamente.', 'error');
        });
    }, [logout, mostrarAviso]);

    // Revalida contra el servidor la sesión guardada en el navegador: si el
    // admin cambió el rol del usuario, el frontend se entera al recargar.
    useEffect(() => {
        if (!token) return;
        let cancelado = false;

        api.get('/usuarios/perfil')
            .then(({ data }) => {
                if (cancelado) return;
                const actualizado = { id: data.id, nombre: data.nombre, rol: data.rol, email: data.email };
                localStorage.setItem(CLAVE_USUARIO, JSON.stringify(actualizado));
                setUsuario(actualizado);
            })
            .catch(() => { /* el interceptor ya maneja el 401 */ });

        return () => { cancelado = true; };
    }, [token]);

    // El carrito sobrevive a un F5 accidental.
    useEffect(() => {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    }, [carrito]);

    const agregarAlCarrito = useCallback((plato, cantidadSeleccionada = 1) => {
        setCarrito((prev) => {
            const existente = prev.find(item => item.id === plato.id);
            const yaEnCarrito = existente ? existente.cantidad : 0;
            const stockDisponible = Number(plato.stock ?? 0);

            // No dejamos armar un carrito que el backend va a rechazar por stock.
            if (yaEnCarrito + cantidadSeleccionada > stockDisponible) {
                mostrarAviso(
                    `Solo quedan ${stockDisponible} unidades de "${plato.nombre}".`,
                    'error'
                );
                return prev;
            }

            mostrarAviso(`"${plato.nombre}" se agregó al carrito.`, 'exito');

            if (existente) {
                return prev.map(item =>
                    item.id === plato.id
                        ? { ...item, cantidad: item.cantidad + cantidadSeleccionada }
                        : item
                );
            }
            return [...prev, { ...plato, cantidad: cantidadSeleccionada }];
        });
    }, [mostrarAviso]);

    const disminuirDelCarrito = useCallback((id) => {
        setCarrito((prev) => {
            const existente = prev.find(item => item.id === id);
            if (existente && existente.cantidad > 1) {
                return prev.map(item =>
                    item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
                );
            }
            return prev.filter(item => item.id !== id);
        });
    }, []);

    const eliminarDelCarrito = useCallback((id) => {
        setCarrito((prev) => prev.filter(item => item.id !== id));
    }, []);

    const vaciarCarrito = useCallback(() => setCarrito([]), []);

    const totalCarrito = useMemo(
        () => carrito.reduce((acc, item) => acc + Number(item.precio) * item.cantidad, 0),
        [carrito]
    );

    const cantidadEnCarrito = useMemo(
        () => carrito.reduce((acc, item) => acc + item.cantidad, 0),
        [carrito]
    );

    const enviarPedidoAlServidor = useCallback(async () => {
        if (carrito.length === 0) {
            mostrarAviso('No hay productos en el carrito.', 'error');
            return false;
        }

        try {
            // Solo se manda id y cantidad: los precios los pone el servidor.
            const { data } = await api.post('/pedidos', {
                productos: carrito.map(item => ({ id: item.id, cantidad: item.cantidad }))
            });
            mostrarAviso(data.mensaje, 'exito');
            vaciarCarrito();
            return true;
        } catch (err) {
            mostrarAviso(mensajeDeError(err, 'No se pudo procesar la compra.'), 'error');
            return false;
        }
    }, [carrito, mostrarAviso, vaciarCarrito]);

    const valor = useMemo(() => ({
        usuario, token, login, logout,
        carrito, totalCarrito, cantidadEnCarrito,
        agregarAlCarrito, eliminarDelCarrito, disminuirDelCarrito, vaciarCarrito,
        enviarPedidoAlServidor,
        aviso, mostrarAviso, cerrarAviso
    }), [
        usuario, token, login, logout,
        carrito, totalCarrito, cantidadEnCarrito,
        agregarAlCarrito, eliminarDelCarrito, disminuirDelCarrito, vaciarCarrito,
        enviarPedidoAlServidor,
        aviso, mostrarAviso, cerrarAviso
    ]);

    return <FoodieContext.Provider value={valor}>{children}</FoodieContext.Provider>;
};

export default AppProvider;
