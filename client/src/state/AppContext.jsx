import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const FoodieContext = createContext();

const AppProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [carrito, setCarrito] = useState([]);

    useEffect(() => {
        const nombreGuardado = localStorage.getItem('nombreUsuario');
        const rolGuardado = localStorage.getItem('rolUsuario');
        const idGuardado = localStorage.getItem('userId');
        if (nombreGuardado && token) {
            setUsuario({ id: idGuardado, nombre: nombreGuardado, rol: rolGuardado });
        }
    }, [token]);

    const login = (datosUsuario, tokenRecibido) => {
        localStorage.setItem('token', tokenRecibido);
        localStorage.setItem('nombreUsuario', datosUsuario.nombre);
        localStorage.setItem('rolUsuario', datosUsuario.rol);
        localStorage.setItem('userId', datosUsuario.id);
        setToken(tokenRecibido);
        setUsuario(datosUsuario);
    };

    const logout = () => {
        localStorage.clear();
        setToken(null);
        setUsuario(null);
        setCarrito([]);
    };

    const agregarAlCarrito = (plato, cantidadSeleccionada = 1) => {
        setCarrito((prev) => {
            const existe = prev.find(item => item.id === plato.id);
            if (existe) {
                return prev.map(item =>
                    item.id === plato.id ? { ...item, cantidad: item.cantidad + cantidadSeleccionada } : item
                );
            }
            return [...prev, { ...plato, cantidad: cantidadSeleccionada }];
        });
    };

    const eliminarDelCarrito = (id) => {
        setCarrito((prev) => prev.filter(item => item.id !== id));
    };

    const disminuirDelCarrito = (id) => {
        setCarrito((prev) => {
            const existe = prev.find(item => item.id === id);
            if (existe && existe.cantidad > 1) {
                return prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item);
            }
            return prev.filter(item => item.id !== id);
        });
    };

    const vaciarCarrito = () => setCarrito([]);

    const enviarPedidoAlServidor = async () => {
        if (carrito.length === 0) {
            alert("No hay productos en el carrito.");
            return false;
        }

        const totalCalculado = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

        try {
            const res = await axios.post('http://localhost:3000/api/pedidos', {
                productos: carrito,
                total: totalCalculado
            }, {
                headers: { 'authorization': `Bearer ${token}` }
            });

            alert(res.data.mensaje);
            vaciarCarrito();
            return true;
        } catch (err) {
            alert(err.response?.data?.mensaje || "Error al procesar la compra.");
            return false;
        }
    };

    return (
        <FoodieContext.Provider value={{
            usuario, token, login, logout,
            carrito, agregarAlCarrito, eliminarDelCarrito, disminuirDelCarrito, vaciarCarrito,
            enviarPedidoAlServidor
        }}>
            {children}
        </FoodieContext.Provider>
    );
};

export default AppProvider;
