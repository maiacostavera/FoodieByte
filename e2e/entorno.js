// Dónde corren las pruebas de punta a punta. Usan sus propios puertos y su
// propia base, así no chocan con `npm run dev` ni tocan los datos de desarrollo.
module.exports = {
    PUERTO_API: 3100,
    PUERTO_WEB: 5174,
    API: 'http://localhost:3100',
    WEB: 'http://localhost:5174',
    BASE_DE_DATOS: process.env.DB_NAME_E2E || 'foodiebyte_e2e',

    // Las cuentas de la demo que cargan los seeders, con contraseñas fijas
    // para las pruebas (se las pasa al servidor la configuración de Playwright).
    CUENTAS: {
        cliente: { email: 'lucia@foodiebyte.com', password: 'demo1234', nombre: 'Lucía Fernández' },
        local: { email: 'lanonna@foodiebyte.com', password: 'demo1234', nombre: 'La Nonna' },
        admin: { email: 'admin@foodiebyte.com', password: 'admin1234', nombre: 'Administrador' }
    }
};
