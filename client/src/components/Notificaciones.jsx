import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import Icono from './Icono';

const INTERVALO_MS = 60_000;

/** "hace 5 min", "ayer": más legible que una fecha completa en una lista. */
function haceCuanto(fecha) {
    const segundos = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000);
    if (segundos < 60) return 'recién';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

const ICONO_POR_TIPO = {
    pedido_confirmado: 'check',
    pedido_enviado: 'bolsa',
    pedido_rechazado: 'alerta',
    pregunta_respondida: 'chat',
    pedido_recibido: 'recibo',
    pregunta_recibida: 'chat',
    solicitud_local: 'tienda'
};

function Notificaciones() {
    const [abierto, setAbierto] = useState(false);
    const [notificaciones, setNotificaciones] = useState([]);
    const [sinLeer, setSinLeer] = useState(0);
    const [cargando, setCargando] = useState(false);
    const contenedor = useRef(null);

    const contar = useCallback(async () => {
        try {
            const { data } = await api.get('/notificaciones/sin-leer');
            setSinLeer(data.sinLeer);
        } catch {
            // Un fallo puntual no tiene que romper la barra de navegación.
        }
    }, []);

    // Sondeo en lugar de tiempo real: alcanza para avisos que no son urgentes
    // y evita mantener una conexión abierta por cada persona conectada.
    useEffect(() => {
        contar();
        const reloj = setInterval(contar, INTERVALO_MS);
        return () => clearInterval(reloj);
    }, [contar]);

    // Cerrar al hacer clic afuera o con Escape.
    useEffect(() => {
        if (!abierto) return;
        const alClicAfuera = (evento) => {
            if (contenedor.current && !contenedor.current.contains(evento.target)) setAbierto(false);
        };
        const alTeclear = (evento) => { if (evento.key === 'Escape') setAbierto(false); };
        document.addEventListener('mousedown', alClicAfuera);
        document.addEventListener('keydown', alTeclear);
        return () => {
            document.removeEventListener('mousedown', alClicAfuera);
            document.removeEventListener('keydown', alTeclear);
        };
    }, [abierto]);

    const alternar = async () => {
        if (abierto) { setAbierto(false); return; }

        setAbierto(true);
        setCargando(true);
        try {
            const { data } = await api.get('/notificaciones');
            setNotificaciones(data.notificaciones);
            setSinLeer(data.sinLeer);
        } catch {
            setNotificaciones([]);
        } finally {
            setCargando(false);
        }
    };

    const marcarTodas = async () => {
        // Se actualiza la pantalla primero: si el pedido falla, el próximo
        // sondeo devuelve el contador real.
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
        setSinLeer(0);
        try {
            await api.put('/notificaciones/leidas');
        } catch {
            contar();
        }
    };

    const marcarUna = async (id) => {
        setNotificaciones(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)));
        setSinLeer(prev => Math.max(0, prev - 1));
        try {
            await api.put(`/notificaciones/${id}/leida`);
        } catch {
            contar();
        }
    };

    return (
        <div className="campana" ref={contenedor}>
            <button
                type="button"
                className="campana__boton"
                onClick={alternar}
                aria-expanded={abierto}
                aria-haspopup="true"
                aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
            >
                <Icono nombre="campana" tamano={20} />
                {sinLeer > 0 && <span className="campana__marca">{sinLeer > 9 ? '9+' : sinLeer}</span>}
            </button>

            {abierto && (
                <div className="campana__panel" role="dialog" aria-label="Notificaciones">
                    <header className="campana__cabecera">
                        <h3>Notificaciones</h3>
                        {sinLeer > 0 && (
                            <button type="button" className="campana__accion" onClick={marcarTodas}>
                                Marcar todas como leídas
                            </button>
                        )}
                    </header>

                    <div className="campana__lista">
                        {cargando ? (
                            <p className="campana__vacio">Cargando…</p>
                        ) : notificaciones.length === 0 ? (
                            <p className="campana__vacio">No tenés notificaciones todavía.</p>
                        ) : (
                            notificaciones.map(n => (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`campana__item${n.leida ? '' : ' campana__item--nueva'}`}
                                    onClick={() => !n.leida && marcarUna(n.id)}
                                >
                                    <span className="campana__icono" aria-hidden="true">
                                        <Icono nombre={ICONO_POR_TIPO[n.tipo] || 'info'} tamano={16} />
                                    </span>
                                    <span className="campana__texto">
                                        <strong>{n.titulo}</strong>
                                        {n.detalle && <span className="campana__detalle">{n.detalle}</span>}
                                        <span className="campana__fecha">{haceCuanto(n.createdAt)}</span>
                                    </span>
                                    {!n.leida && <span className="campana__punto" aria-label="Sin leer" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Notificaciones;
