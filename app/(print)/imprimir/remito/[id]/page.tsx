import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

const UNIDADES: Record<string, string> = { UNIDAD: 'und.', M2: 'm²', ML: 'ml' }

export default async function ImprimirRemitoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: remito } = await supabase
    .from('remitos')
    .select(`
      *,
      clientes(nombre, apellido, razon_social, cuit, telefono, email, direccion),
      facturas_venta(
        numero, fecha, total,
        factura_venta_items(id, cantidad, precio_unitario, subtotal, productos(nombre, unidad_medida))
      )
    `)
    .eq('id', id)
    .single()

  if (!remito) notFound()

  type Cli  = { nombre: string; apellido: string | null; razon_social: string | null; cuit: string | null; telefono: string | null; email: string | null; direccion: string | null }
  type Item = { id: string; cantidad: number; precio_unitario: number; subtotal: number; productos: { nombre: string; unidad_medida: string } | null }
  type Fac  = { numero: string; fecha: string; total: number; factura_venta_items: Item[] }

  const cli    = remito.clientes      as Cli | null
  const fac    = remito.facturas_venta as Fac | null
  const items  = fac?.factura_venta_items ?? []

  const cliLabel = cli ? (cli.razon_social ?? [cli.nombre, cli.apellido].filter(Boolean).join(' ')) : '—'

  return (
    <>
      {/* Botones — solo pantalla */}
      <div className="no-print" style={{ background:'#1f2937', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'white', fontWeight:600 }}>Remito {remito.numero}</span>
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
            <div style={{ color:'#6b7280', marginTop:'4px', fontSize:'12px' }}>Remito de entrega</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#059669' }}>{remito.numero}</div>
            <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'4px' }}>
              Fecha: <strong>{remito.fecha}</strong>
            </div>
            <div style={{ marginTop:'6px' }}>
              <span style={{
                background: remito.estado === 'ENTREGADO' ? '#d1fae5' : remito.estado === 'CANCELADO' ? '#fee2e2' : '#fef9c3',
                color: remito.estado === 'ENTREGADO' ? '#065f46' : remito.estado === 'CANCELADO' ? '#991b1b' : '#713f12',
                padding:'3px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:700
              }}>
                {remito.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Datos del cliente */}
        <div style={{ marginBottom:'28px', padding:'14px 16px', background:'#f9fafb', borderRadius:'6px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Destinatario</div>
          <div style={{ fontWeight:700, fontSize:'15px' }}>{cliLabel}</div>
          {cli?.cuit      && <div style={{ color:'#374151', fontSize:'12px', marginTop:'2px' }}>CUIT: {cli.cuit}</div>}
          {cli?.telefono  && <div style={{ color:'#374151', fontSize:'12px' }}>Tel: {cli.telefono}</div>}
          {cli?.email     && <div style={{ color:'#374151', fontSize:'12px' }}>{cli.email}</div>}
          {cli?.direccion && <div style={{ color:'#374151', fontSize:'12px' }}>{cli.direccion}</div>}
        </div>

        {/* Factura vinculada */}
        {fac && (
          <div style={{ marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', border:'1px solid #e5e7eb', borderRadius:'6px' }}>
            <span style={{ fontSize:'12px', color:'#6b7280' }}>Factura asociada:</span>
            <span style={{ fontWeight:700, fontFamily:'monospace', fontSize:'13px' }}>{fac.numero}</span>
            <span style={{ fontSize:'12px', color:'#9ca3af' }}>{fac.fecha}</span>
            <span style={{ marginLeft:'auto', fontWeight:700, color:'#111' }}>{formatCurrency(fac.total)}</span>
          </div>
        )}

        {/* Tabla de ítems (de la factura vinculada) */}
        {items.length > 0 ? (
          <>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>
              Detalle de mercadería
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'24px' }}>
              <thead>
                <tr style={{ background:'#f9fafb', borderBottom:'2px solid #e5e7eb' }}>
                  <th style={{ padding:'9px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Producto</th>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Cantidad</th>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Precio unit.</th>
                  <th style={{ padding:'9px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                    <td style={{ padding:'9px 12px', fontWeight:500 }}>{item.productos?.nombre ?? '—'}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#374151' }}>
                      {item.cantidad} {item.productos ? (UNIDADES[item.productos.unidad_medida] ?? item.productos.unidad_medida) : ''}
                    </td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#374151' }}>{formatCurrency(item.precio_unitario)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:600 }}>{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ padding:'20px', background:'#f9fafb', borderRadius:'6px', textAlign:'center', color:'#9ca3af', fontSize:'13px', marginBottom:'24px' }}>
            Sin detalle de ítems — remito sin factura vinculada
          </div>
        )}

        {/* Notas */}
        {remito.notas && (
          <div style={{ background:'#f9fafb', borderRadius:'6px', padding:'14px 16px', marginBottom:'24px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>Observaciones</div>
            <div style={{ color:'#374151', lineHeight:'1.5', whiteSpace:'pre-wrap' }}>{remito.notas}</div>
          </div>
        )}

        {/* Firma */}
        <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px', marginTop:'40px' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ height:'48px' }}></div>
            <div style={{ borderTop:'1px solid #9ca3af', paddingTop:'8px', color:'#6b7280', fontSize:'12px' }}>Firma y aclaración — Receptor</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ height:'48px' }}></div>
            <div style={{ borderTop:'1px solid #9ca3af', paddingTop:'8px', color:'#6b7280', fontSize:'12px' }}>Firma y aclaración — Vidriería Suárez</div>
          </div>
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
