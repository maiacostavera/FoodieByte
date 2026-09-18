const { test, expect, ingresar } = require('./ayudas');
const { CUENTAS, WEB } = require('./entorno');

test.describe('Administrador', () => {
    test('ve los indicadores, el gráfico, el ranking y las liquidaciones', async ({ page }) => {
        await ingresar(page, CUENTAS.admin);
        await expect(page.getByRole('heading', { name: 'Hola, Administrador' })).toBeVisible();

        await expect(page.locator('.kpi')).toHaveCount(6);
        await expect(page.locator('.grafico__eje--hoy')).toHaveText('Hoy');
        await expect(page.locator('.ranking__fila')).toHaveCount(5);

        await page.getByRole('tab', { name: 'Liquidaciones' }).click();
        await expect(page.getByRole('heading', { name: 'Liquidación por local' })).toBeVisible();
        await expect(page.locator('.tabla tbody tr')).toHaveCount(7);
        await expect(page.locator('.tabla tfoot')).toContainText('Total');

        await page.getByRole('tab', { name: 'Pedidos' }).click();
        await expect(page.getByRole('heading', { name: 'Pedidos', exact: true })).toBeVisible();
        await expect(page.locator('.tabla tbody tr').first()).toBeVisible();
    });

    test('una cuenta desactivada no puede entrar, y al reactivarla vuelve a poder', async ({ page, browser }) => {
        const nicolas = { email: 'nicolas.alvarez@ejemplo.com', password: 'demo1234' };

        await ingresar(page, CUENTAS.admin);
        await page.getByRole('tab', { name: /Usuarios/ }).click();
        const fila = page.getByRole('row', { name: /Nicolás Álvarez/ });

        await fila.getByRole('button', { name: 'Desactivar' }).click();
        await page.getByRole('dialog', { name: '¿Desactivar la cuenta de Nicolás Álvarez?' })
            .getByRole('button', { name: 'Desactivar' }).click();
        await expect(fila).toContainText('Desactivada');

        // En otro navegador, esa cuenta ya no puede entrar.
        const otra = await browser.newPage();
        await otra.goto(`${WEB}/#/ingresar`);
        await otra.getByLabel('Correo electrónico').fill(nicolas.email);
        await otra.getByLabel('Contraseña').fill(nicolas.password);
        await otra.locator('form').getByRole('button', { name: 'Ingresar' }).click();
        await expect(otra.getByRole('alert')).toContainText('Tu cuenta está desactivada');
        await otra.close();

        await fila.getByRole('button', { name: 'Reactivar' }).click();
        await page.getByRole('dialog', { name: '¿Reactivar la cuenta de Nicolás Álvarez?' })
            .getByRole('button', { name: 'Reactivar' }).click();
        await expect(fila).toContainText('Activa');
    });
});
