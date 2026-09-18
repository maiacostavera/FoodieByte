const { test, expect, ingresar } = require('./ayudas');
const { CUENTAS } = require('./entorno');

test('en el celular se puede buscar, agregar y abrir el carrito sin que nada se desborde', async ({ page }) => {
    await ingresar(page, CUENTAS.cliente);
    await page.goto('/');

    await expect(page.getByRole('searchbox', { name: 'Buscar en el menú' })).toBeVisible();

    // Una sola columna de tarjetas, que ocupa casi todo el ancho.
    const primera = await page.locator('.grilla-platos .tarjeta-plato').first().boundingBox();
    const ancho = page.viewportSize().width;
    expect(primera.width).toBeGreaterThan(ancho * 0.8);

    await page.getByRole('button', { name: 'Agregar Buddha Bowl al carrito' }).click();
    await page.getByRole('button', { name: /Abrir el carrito/ }).click();
    const carrito = page.getByRole('dialog', { name: 'Tu pedido' });
    await expect(carrito.getByText('Buddha Bowl')).toBeVisible();
    expect((await carrito.boundingBox()).width).toBeGreaterThanOrEqual(ancho - 1);

    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desborde).toBeLessThanOrEqual(0);
});
