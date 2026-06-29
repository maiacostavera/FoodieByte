const { sequelize, Plato, Pedido, Usuario } = require('./models');
const http = require('http');
const app = require('express')();
const bodyParser = require('body-parser');
const pedidosRouter = require('./routes/pedidos');

// Configuración rápida del servidor para probar la ruta localmente
app.use(bodyParser.json());
app.use('/api/pedidos', pedidosRouter);

const PORT = 3001; // Usamos 3001 para la prueba para no chocar con el servidor principal
let server;

async function runTests() {
    try {
        console.log("Iniciando pruebas de concurrencia y atomicidad en stock...");
        
        // 1. Sincronizar DB
        await sequelize.sync();
        
        server = app.listen(PORT);
        
        // 2. Preparar datos de prueba
        const usuarioPrueba = await Usuario.create({
            nombre: 'Usuario Prueba',
            email: 'prueba@test.com',
            password: '123',
            rol: 'comprador'
        });

        const platoPrueba = await Plato.create({
            nombre: 'Plato Test de Stock',
            descripcion: 'Un plato para probar transacciones',
            precio: 1000,
            categoria: 'Test',
            stock: 1, // Sólo hay 1 en stock
            vendedorId: usuarioPrueba.id
        });

        console.log(`[OK] Datos de prueba creados. Plato ID: ${platoPrueba.id}, Stock inicial: ${platoPrueba.stock}`);

        // 3. Simular Compra Válida (Lleva el stock a 0)
        console.log("\n--- TEST 1: COMPRA VÁLIDA ---");
        try {
            const resp1 = await fetch(`http://localhost:${PORT}/api/pedidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioIdInput: usuarioPrueba.id,
                    totalInput: 1000,
                    carritoInput: [{ id: platoPrueba.id, nombre: platoPrueba.nombre, cantidad: 1 }]
                })
            });
            const data1 = await resp1.json();
            if (resp1.ok) {
                console.log(`[ÉXITO] ${data1.mensaje}`);
            } else {
                throw new Error(data1.mensaje || "Error en la compra válida");
            }
        } catch (error) {
            console.error("[FALLO] La compra válida falló:", error.message);
        }

        // Verificar stock en base de datos
        let platoActualizado = await Plato.findByPk(platoPrueba.id);
        console.log(`[VERIFICACIÓN] Stock tras compra válida: ${platoActualizado.stock} (Esperado: 0)`);

        // 4. Simular Compra Inválida (Intenta comprar cuando el stock es 0)
        console.log("\n--- TEST 2: COMPRA INVÁLIDA (FALTA DE STOCK) ---");
        try {
            const resp2 = await fetch(`http://localhost:${PORT}/api/pedidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuarioIdInput: usuarioPrueba.id,
                    totalInput: 1000,
                    carritoInput: [{ id: platoPrueba.id, nombre: platoPrueba.nombre, cantidad: 1 }]
                })
            });
            const data2 = await resp2.json();
            if (resp2.ok) {
                console.error("[FALLO] La compra inválida NO fue bloqueada.");
            } else {
                console.log(`[ÉXITO] La compra fue bloqueada correctamente con mensaje: "${data2.mensaje}"`);
            }
        } catch (error) {
            console.log(`[ERROR INESPERADO] ${error.message}`);
        }

        // Verificar stock nuevamente para asegurar que el rollback funcionó / no se alteró nada
        platoActualizado = await Plato.findByPk(platoPrueba.id);
        console.log(`[VERIFICACIÓN] Stock tras intento fallido: ${platoActualizado.stock} (Esperado: 0)`);

        // Contar pedidos para verificar que solo se creó 1
        const countPedidos = await Pedido.count({ where: { usuarioId: usuarioPrueba.id } });
        console.log(`[VERIFICACIÓN] Pedidos creados: ${countPedidos} (Esperado: 1)`);

        // 5. Limpieza
        console.log("\n--- LIMPIEZA ---");
        await Pedido.destroy({ where: { usuarioId: usuarioPrueba.id } });
        await Plato.destroy({ where: { id: platoPrueba.id } });
        await Usuario.destroy({ where: { id: usuarioPrueba.id } });
        console.log("[OK] Datos de prueba eliminados.");

    } catch (err) {
        console.error("Error durante las pruebas:", err);
    } finally {
        if (server) server.close();
        await sequelize.close();
        console.log("Pruebas finalizadas.");
    }
}

runTests();
