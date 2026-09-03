// Estilos compartidos por las vistas del panel de gestión.
export const estilos = {
    contenedorPrincipal: { fontFamily: "'Poppins', sans-serif" },
    cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
    tituloPrincipal: { margin: 0, color: '#212121', fontSize: '1.8rem', fontWeight: '700' },
    badgeAdmin: { backgroundColor: '#212121', color: '#ffffff', padding: '6px 16px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '1px' },

    tabsContainer: { display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #eeeeee', flexWrap: 'wrap' },
    tabActivo: { backgroundColor: '#212121', color: '#ffffff', border: 'none', padding: '10px 20px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' },
    tabInactivo: { backgroundColor: 'transparent', color: '#757575', border: '1px solid #e0e0e0', borderBottom: 'none', padding: '10px 20px', borderTopLeftRadius: '6px', borderTopRightRadius: '6px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem' },

    botonPrimario: { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" },
    botonSecundario: { backgroundColor: 'transparent', color: '#757575', border: '1px solid #e0e0e0', padding: '12px 24px', borderRadius: '4px', fontWeight: '500', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" },

    gridKPIs: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    cardKPI: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '6px' },
    labelKPI: { color: '#757575', fontSize: '0.9rem', fontWeight: '500' },
    valorKPI: { color: '#1976d2', fontSize: '2rem', fontWeight: '600' },

    panelBlanco: { backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', marginBottom: '30px' },
    tituloSeccion: { margin: '0 0 24px 0', color: '#212121', fontSize: '1.2rem', fontWeight: '600' },
    tituloSeccionInline: { margin: 0, color: '#212121', fontSize: '1.2rem', fontWeight: '600' },

    tabla: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    filaHeader: { borderBottom: '2px solid #eeeeee' },
    celdaHeader: { padding: '14px 12px', color: '#757575', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.3px' },
    filaBody: { borderBottom: '1px solid #f5f5f5' },
    celdaBody: { padding: '14px 12px', color: '#424242', fontSize: '0.9rem', verticalAlign: 'middle' },

    stockAlerta: { color: '#d32f2f', fontWeight: '600' },
    textoVacio: { color: '#757575', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 },

    miniaturaWrapper: { width: '50px', height: '50px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    miniatura: { width: '100%', height: '100%', objectFit: 'cover' },

    botonEditar: { backgroundColor: '#1976d2', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', marginRight: '8px', fontFamily: "'Poppins', sans-serif" },
    botonEliminar: { backgroundColor: '#d32f2f', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif" },

    selectPequeno: { padding: '6px 12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.85rem', fontFamily: "'Poppins', sans-serif", outline: 'none', backgroundColor: '#ffffff' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    modalContenido: { backgroundColor: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', padding: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #eeeeee' },
    botonCerrarModal: { background: 'none', border: 'none', fontSize: '1.5rem', color: '#757575', cursor: 'pointer' },

    formulario: { display: 'flex', flexDirection: 'column', gap: '20px' },
    grupoInput: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#424242', fontSize: '0.9rem', fontWeight: '600' },
    input: { padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px', fontSize: '0.95rem', fontFamily: "'Poppins', sans-serif", outline: 'none', backgroundColor: '#ffffff' },

    uploadContainer: { border: '1px dashed #bdbdbd', padding: '16px', borderRadius: '4px', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' },
    inputFile: { fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem' },
    fileName: { fontSize: '0.85rem', color: '#d32f2f', fontWeight: '500' },

    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', color: '#424242', fontSize: '0.9rem', cursor: 'pointer' }
};

export const badgeEstado = (estado) => {
    const base = { padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', display: 'inline-block' };
    if (estado === 'Enviado') return { ...base, backgroundColor: '#e8f5e9', color: '#2e7d32' };
    if (estado === 'Rechazado') return { ...base, backgroundColor: '#ffebee', color: '#c62828' };
    return { ...base, backgroundColor: '#fff8e1', color: '#f57f17' };
};

export const formatearMoneda = (valor) =>
    `$${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
