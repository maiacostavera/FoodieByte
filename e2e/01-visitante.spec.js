const { test, expect, ingresar } = require('./ayudas');
const { CUENTAS } = require('./entorno');

test.describe('Visitante, sin sesión', () => {
    test('la portada muestra el catálogo completo de la demo', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { level: 1 })).toContainText('La mejor comida');
        await expect(page.locator('.portada__cifras strong').first()).toHaveText('45');
        await expect(page.locator('.grilla-platos .tarjeta-plato')).toHaveCount(45);
        await expect(page.getByRole('group', { name: 'Locales' }).getByRole('button')).toHaveCount(7);

        // Nada se sale del ancho de la pantalla.
        const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(desborde).toBeLessThanOrEqual(0);
    });

    test('busca, filtra por categoría y por local, y ordena por precio', async ({ page }) => {
        await page.goto('/');
        const tarjetas = page.locator('.grilla-platos .tarjeta-plato');

        await page.getByRole('searchbox', { name: 'Buscar en el menú' }).fill('pizza');
        await expect(page.getByRole('heading', { name: 'Resultados para “pizza”' })).toBeVisible();
        await expect(tarjetas.first()).toContainText(/pizza/i);
        expect(await tarjetas.count()).toBeLessThan(45);

        await page.getByRole('button', { name: 'Quitar filtros' }).click();
        await page.getByRole('group', { name: 'Categorías' }).getByRole('button', { name: 'Postres' }).click();
        await expect(page.getByRole('heading', { name: 'Postres', level: 2 })).toBeVisible();
        await expect(tarjetas).toHaveCount(7);

        await page.getByRole('button', { name: 'Quitar filtros' }).click();
        await page.getByRole('group', { name: 'Locales' }).getByRole('button', { name: /Barrio Burger/ }).click();
        await expect(tarjetas).toHaveCount(6);

        await page.getByLabel('Ordenar platos').selectOption('precio-asc');
        const precios = (await tarjetas.locator('.tarjeta-plato__precio').allTextContents())
            .map(texto => Number(texto.replace(/\D/g, '')));
        expect(precios).toEqual([...precios].sort((a, b) => a - b));
    });

    test('la ficha de un plato es pública y el botón atrás vuelve al menú', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Pizza Margherita', exact: true }).click();

        await expect(page).toHaveURL(/#\/plato\/\d+$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Pizza Margherita' })).toBeVisible();
        await expect(page.getByText('¿La masa es de harina común o tienen opción integral?')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Más de Pizzería La Nonna' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ingresá para pedir' })).toBeVisible();

        await page.goBack();
        await expect(page.locator('#catalogo-menu')).toBeVisible();
    });

    test('agregar al carrito sin sesión lleva al ingreso', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Agregar Pizza Margherita al carrito' }).click();
        await expect(page).toHaveURL(/#\/ingresar$/);
        await expect(page.getByText('Para armar tu pedido, ingresá a tu cuenta.')).toBeVisible();
    });

    test('una pantalla privada pide ingresar y después vuelve a ella', async ({ page }) => {
        await page.goto('/#/pedidos');
        await expect(page).toHaveURL(/#\/ingresar$/);
        await ingresar(page, CUENTAS.cliente);
        await expect(page).toHaveURL(/#\/pedidos$/);
        await expect(page.getByRole('heading', { name: 'Mis pedidos' })).toBeVisible();
    });

    test('el pie abre las preguntas frecuentes', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Preguntas frecuentes' }).click();
        const ventana = page.getByRole('dialog', { name: 'Preguntas frecuentes' });
        await expect(ventana).toBeVisible();

        await ventana.getByText('¿Cómo pago?').click();
        await expect(ventana.getByText('El pago se coordina con cada local')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(ventana).toBeHidden();
    });
});
