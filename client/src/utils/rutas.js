import { useMemo, useSyncExternalStore } from 'react';

// Navegación con el hash de la URL (#/plato/12, #/pedidos, #/panel…): cada
// pantalla tiene su dirección y el botón "atrás" del navegador funciona, sin
// sumar una librería de rutas.

const suscribir = (avisar) => {
    window.addEventListener('hashchange', avisar);
    return () => window.removeEventListener('hashchange', avisar);
};

const leerHash = () => window.location.hash;

const interpretar = (hash) => {
    const [seccion = '', id] = hash.replace(/^#\/?/, '').split('/');
    return { seccion: seccion || 'inicio', id: id ? Number(id) : null };
};

/** Pantalla actual: { seccion: 'inicio' | 'plato' | 'pedidos' | 'panel' | 'ingresar' | 'registro', id }. */
export const useRuta = () => {
    const hash = useSyncExternalStore(suscribir, leerHash);
    return useMemo(() => interpretar(hash), [hash]);
};

export const RUTAS = {
    inicio: '#/',
    plato: (id) => `#/plato/${id}`,
    pedidos: '#/pedidos',
    panel: '#/panel',
    ingresar: '#/ingresar',
    registro: '#/registro'
};

export const navegar = (destino) => {
    if (window.location.hash !== destino) window.location.hash = destino;
};
