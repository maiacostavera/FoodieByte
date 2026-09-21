const { test: base, expect } = require('@playwright/test');

/**
 * Un recurso externo que no carga (la tipografía de Google, por ejemplo) no es
 * un error de la aplicación: la hoja de estilos define una familia de reserva y
 * la página se ve igual. Pero sin este filtro, correr las pruebas detrás de un
 * proxy, con la red restringida o sin internet hace fallar los trece recorridos
 * por un motivo cosmético, justo cuando más se necesita que pasen.
 */
const HOSTS_EXTERNOS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const esRuidoExterno = (texto) =>
    /Failed to load resource|net::ERR_/i.test(texto) && HOSTS_EXTERNOS.some(h => texto.includes(h));

/**
 * Igual que el `test` de Playwright, pero además falla si la página muestra
 * errores de JavaScript o en la consola durante la prueba.
 */
const test = base.extend({
    page: async ({ page }, usar) => {
        const errores = [];
        // Los mensajes de consola no siempre traen la URL del recurso que falló,
        // así que las fallas de red externas se anotan desde el propio evento.
        const externosCaidos = new Set();
        page.on('requestfailed', (peticion) => {
            const url = peticion.url();
            if (HOSTS_EXTERNOS.some(h => url.includes(h))) externosCaidos.add(url);
        });

        page.on('pageerror', (error) => errores.push(error.message));
        page.on('console', (mensaje) => {
            if (mensaje.type() !== 'error') return;
            const texto = mensaje.text();
            if (esRuidoExterno(texto)) return;
            // Un "Failed to load resource" sin URL, habiendo caído un recurso
            // externo, es el mismo hecho contado sin el detalle.
            if (externosCaidos.size > 0 && /Failed to load resource|net::ERR_/i.test(texto)) return;
            errores.push(texto);
        });

        await usar(page);

        if (externosCaidos.size > 0) {
            console.warn(`  ℹ️  Recursos externos no disponibles (no afectan a la aplicación): ${[...externosCaidos].join(', ')}`);
        }
        expect(errores, 'La página mostró errores en la consola').toEqual([]);
    }
});

/** Inicia sesión desde el formulario, como lo haría una persona. */
async function ingresar(page, { email, password, nombre }) {
    await page.goto('/#/ingresar');
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('button', { name: nombre ? `Menú de ${nombre}` : /^Menú de / })).toBeVisible();
}

async function cerrarSesion(page) {
    await page.getByRole('button', { name: /^Menú de / }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
}

/** Número del pedido a partir del texto "Pedido #126". */
const numeroDePedido = async (locator) => (await locator.textContent()).replace(/\D/g, '');

module.exports = { test, expect, ingresar, cerrarSesion, numeroDePedido };
