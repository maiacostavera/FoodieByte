const { test, expect, ingresar, cerrarSesion, numeroDePedido } = require('./ayudas');
const { CUENTAS } = require('./entorno');

test.describe('Compra y comandas', () => {
    test('un cliente compra, el catálogo se actualiza y el local rechaza: el stock vuelve', async ({ page }) => {
        await ingresar(page, CUENTAS.cliente);
        await page.goto('/');

        const tarjeta = page.locator('.tarjeta-plato', { hasText: 'Pizza Especial de la Casa' });
        await expect(tarjeta.getByText('¡Quedan 4!')).toBeVisible();
        await tarjeta.getByRole('button', { name: 'Pizza Especial de la Casa', exact: true }).click();

        // Dos unidades desde la ficha.
        await page.getByRole('button', { name: 'Sumar una unidad' }).click();
        await page.getByRole('button', { name: /^Agregar ·/ }).click();
        await expect(page.getByText('"Pizza Especial de la Casa" se agregó al carrito.')).toBeVisible();

        await page.getByRole('button', { name: /Abrir el carrito/ }).click();
        const carrito = page.getByRole('dialog', { name: 'Tu pedido' });
        await expect(carrito.getByText('Pizza Especial de la Casa')).toBeVisible();

        // Sin dirección de entrega no deja confirmar.
        await carrito.getByRole('button', { name: 'Confirmar pedido' }).click();
        await expect(carrito.getByText('Indicá la dirección de entrega: calle y número.')).toBeVisible();
        await carrito.getByLabel('Dirección de entrega').fill('Gorriti 4520, 3° B, Palermo');
        await carrito.getByLabel(/Aclaraciones para el local/).fill('Tocar timbre 3B');
        await carrito.getByRole('button', { name: 'Confirmar pedido' }).click();

        // Queda primero en "Mis pedidos", pendiente y con la dirección.
        await expect(page).toHaveURL(/#\/pedidos$/);
        const pedido = page.locator('.pedido').first();
        await expect(pedido).toContainText('2 × Pizza Especial de la Casa');
        await expect(pedido).toContainText('Gorriti 4520, 3° B, Palermo');
        await expect(pedido.locator('.pedido__cabecera .estado')).toHaveText('Pendiente');
        const numero = await numeroDePedido(pedido.locator('.pedido__numero'));

        // El catálogo ya muestra el stock nuevo, sin recargar la página.
        await page.getByRole('button', { name: 'Volver al menú' }).click();
        await expect(page.locator('.tarjeta-plato', { hasText: 'Pizza Especial de la Casa' }).getByText('¡Quedan 2!')).toBeVisible();

        // El local rechaza la comanda y las unidades vuelven al stock.
        await cerrarSesion(page);
        await ingresar(page, CUENTAS.local);
        await expect(page).toHaveURL(/#\/panel$/);
        await page.getByRole('tab', { name: /Comandas/ }).click();

        const comanda = page.locator('.comanda', { hasText: `Pedido #${numero}` });
        await expect(comanda).toContainText('Lucía Fernández');
        await expect(comanda).toContainText('Gorriti 4520, 3° B, Palermo');
        await expect(comanda).toContainText('Tocar timbre 3B');
        await comanda.getByRole('button', { name: 'Rechazar' }).click();
        await page.getByRole('dialog', { name: `¿Rechazar el pedido #${numero}?` })
            .getByRole('button', { name: 'Rechazar pedido' }).click();
        await expect(page.getByText(`Pedido #${numero} rechazado`)).toBeVisible();
        await expect(comanda).toHaveCount(0);

        await page.getByRole('tab', { name: 'Mi menú' }).click();
        await expect(page.getByRole('row', { name: /Pizza Especial de la Casa/ })).toContainText('Quedan 4');
    });

    test('el local despacha un pedido y el cliente lo ve enviado', async ({ page }) => {
        await ingresar(page, CUENTAS.local);
        await page.getByRole('tab', { name: /Comandas/ }).click();

        const comanda = page.locator('.comanda', { hasText: 'Lucía Fernández' }).first();
        const numero = await numeroDePedido(comanda.locator('.comanda__numero'));
        await comanda.getByRole('button', { name: 'Marcar enviado' }).click();
        await page.getByRole('dialog', { name: `¿Marcar el pedido #${numero} como enviado?` })
            .getByRole('button', { name: 'Marcar enviado' }).click();
        await expect(page.getByText(`Pedido #${numero} marcado como enviado.`)).toBeVisible();

        await page.getByRole('button', { name: 'Enviados', exact: true }).click();
        await expect(page.getByRole('row', { name: new RegExp(`#${numero}\\b`) })).toContainText('Enviado');

        await cerrarSesion(page);
        await ingresar(page, CUENTAS.cliente);
        await page.goto('/#/pedidos');
        const pedido = page.locator('.pedido', { hasText: `Pedido #${numero}` });
        await expect(pedido.locator('.pedido__cabecera .estado')).toHaveText('Enviado');
    });

    test('el local responde una consulta desde la ficha del plato', async ({ page }) => {
        await ingresar(page, CUENTAS.local);
        await page.goto('/');
        await page.getByRole('button', { name: 'Calzone de Jamón y Queso', exact: true }).click();

        const consulta = page.locator('.consulta', { hasText: '¿Viene cortado en porciones o entero?' });
        await consulta.getByLabel(/Tu respuesta/).fill('Viene cortado en cuatro porciones.');
        await consulta.getByRole('button', { name: 'Responder' }).click();
        await expect(page.getByText('Respuesta publicada.')).toBeVisible();
        await expect(consulta.getByText('Viene cortado en cuatro porciones.')).toBeVisible();
    });
});
