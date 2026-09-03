import { createContext, useContext } from 'react';

export const FoodieContext = createContext(null);

/** Acceso al estado global de la aplicación (sesión y carrito). */
export const useFoodie = () => {
    const contexto = useContext(FoodieContext);
    if (!contexto) {
        throw new Error('useFoodie debe usarse dentro de <AppProvider>.');
    }
    return contexto;
};
