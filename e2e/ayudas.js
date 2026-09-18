const { test: base, expect } = require('@playwright/test');

/**
 * Igual que el `test` de Playwright, pero además falla si la página muestra
 * errores de JavaScript o en la consola durante la prueba.
 */
const test = base.extend({
    page: async ({ page }, usar) => {
        const errores = [];
        page.on('pageerror', (error) => errores.push(error.message));
        page.on('console', (mensaje) => { if (mensaje.type() === 'error') errores.push(mensaje.text()); });
        await usar(page);
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
