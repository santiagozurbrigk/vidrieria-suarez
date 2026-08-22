import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)
}

export default async function ImprimirPresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: pres } = await supabase
    .from('presupuestos')
    .select(`
      *,
      arquitectos(nombre, apellido, estudio, telefono, email),
      clientes(nombre, apellido, razon_social, cuit, condicion_iva, telefono, email, direccion),
      presupuesto_items(id, descripcion, cantidad, precio_unitario, subtotal, productos(nombre))
    `)
    .eq('id', id)
    .single()

  if (!pres) notFound()

  type Arq  = { nombre: string; apellido: string | null; estudio: string | null; telefono: string | null; email: string | null }
  type Cli  = { nombre: string; apellido: string | null; razon_social: string | null; cuit: string | null; condicion_iva: string | null; telefono: string | null; email: string | null; direccion: string | null }
  type Item = { id: string; descripcion: string; cantidad: number; precio_unitario: number; subtotal: number; productos: { nombre: string } | null }

  const arq   = pres.arquitectos as Arq | null
  const cli   = pres.clientes   as Cli | null
  const items = (pres.presupuesto_items as Item[]) ?? []

  const arqLabel = arq ? `${arq.nombre}${arq.apellido ? ' ' + arq.apellido : ''}${arq.estudio ? ' — ' + arq.estudio : ''}` : '—'
  const cliLabel = cli ? (cli.razon_social ?? [cli.nombre, cli.apellido].filter(Boolean).join(' ')) : null

  const fechaValidos = new Date(pres.fecha)
  fechaValidos.setDate(fechaValidos.getDate() + pres.validez_dias)
  const validoHasta = fechaValidos.toLocaleDateString('es-AR')

  return (
    <>
      {/* Botones de acción — solo en pantalla */}
      <div className="no-print" style={{ background:'#1f2937', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'white', fontWeight:600 }}>Vista previa — {pres.numero}</span>
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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'32px', paddingBottom:'20px', borderBottom:'2px solid #e5e7eb' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#111' }}>Vidriería Suárez</div>
            <div style={{ color:'#6b7280', marginTop:'4px', fontSize:'12px' }}>Presupuesto de obra</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'20px', fontWeight:700, color:'#1d4ed8' }}>{pres.numero}</div>
            <div style={{ color:'#6b7280', fontSize:'12px', marginTop:'4px' }}>
              Fecha: <strong>{pres.fecha}</strong>
            </div>
            <div style={{ color:'#6b7280', fontSize:'12px' }}>
              Válido hasta: <strong>{validoHasta}</strong> ({pres.validez_dias} días)
            </div>
          </div>
        </div>

        {/* Datos arquitecto + cliente */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', marginBottom:'28px' }}>
          <div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Arquitecto</div>
            <div style={{ fontWeight:600 }}>{arqLabel}</div>
            {arq?.telefono && <div style={{ color:'#374151', fontSize:'12px' }}>Tel: {arq.telefono}</div>}
            {arq?.email    && <div style={{ color:'#374151', fontSize:'12px' }}>{arq.email}</div>}
          </div>
          {(cli || pres.obra) && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Cliente / Obra</div>
              {cliLabel && <div style={{ fontWeight:600 }}>{cliLabel}</div>}
              {cli?.cuit && <div style={{ color:'#374151', fontSize:'12px' }}>CUIT: {cli.cuit}</div>}
              {cli?.telefono && <div style={{ color:'#374151', fontSize:'12px' }}>Tel: {cli.telefono}</div>}
              {cli?.email    && <div style={{ color:'#374151', fontSize:'12px' }}>{cli.email}</div>}
              {cli?.direccion && <div style={{ color:'#374151', fontSize:'12px' }}>{cli.direccion}</div>}
              {pres.obra && (
                <div style={{ marginTop:'4px', padding:'4px 8px', background:'#f3f4f6', borderRadius:'4px', fontSize:'12px' }}>
                  Obra: <strong>{pres.obra}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabla de ítems */}
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'20px' }}>
          <thead>
            <tr style={{ background:'#f9fafb', borderBottom:'2px solid #e5e7eb' }}>
              <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>#</th>
              <th style={{ padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Descripción</th>
              <th style={{ padding:'10px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Cant.</th>
              <th style={{ padding:'10px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Precio unit.</th>
              <th style={{ padding:'10px 12px', textAlign:'right', fontSize:'11px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'0.04em' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ borderBottom:'1px solid #f3f4f6' }}>
                <td style={{ padding:'10px 12px', color:'#9ca3af', fontSize:'12px' }}>{i + 1}</td>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ fontWeight:500 }}>{item.descripcion}</div>
                  {item.productos && (
                    <div style={{ fontSize:'11px', color:'#9ca3af' }}>{item.productos.nombre}</div>
                  )}
                </td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#374151' }}>{item.cantidad}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', color:'#374151' }}>{formatCurrency(item.precio_unitario)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:600 }}>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'28px' }}>
          <div style={{ border:'2px solid #1d4ed8', borderRadius:'8px', padding:'14px 24px', minWidth:'240px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:'40px' }}>
              <span style={{ fontWeight:700, color:'#1d4ed8', fontSize:'15px' }}>TOTAL</span>
              <span style={{ fontWeight:800, fontSize:'18px', color:'#111' }}>{formatCurrency(pres.total)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {pres.notas && (
          <div style={{ background:'#f9fafb', borderRadius:'6px', padding:'14px 16px', marginBottom:'20px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>Observaciones</div>
            <div style={{ color:'#374151', lineHeight:'1.5', whiteSpace:'pre-wrap' }}>{pres.notas}</div>
          </div>
        )}

        {/* Firma */}
        <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px', marginTop:'40px' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ borderTop:'1px solid #9ca3af', paddingTop:'8px', color:'#6b7280', fontSize:'12px' }}>Firma y aclaración — Arquitecto</div>
          </div>
          <div style={{ textAlign:'center' }}>
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
