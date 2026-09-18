const path = require('path');
const { test, expect, ingresar, cerrarSesion } = require('./ayudas');
const { CUENTAS } = require('./entorno');

const FOTO = path.join(__dirname, '..', 'server', 'seeders', 'fotos', 'empanadas-caprese.webp');

test('un cliente nuevo pide vender, el administrador lo aprueba y publica su primer plato', async ({ page }) => {
    const cuenta = { nombre: 'Mercedes Ibáñez', email: `e2e.${Date.now()}@ejemplo.com`, password: 'secreta123' };

    // Registro: al terminar, lleva al ingreso con el correo ya escrito.
    await page.goto('/#/registro');
    await page.getByLabel('Nombre y apellido').fill(cuenta.nombre);
    await page.getByLabel('Correo electrónico').fill(cuenta.email);
    await page.getByLabel('Contraseña').fill(cuenta.password);
    await page.getByLabel('Acepto los términos y condiciones').check();
    await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page).toHaveURL(/#\/ingresar$/);
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(cuenta.email);
    await page.getByLabel('Contraseña').fill(cuenta.password);
    await page.locator('form').getByRole('button', { name: 'Ingresar' }).click();

    // Solicitud de alta del local.
    await page.getByRole('button', { name: `Menú de ${cuenta.nombre}` }).click();
    await page.getByRole('menuitem', { name: 'Quiero vender en FoodieByte' }).click();
    const solicitud = page.getByRole('dialog', { name: 'Vendé en FoodieByte' });
    await solicitud.getByLabel('Nombre del local').fill('Cantina de Mechi');
    await solicitud.getByLabel('Teléfono de contacto').fill('11 5555-1234');
    await solicitud.getByLabel('Categoría principal').selectOption('Empanadas');
    await solicitud.getByLabel('Dirección del local').fill('Av. Callao 800, CABA');
    await solicitud.getByLabel('¿Qué vas a vender?').fill('Empanadas al horno de pollo, carne y verdura.');
    await solicitud.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.locator('.barra').getByText('Solicitud de local en revisión')).toBeVisible();

    // El administrador la aprueba.
    await cerrarSesion(page);
    await ingresar(page, CUENTAS.admin);
    await page.getByRole('tab', { name: /Usuarios/ }).click();
    const tarjeta = page.locator('.solicitud', { hasText: 'Cantina de Mechi' });
    await tarjeta.getByRole('button', { name: 'Aprobar local' }).click();
    await page.getByRole('dialog', { name: '¿Aprobar Cantina de Mechi?' })
        .getByRole('button', { name: 'Aprobar local' }).click();
    await expect(page.getByText('Cantina de Mechi ya puede vender.')).toBeVisible();
    await expect(tarjeta).toHaveCount(0);

    // Con el rol nuevo entra a su panel y publica un plato con foto.
    await cerrarSesion(page);
    await ingresar(page, cuenta);
    await expect(page).toHaveURL(/#\/panel$/);
    await expect(page.getByText('Cantina de Mechi · Panel del local')).toBeVisible();

    await page.getByRole('tab', { name: 'Mi menú' }).click();
    await page.getByRole('button', { name: 'Agregar plato' }).click();
    const formulario = page.getByRole('dialog', { name: 'Nuevo plato' });
    await formulario.getByLabel('Nombre', { exact: true }).fill('Empanadas de Pollo x6');
    await formulario.getByLabel('Descripción').fill('Pollo, morrón y cebolla de verdeo, al horno.');
    await formulario.getByLabel('Precio ($)').fill('15900');
    await formulario.getByLabel('Stock').fill('20');
    await formulario.getByLabel('Categoría').selectOption('Empanadas');
    await formulario.getByLabel('Elegir una foto').setInputFiles(FOTO);
    await expect(formulario.getByAltText('Vista previa de la foto')).toBeVisible();
    await formulario.getByRole('button', { name: 'Publicar plato' }).click();
    await expect(page.getByText('Plato publicado.')).toBeVisible();
    await expect(page.getByRole('row', { name: /Empanadas de Pollo x6/ })).toBeVisible();

    // Aparece en el catálogo público con su foto.
    await page.goto('/');
    const tarjetaDelPlato = page.locator('.tarjeta-plato', { hasText: 'Empanadas de Pollo x6' });
    await expect(tarjetaDelPlato).toContainText('Cantina de Mechi');
    await expect(tarjetaDelPlato.locator('img')).toHaveAttribute('src', /\/uploads\/platos\//);

    // Lo borra: el plato sale del catálogo y su foto se elimina del disco.
    await page.goto('/#/panel');
    await page.getByRole('tab', { name: 'Mi menú' }).click();
    await page.getByRole('button', { name: 'Eliminar Empanadas de Pollo x6' }).click();
    await page.getByRole('dialog', { name: '¿Eliminar “Empanadas de Pollo x6”?' })
        .getByRole('button', { name: 'Eliminar plato' }).click();
    await expect(page.getByText('Plato eliminado.')).toBeVisible();
    await expect(page.getByRole('row', { name: /Empanadas de Pollo x6/ })).toHaveCount(0);
});
