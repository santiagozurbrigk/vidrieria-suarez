import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

export default async function ImprimirFacturaVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: factura } = await supabase
    .from('facturas_venta')
    .select(`
      *,
      clientes(nombre, apellido, razon_social, cuit, condicion_iva, telefono, email, direccion),
      factura_venta_items(id, cantidad, precio_unitario, subtotal, productos(nombre, unidad_medida))
    `)
    .eq('id', id)
    .single()

  if (!factura) notFound()

  type Cli  = { nombre: string; apellido: string | null; razon_social: string | null; cuit: string | null; condicion_iva: string | null; telefono: string | null; email: string | null; direccion: string | null }
  type Item = { id: string; cantidad: number; precio_unitario: number; subtotal: number; productos: { nombre: string; unidad_medida: string } | null }

  const cli   = factura.clientes as Cli | null
  const items = (factura.factura_venta_items as Item[]) ?? []

  const cliLabel = cli ? (cli.razon_social ?? [cli.nombre, cli.apellido].filter(Boolean).join(' ')) : '—'

  const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
    PENDIENTE: { bg: '#fef9c3', text: '#713f12' },
    PARCIAL:   { bg: '#dbeafe', text: '#1e40af' },
    PAGADA:    { bg: '#d1fae5', text: '#065f46' },
  }
  const estadoStyle = ESTADO_COLOR[factura.estado] ?? { bg: '#f3f4f6', text: '#374151' }

  const TIPO_LABEL: Record<string, string> = {
    FACTURA: 'Factura',
    TICKET: 'Ticket',
    NOTA_CREDITO: 'Nota de crédito',
  }

  return (
    <>
      {/* Barra de acciones — oculta al imprimir */}
      <div className="no-print" style={{ background:'#1f2937', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'white', fontWeight:600 }}>{TIPO_LABEL[factura.tipo_comprobante] ?? factura.tipo_comprobante} {factura.numero}</span>
        <div style={{ display:'flex', gap:'10px' }}>
          <button
            id="btn-print"
            style={{ background:'#3b82f6', color:'white', border:'none', borderRadius:'6px', padding:'8px 18px', cursor:'pointer', fontWeight:600 }}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
          <button
            id="btn-close"
            style={{ background:'#374151', color:'white', border:'none', borderRadius:'6px', padding:'8px 14px', cursor:'pointer' }}
          >
            ✕ Cerrar
          </button>
        </div>
      </div>

      {/* Documento */}
      <div className="doc-wrapper">
        {/* Encabezado empresa */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px', paddingBottom:'20px', borderBottom:'2px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#111' }}>Vidriería Suárez</div>
            <div style={{ color:'#6b7280', marginTop:'4px', fontSize:'12px' }}>{TIPO_LABEL[factura.tipo_comprobante] ?? factura.tipo_comprobante}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#1d4ed8', fontFamily:'monospace' }}>{factura.numero}</div>
            <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'4px' }}>
              Fecha: <strong>{factura.fecha}</strong>
            </div>
            <div style={{ marginTop:'6px' }}>
              <span style={{
                background: estadoStyle.bg,
                color: estadoStyle.text,
                padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:700
              }}>
                {factura.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div style={{ marginBottom:'28px', padding:'14px 16px', background:'#f9fafb', borderRadius:'6px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Cliente</div>
          <div style={{ fontWeight:700, fontSize:'15px' }}>{cliLabel}</div>
          {cli?.cuit         && <div style={{ color:'#374151', fontSize:'12px', marginTop:'2px' }}>CUIT: {cli.cuit}</div>}
          {cli?.condicion_iva && <div style={{ color:'#374151', fontSize:'12px' }}>Condición IVA: {cli.condicion_iva.replace('_', ' ')}</div>}
          {cli?.telefono     && <div style={{ color:'#374151', fontSize:'12px' }}>Tel: {cli.telefono}</div>}
          {cli?.email        && <div style={{ color:'#374151', fontSize:'12px' }}>{cli.email}</div>}
          {cli?.direccion    && <div style={{ color:'#374151', fontSize:'12px' }}>{cli.direccion}</div>}
        </div>

        {/* Tabla de ítems */}
        {items.length > 0 && (
          <>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>
              Detalle
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'20px' }}>
              <thead>
                <tr style={{ background:'#f9fafb', borderBottom:'2px solid #e5e7eb' }}>
                  <th style={{ padding:'9px 12px', textAlign:'left',  fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Producto</th>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Cantidad</th>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Precio unit.</th>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                    <td style={{ padding:'9px 12px', fontWeight:500 }}>
                      {item.productos?.nombre ?? '—'}
                      {item.productos && <span style={{ color:'#9ca3af', fontSize:'11px', marginLeft:'4px' }}>{UNIDADES[item.productos.unidad_medida] ?? item.productos.unidad_medida}</span>}
                    </td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#374151' }}>{item.cantidad}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#374151' }}>{formatCurrency(item.precio_unitario)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:600 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Totales */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'28px' }}>
          <div style={{ width:'220px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#6b7280', marginBottom:'6px' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(factura.subtotal)}</span>
            </div>
            {factura.iva > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#6b7280', marginBottom:'6px' }}>
                <span>IVA</span>
                <span>{formatCurrency(factura.iva)}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:'16px', borderTop:'2px solid #e5e7eb', paddingTop:'8px' }}>
              <span>Total</span>
              <span style={{ color:'#1d4ed8' }}>{formatCurrency(factura.total)}</span>
            </div>
            {factura.saldo_pendiente > 0 && factura.saldo_pendiente < factura.total && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#d97706', marginTop:'6px' }}>
                <span>Saldo pendiente</span>
                <span style={{ fontWeight:600 }}>{formatCurrency(factura.saldo_pendiente)}</span>
              </div>
            )}
            {factura.estado === 'PAGADA' && (
              <div style={{ marginTop:'8px', textAlign:'center', fontSize:'12px', fontWeight:700, color:'#059669', background:'#d1fae5', borderRadius:'6px', padding:'4px 0' }}>
                ✓ PAGADA
              </div>
            )}
          </div>
        </div>

        {/* Notas */}
        {factura.notas && (
          <div style={{ background:'#f9fafb', borderRadius:'6px', padding:'14px 16px', marginBottom:'24px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>Observaciones</div>
            <div style={{ color:'#374151', lineHeight:'1.5', whiteSpace:'pre-wrap' }}>{factura.notas}</div>
          </div>
        )}

        {/* Pie */}
        <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'16px', marginTop:'20px', textAlign:'center', color:'#9ca3af', fontSize:'11px' }}>
          Vidriería Suárez · Gracias por su compra
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          var btnPrint = document.getElementById('btn-print');
          if (btnPrint) btnPrint.addEventListener('click', function() { window.print(); });
          var btnClose = document.getElementById('btn-close');
          if (btnClose) btnClose.addEventListener('click', function() { window.close(); });
        });
      `}} />
    </>
  )
}
