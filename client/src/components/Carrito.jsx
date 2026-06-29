import React, { useContext } from 'react';
import { FoodieContext } from '../state/AppContext';

function Carrito({ alCerrar }) {
    const { carrito, agregarAlCarrito, disminuirDelCarrito, eliminarDelCarrito, enviarPedidoAlServidor, usuario } = useContext(FoodieContext);

    const totalCalculado = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    const procesarCompra = async () => {
        if (!usuario) {
            alert("Debes iniciar sesión para finalizar la compra.");
            return;
        }

        if (usuario.rol === 'vendedor' || usuario.rol === 'admin') {
            alert("Los vendedores y administradores no pueden realizar compras.");
            return;
        }

        const exito = await enviarPedidoAlServidor();
        
        if (exito && alCerrar) {
            alCerrar(); 
        }
    };

    return (
        <div style={estiloContenedorFondo} onClick={alCerrar}>
            <div style={estiloBandejaCarrito} onClick={e => e.stopPropagation()}>
                
                {/* CABECERA */}
                <div style={estiloCabecera}>
                    <h3 style={estiloTitulo}>Tu Pedido</h3>
                    <button onClick={alCerrar} style={estiloBotonCerrar}>✕</button>
                </div>

                {/* LISTADO DE PRODUCTOS */}
                <div style={estiloListaProductos}>
                    {carrito.length === 0 ? (
                        <div style={estiloVacio}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <p style={{ fontWeight: '500', margin: 0, color: '#757575' }}>No hay platos en tu carrito.</p>
                        </div>
                    ) : (
                        carrito.map(item => (
                            <div key={item.id} style={estiloItemProducto}>
                                <div style={{ flex: 1, paddingRight: '12px' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#212121', fontSize: '1rem' }}>{item.nombre}</h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#757575' }}>${item.precio}</p>
                                </div>
                                <div style={estiloControlesCantidad}>
                                    <button onClick={() => disminuirDelCarrito(item.id)} style={estiloBotonCantidad}>-</button>
                                    <span style={estiloTextoCantidad}>{item.cantidad}</span>
                                    <button onClick={() => agregarAlCarrito(item)} style={estiloBotonCantidad}>+</button>
                                </div>
                                <div style={estiloColumnaPrecio}>
                                    <span style={{ fontWeight: '600', color: '#212121', fontSize: '1rem' }}>${item.precio * item.cantidad}</span>
                                    <button onClick={() => eliminarDelCarrito(item.id)} style={estiloBotonEliminar}>Eliminar</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FOOTER: TOTAL Y CONFIRMAR */}
                <div style={estiloFooter}>
                    <div style={estiloResumen}>
                        <span style={{ fontSize: '1rem', color: '#757575', fontWeight: '500' }}>Total:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#212121' }}>${totalCalculado}</span>
                    </div>
                    <button 
                        onClick={procesarCompra}
                        style={{...estiloBotonConfirmar, opacity: carrito.length === 0 ? 0.5 : 1, cursor: carrito.length === 0 ? 'not-allowed' : 'pointer'}}
                        disabled={carrito.length === 0}
                    >
                        Confirmar Compra
                    </button>
                </div>

            </div>
        </div>
    );
}

const estiloContenedorFondo = {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 2000,
    display: 'flex', justifyContent: 'flex-end', transition: 'background-color 0.3s ease'
};

const estiloBandejaCarrito = {
    width: '100%', maxWidth: '400px', height: '100vh', backgroundColor: '#ffffff',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', display: 'flex',
    flexDirection: 'column', fontFamily: "'Poppins', sans-serif"
};

const estiloCabecera = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '24px', borderBottom: '1px solid #eeeeee'
};

const estiloTitulo = {
    margin: 0, fontWeight: '600', color: '#212121', fontSize: '1.25rem'
};

const estiloBotonCerrar = {
    background: 'none', border: 'none', fontSize: '1.2rem', color: '#757575', cursor: 'pointer', padding: '4px'
};

const estiloListaProductos = {
    flex: 1, overflowY: 'auto', padding: '0 24px'
};

const estiloVacio = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%'
};

const estiloItemProducto = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 0', borderBottom: '1px solid #f5f5f5'
};

const estiloControlesCantidad = {
    display: 'flex', alignItems: 'center', border: '1px solid #eeeeee', borderRadius: '4px', overflow: 'hidden'
};

const estiloBotonCantidad = {
    background: '#fcfcfc', border: 'none', padding: '6px 12px', fontSize: '1rem', color: '#424242', cursor: 'pointer', outline: 'none'
};

const estiloTextoCantidad = {
    padding: '0 12px', fontSize: '0.9rem', fontWeight: '500', color: '#212121', minWidth: '12px', textAlign: 'center'
};

const estiloColumnaPrecio = {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '80px', gap: '4px'
};

const estiloBotonEliminar = {
    background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.85rem', padding: 0, fontWeight: '500'
};

const estiloFooter = {
    padding: '24px', borderTop: '1px solid #eeeeee', backgroundColor: '#fafafa'
};

const estiloResumen = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
};

const estiloBotonConfirmar = {
    backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '14px',
    borderRadius: '4px', fontWeight: '600', fontSize: '1rem', width: '100%', 
    fontFamily: "'Poppins', sans-serif", transition: 'background-color 0.2s ease'
};

export default Carrito;