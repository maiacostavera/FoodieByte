import { formatearMoneda } from '../../utils/formato';
import Icono from '../Icono';
import CountUp from '../reactbits/CountUp';

/**
 * Las cifras enteras cuentan hasta su valor al aparecer (CountUp de React
 * Bits), con el punto de miles de siempre. Un importe con centavos se muestra
 * fijo: el componente usa punto decimal y acá va la coma.
 */
function Cifra({ valor, moneda }) {
    if (typeof valor === 'number' && Number.isInteger(valor)) {
        // Cifras proporcionales, no tabulares: en un número grande suelto los
        // dígitos de ancho fijo se ven separados.
        return <CountUp to={valor} separator="." prefix={moneda ? '$' : ''} duration={1.2}
            style={{ fontVariantNumeric: 'normal' }} />;
    }
    return moneda ? formatearMoneda(valor) : valor;
}

/**
 * Variación de las ventas de la última semana contra la anterior. Lleva flecha
 * y signo además del color, así no depende solo del verde o el rojo.
 */
export function Variacion({ porcentaje }) {
    if (porcentaje === null) return null;
    const direccion = porcentaje > 0 ? 'sube' : porcentaje < 0 ? 'baja' : 'igual';
    return (
        <p className="variacion-semanal">
            <span className={`variacion variacion--${direccion}`}>
                {direccion !== 'igual' && <Icono nombre={`tendencia-${direccion}`} tamano={14} grosor={2.4} />}
                {porcentaje > 0 ? '+' : ''}{porcentaje} %
            </span>
            <span>contra los 7 días anteriores</span>
        </p>
    );
}

/** Tarjeta de indicador: título, ícono, cifra y, si lo hay, un detalle. */
export default function Indicador({ titulo, valor, moneda, icono, tono, detalle }) {
    return (
        <div className={`kpi tarjeta${tono ? ` kpi--${tono}` : ''}`}>
            <div className="kpi__cabecera">
                <span>{titulo}</span>
                <span className="kpi__icono"><Icono nombre={icono} tamano={18} /></span>
            </div>
            <strong className="kpi__valor"><Cifra valor={valor} moneda={moneda} /></strong>
            {detalle && <span className="kpi__detalle">{detalle}</span>}
        </div>
    );
}
