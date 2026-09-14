// Largos máximos de los formularios. Son los mismos que valida el servidor en
// server/config/limites.js: acá solo evitan que el usuario escriba de más y se
// entere recién al enviar.
export const LIMITES = {
    nombre: 100,
    email: 255,
    password: 72,
    nombreLocal: 100,
    telefono: 30,
    direccion: 200,
    descripcion: 1000,
    tiempoPrep: 50,
    pregunta: 500,
    stock: 100
};
