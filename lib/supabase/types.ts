// Regenerar después de cada cambio de esquema:
//   npx supabase gen types typescript --project-id <project-ref> > lib/supabase/types.ts
//
// Hoy este archivo se mantiene a mano, así que puede desincronizarse de la base
// real sin que nada lo detecte. Ver supabase/migrations/README.md.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Formas de fila reutilizadas por las funciones RPC (ver Functions más abajo).
type FacturaVentaRow = {
    id: string; cliente_id: string; numero: string; fecha: string
    tipo_comprobante: string; subtotal: number; iva: number; total: number
    saldo_pendiente: number; estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'
    archivo_adjunto_path: string | null; notas: string | null
    created_by: string; created_at: string; updated_at: string
  }

type FacturaCompraRow = {
    id: string; proveedor_id: string; numero: string; fecha: string
    tipo_comprobante: string; subtotal: number; iva: number; total: number
    saldo_pendiente: number; estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'
    archivo_adjunto_path: string | null; notas: string | null
    created_by: string; created_at: string; updated_at: string
  }

type PresupuestoRow = {
    id: string; arquitecto_id: string; cliente_id: string | null; obra: string | null
    numero: string; fecha: string; validez_dias: number; total: number; estado: string
    convertido_en_factura_id: string | null; notas: string | null
    created_by: string; created_at: string; updated_at: string
  }

type PagoRow = {
    id: string; tipo: 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'
    cliente_id: string | null; proveedor_id: string | null
    monto: number; medio_pago: string; fecha: string; notas: string | null
    created_by: string; created_at: string
  }

type RemitoRow = {
    id: string; cliente_id: string; factura_venta_id: string | null
    numero: string; fecha: string; estado: string
    archivo_adjunto_path: string | null; notas: string | null
    created_by: string; created_at: string
  }

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nombre: string; rol: 'ADMIN' | 'VENDEDOR' | 'DEPOSITO'; activo: boolean; created_at: string }
        Insert: { id: string; nombre: string; rol?: 'ADMIN' | 'VENDEDOR' | 'DEPOSITO'; activo?: boolean }
        Update: { nombre?: string; rol?: 'ADMIN' | 'VENDEDOR' | 'DEPOSITO'; activo?: boolean }
        Relationships: []
      }
      productos: {
        Row: {
          id: string; nombre: string; descripcion: string | null
          categoria: 'VIDRIO' | 'ALUMINIO' | 'ACCESORIO' | 'INSUMO'
          unidad_medida: 'UNIDAD' | 'M2' | 'ML'
          costo_actual: number; margen_ganancia: number; precio_venta: number
          stock_actual: number; stock_minimo: number; activo: boolean
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; nombre: string; descripcion?: string | null
          categoria: 'VIDRIO' | 'ALUMINIO' | 'ACCESORIO' | 'INSUMO'
          unidad_medida: 'UNIDAD' | 'M2' | 'ML'
          costo_actual?: number; margen_ganancia?: number; precio_venta?: number
          stock_actual?: number; stock_minimo?: number; activo?: boolean
        }
        Update: {
          nombre?: string; descripcion?: string | null
          categoria?: 'VIDRIO' | 'ALUMINIO' | 'ACCESORIO' | 'INSUMO'
          unidad_medida?: 'UNIDAD' | 'M2' | 'ML'
          costo_actual?: number; margen_ganancia?: number; precio_venta?: number
          stock_actual?: number; stock_minimo?: number; activo?: boolean
        }
        Relationships: []
      }
      movimientos_stock: {
        Row: {
          id: string; producto_id: string; tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
          cantidad: number; motivo: string | null; fecha: string
          factura_compra_id: string | null; factura_venta_id: string | null
          usuario_id: string; created_at: string
        }
        Insert: {
          id?: string; producto_id: string; tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
          cantidad: number; motivo?: string | null; fecha?: string
          factura_compra_id?: string | null; factura_venta_id?: string | null
          usuario_id: string
        }
        Update: { motivo?: string | null }
        Relationships: [
          { foreignKeyName: "movimientos_stock_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_stock_factura_compra_id_fkey"; columns: ["factura_compra_id"]; isOneToOne: false; referencedRelation: "facturas_compra"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_stock_factura_venta_id_fkey"; columns: ["factura_venta_id"]; isOneToOne: false; referencedRelation: "facturas_venta"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_stock_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      proveedores: {
        Row: {
          id: string; razon_social: string; cuit: string | null
          condicion_iva: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | null
          contacto: string | null; telefono: string | null; email: string | null
          direccion: string | null; alias_cbu: string | null; cbu: string | null
          notas: string | null; activo: boolean; margen_ganancia: number
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; razon_social: string; cuit?: string | null
          condicion_iva?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | null
          contacto?: string | null; telefono?: string | null; email?: string | null
          direccion?: string | null; alias_cbu?: string | null; cbu?: string | null
          notas?: string | null; activo?: boolean; margen_ganancia?: number
        }
        Update: {
          razon_social?: string; cuit?: string | null
          condicion_iva?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | null
          contacto?: string | null; telefono?: string | null; email?: string | null
          direccion?: string | null; alias_cbu?: string | null; cbu?: string | null
          notas?: string | null; activo?: boolean; margen_ganancia?: number
        }
        Relationships: []
      }
      facturas_compra: {
        Row: FacturaCompraRow
        Insert: {
          id?: string; proveedor_id: string; numero: string; fecha?: string
          tipo_comprobante?: string; subtotal?: number; iva?: number
          total: number; saldo_pendiente: number
          estado?: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'
          archivo_adjunto_path?: string | null; notas?: string | null; created_by: string
        }
        Update: {
          numero?: string; fecha?: string; tipo_comprobante?: string
          subtotal?: number; iva?: number; total?: number; saldo_pendiente?: number
          estado?: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'; notas?: string | null
        }
        Relationships: [
          { foreignKeyName: "facturas_compra_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] },
          { foreignKeyName: "facturas_compra_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      factura_venta_items: {
        Row: {
          id: string; factura_venta_id: string; producto_id: string
          cantidad: number; precio_unitario: number; subtotal: number; created_at: string
        }
        Insert: {
          id?: string; factura_venta_id: string; producto_id: string
          cantidad: number; precio_unitario: number; subtotal: number
        }
        Update: { cantidad?: number; precio_unitario?: number; subtotal?: number }
        Relationships: [
          { foreignKeyName: "factura_venta_items_factura_venta_id_fkey"; columns: ["factura_venta_id"]; isOneToOne: false; referencedRelation: "facturas_venta"; referencedColumns: ["id"] },
          { foreignKeyName: "factura_venta_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ]
      }
      factura_compra_items: {
        Row: {
          id: string; factura_compra_id: string; producto_id: string
          cantidad: number; costo_unitario: number; subtotal: number; created_at: string
        }
        Insert: {
          id?: string; factura_compra_id: string; producto_id: string
          cantidad: number; costo_unitario: number; subtotal: number
        }
        Update: { cantidad?: number; costo_unitario?: number; subtotal?: number }
        Relationships: [
          { foreignKeyName: "factura_compra_items_factura_compra_id_fkey"; columns: ["factura_compra_id"]; isOneToOne: false; referencedRelation: "facturas_compra"; referencedColumns: ["id"] },
          { foreignKeyName: "factura_compra_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ]
      }
      clientes: {
        Row: {
          id: string; nombre: string; apellido: string | null; razon_social: string | null
          cuit: string | null
          condicion_iva: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | null
          telefono: string | null; email: string | null; direccion: string | null
          notas: string | null; activo: boolean; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; nombre: string; apellido?: string | null; razon_social?: string | null
          cuit?: string | null
          condicion_iva?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | null
          telefono?: string | null; email?: string | null; direccion?: string | null
          notas?: string | null; activo?: boolean
        }
        Update: {
          nombre?: string; apellido?: string | null; razon_social?: string | null; cuit?: string | null
          condicion_iva?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | null
          telefono?: string | null; email?: string | null; direccion?: string | null
          notas?: string | null; activo?: boolean
        }
        Relationships: []
      }
      facturas_venta: {
        Row: FacturaVentaRow
        Insert: {
          id?: string; cliente_id: string; numero: string; fecha?: string
          tipo_comprobante?: string; subtotal?: number; iva?: number
          total: number; saldo_pendiente: number
          estado?: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'
          archivo_adjunto_path?: string | null; notas?: string | null; created_by: string
        }
        Update: {
          numero?: string; fecha?: string; subtotal?: number; iva?: number
          total?: number; saldo_pendiente?: number
          estado?: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'; notas?: string | null
        }
        Relationships: [
          { foreignKeyName: "facturas_venta_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "facturas_venta_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      arquitectos: {
        Row: {
          id: string; nombre: string; apellido: string | null; estudio: string | null
          telefono: string | null; email: string | null; direccion: string | null
          notas: string | null; activo: boolean; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; nombre: string; apellido?: string | null; estudio?: string | null
          telefono?: string | null; email?: string | null; direccion?: string | null
          notas?: string | null; activo?: boolean
        }
        Update: {
          nombre?: string; apellido?: string | null; estudio?: string | null
          telefono?: string | null; email?: string | null; direccion?: string | null
          notas?: string | null; activo?: boolean
        }
        Relationships: []
      }
      presupuestos: {
        Row: PresupuestoRow
        Insert: {
          id?: string; arquitecto_id: string; cliente_id?: string | null; obra?: string | null
          numero: string; fecha?: string; validez_dias?: number; total?: number; estado?: string
          notas?: string | null; created_by: string
        }
        Update: { obra?: string | null; validez_dias?: number; estado?: string; notas?: string | null; convertido_en_factura_id?: string | null }
        Relationships: [
          { foreignKeyName: "presupuestos_arquitecto_id_fkey"; columns: ["arquitecto_id"]; isOneToOne: false; referencedRelation: "arquitectos"; referencedColumns: ["id"] },
          { foreignKeyName: "presupuestos_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "presupuestos_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      presupuesto_items: {
        Row: {
          id: string; presupuesto_id: string; producto_id: string | null
          descripcion: string; cantidad: number; precio_unitario: number; subtotal: number
          created_at: string
        }
        Insert: {
          id?: string; presupuesto_id: string; producto_id?: string | null
          descripcion: string; cantidad: number; precio_unitario: number; subtotal: number
        }
        Update: { descripcion?: string; cantidad?: number; precio_unitario?: number; subtotal?: number }
        Relationships: [
          { foreignKeyName: "presupuesto_items_presupuesto_id_fkey"; columns: ["presupuesto_id"]; isOneToOne: false; referencedRelation: "presupuestos"; referencedColumns: ["id"] },
          { foreignKeyName: "presupuesto_items_producto_id_fkey"; columns: ["producto_id"]; isOneToOne: false; referencedRelation: "productos"; referencedColumns: ["id"] },
        ]
      }
      movimientos_caja: {
        Row: {
          id: string; tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE'; concepto: string
          monto: number; medio_pago: string | null; fecha: string
          pago_id: string | null; gasto_id: string | null; usuario_id: string; created_at: string
        }
        Insert: {
          id?: string; tipo: 'INGRESO' | 'EGRESO' | 'AJUSTE'; concepto: string
          monto: number; medio_pago?: string | null; fecha?: string
          pago_id?: string | null; gasto_id?: string | null; usuario_id: string
        }
        Update: { concepto?: string; monto?: number; medio_pago?: string | null }
        Relationships: [
          { foreignKeyName: "movimientos_caja_pago_id_fkey"; columns: ["pago_id"]; isOneToOne: false; referencedRelation: "pagos"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_caja_gasto_id_fkey"; columns: ["gasto_id"]; isOneToOne: false; referencedRelation: "gastos"; referencedColumns: ["id"] },
          { foreignKeyName: "movimientos_caja_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      cierres_caja: {
        Row: {
          id: string; fecha: string; saldo_sistema: number; saldo_real: number | null
          diferencia: number | null; estado: string; notas: string | null
          usuario_id: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; fecha: string; saldo_sistema: number; saldo_real?: number | null
          diferencia?: number | null; estado?: string; notas?: string | null; usuario_id: string
        }
        Update: { saldo_real?: number | null; diferencia?: number | null; estado?: string; notas?: string | null }
        Relationships: [
          { foreignKeyName: "cierres_caja_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      categorias_gasto: {
        Row: { id: string; nombre: string; descripcion: string | null; activo: boolean; created_at: string }
        Insert: { id?: string; nombre: string; descripcion?: string | null; activo?: boolean }
        Update: { nombre?: string; descripcion?: string | null; activo?: boolean }
        Relationships: []
      }
      gastos: {
        Row: {
          id: string; categoria_id: string; concepto: string; monto: number
          medio_pago: string | null; fecha: string; archivo_adjunto_path: string | null
          notas: string | null; usuario_id: string; created_at: string
        }
        Insert: {
          id?: string; categoria_id: string; concepto: string; monto: number
          medio_pago?: string | null; fecha?: string
          archivo_adjunto_path?: string | null; notas?: string | null; usuario_id: string
        }
        Update: { categoria_id?: string; concepto?: string; monto?: number; medio_pago?: string | null; fecha?: string; notas?: string | null }
        Relationships: [
          { foreignKeyName: "gastos_categoria_id_fkey"; columns: ["categoria_id"]; isOneToOne: false; referencedRelation: "categorias_gasto"; referencedColumns: ["id"] },
          { foreignKeyName: "gastos_usuario_id_fkey"; columns: ["usuario_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      pagos: {
        Row: PagoRow
        Insert: {
          id?: string; tipo: 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'
          cliente_id?: string | null; proveedor_id?: string | null
          monto: number; medio_pago: string; fecha?: string; notas?: string | null; created_by: string
        }
        Update: { monto?: number; medio_pago?: string; notas?: string | null }
        Relationships: [
          { foreignKeyName: "pagos_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "pagos_proveedor_id_fkey"; columns: ["proveedor_id"]; isOneToOne: false; referencedRelation: "proveedores"; referencedColumns: ["id"] },
          { foreignKeyName: "pagos_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      pago_facturas: {
        Row: {
          id: string; pago_id: string; factura_venta_id: string | null
          factura_compra_id: string | null; monto_imputado: number; created_at: string
        }
        Insert: {
          id?: string; pago_id: string; factura_venta_id?: string | null
          factura_compra_id?: string | null; monto_imputado: number
        }
        Update: { monto_imputado?: number }
        Relationships: [
          { foreignKeyName: "pago_facturas_pago_id_fkey"; columns: ["pago_id"]; isOneToOne: false; referencedRelation: "pagos"; referencedColumns: ["id"] },
          { foreignKeyName: "pago_facturas_factura_venta_id_fkey"; columns: ["factura_venta_id"]; isOneToOne: false; referencedRelation: "facturas_venta"; referencedColumns: ["id"] },
          { foreignKeyName: "pago_facturas_factura_compra_id_fkey"; columns: ["factura_compra_id"]; isOneToOne: false; referencedRelation: "facturas_compra"; referencedColumns: ["id"] },
        ]
      }
      remitos: {
        Row: RemitoRow
        Insert: {
          id?: string; cliente_id: string; factura_venta_id?: string | null
          numero: string; fecha?: string; estado?: string
          archivo_adjunto_path?: string | null; notas?: string | null; created_by: string
        }
        Update: { estado?: string; notas?: string | null; factura_venta_id?: string | null }
        Relationships: [
          { foreignKeyName: "remitos_cliente_id_fkey"; columns: ["cliente_id"]; isOneToOne: false; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "remitos_factura_venta_id_fkey"; columns: ["factura_venta_id"]; isOneToOne: false; referencedRelation: "facturas_venta"; referencedColumns: ["id"] },
          { foreignKeyName: "remitos_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      audit_log: {
        Row: {
          id: number; usuario_id: string | null; accion: string; entidad: string
          entidad_id: string | null; datos: Json | null; created_at: string
        }
        Insert: {
          usuario_id?: string | null; accion: string; entidad: string
          entidad_id?: string | null; datos?: Json | null
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      v_productos_bajo_minimo: {
        Row: {
          id: string | null; nombre: string | null; descripcion: string | null
          categoria: 'VIDRIO' | 'ALUMINIO' | 'ACCESORIO' | 'INSUMO' | null
          unidad_medida: 'UNIDAD' | 'M2' | 'ML' | null
          costo_actual: number | null; margen_ganancia: number | null; precio_venta: number | null
          stock_actual: number | null; stock_minimo: number | null; activo: boolean | null
          created_at: string | null; updated_at: string | null
        }
        Relationships: []
      }
      v_saldo_caja: {
        Row: { saldo_actual: number | null; total_ingresos: number | null; total_egresos: number | null }
        Relationships: []
      }
      // Totales calculados en la base — ver
      // supabase/migrations/20260904000500_vistas_resumen.sql
      v_resumen_ventas: {
        Row: {
          cantidad: number; total_facturado: number; total_pendiente: number
          pendientes: number; parciales: number; pagadas: number
        }
        Relationships: []
      }
      v_resumen_compras: {
        Row: {
          cantidad: number; total_facturado: number; total_pendiente: number
          pendientes: number; parciales: number; pagadas: number
        }
        Relationships: []
      }
      v_resumen_pagos: {
        Row: { cantidad: number; total_cobros: number; total_pagos: number }
        Relationships: []
      }
      v_resumen_presupuestos: {
        Row: {
          cantidad: number; total: number; borradores: number; enviados: number
          aprobados: number; rechazados: number; convertidos: number
        }
        Relationships: []
      }
      v_resumen_remitos: {
        Row: { cantidad: number; pendientes: number; entregados: number; cancelados: number }
        Relationships: []
      }
      v_gastos_por_mes: {
        Row: { mes: string; cantidad: number; total: number }
        Relationships: []
      }
      v_gastos_por_categoria_mes: {
        Row: { mes: string; categoria_id: string | null; categoria: string; cantidad: number; total: number }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      get_user_rol: { Args: Record<string, never>; Returns: 'ADMIN' | 'VENDEDOR' | 'DEPOSITO' }
      is_vendedor_or_above: { Args: Record<string, never>; Returns: boolean }

      // ── RPCs transaccionales ────────────────────────────────────────────────
      // Definidas en supabase/migrations/20260904000200_rpc_transaccionales.sql.
      // Escriben cabecera + ítems en una sola transacción; si un trigger aborta,
      // se revierte todo. Pasar p_numero como null asigna el correlativo.
      siguiente_numero: {
        Args: { p_tipo: string }
        Returns: string
      }
      crear_factura_venta: {
        Args: {
          p_cliente_id: string; p_fecha: string; p_tipo_comprobante: string
          p_subtotal: number; p_iva: number; p_total: number
          p_notas: string | null; p_items: Json; p_numero?: string | null
        }
        Returns: FacturaVentaRow
      }
      crear_factura_compra: {
        Args: {
          p_proveedor_id: string; p_fecha: string; p_tipo_comprobante: string
          p_subtotal: number; p_iva: number; p_total: number
          p_notas: string | null; p_items: Json; p_numero?: string | null
        }
        Returns: FacturaCompraRow
      }
      crear_presupuesto: {
        Args: {
          p_arquitecto_id: string; p_cliente_id: string | null; p_obra: string | null
          p_fecha: string; p_validez_dias: number; p_notas: string | null
          p_items: Json; p_numero?: string | null
        }
        Returns: PresupuestoRow
      }
      convertir_presupuesto_en_factura: {
        Args: { p_presupuesto_id: string; p_numero?: string | null }
        Returns: FacturaVentaRow
      }
      registrar_pago: {
        Args: {
          p_tipo: 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'
          p_cliente_id: string | null; p_proveedor_id: string | null
          p_monto: number; p_medio_pago: string; p_fecha: string
          p_notas: string | null; p_imputaciones?: Json
        }
        Returns: PagoRow
      }
      registrar_cobro_venta: {
        Args: {
          p_factura_id: string; p_monto: number
          p_medio_pago: string; p_fecha: string; p_notas?: string | null
        }
        Returns: PagoRow
      }
      crear_remito: {
        Args: {
          p_cliente_id: string; p_fecha: string
          p_factura_venta_id?: string | null; p_notas?: string | null; p_numero?: string | null
        }
        Returns: RemitoRow
      }
      recalcular_precios_proveedor: {
        Args: { p_proveedor_id: string }
        Returns: number
      }
    }
    Enums: {
      rol_usuario: 'ADMIN' | 'VENDEDOR' | 'DEPOSITO'
      categoria_producto: 'VIDRIO' | 'ALUMINIO' | 'ACCESORIO' | 'INSUMO'
      unidad_medida: 'UNIDAD' | 'M2' | 'ML'
      tipo_movimiento_stock: 'ENTRADA' | 'SALIDA' | 'AJUSTE'
      estado_factura: 'PENDIENTE' | 'PARCIAL' | 'PAGADA'
      tipo_pago: 'COBRO_CLIENTE' | 'PAGO_PROVEEDOR'
      tipo_movimiento_caja: 'INGRESO' | 'EGRESO' | 'AJUSTE'
      condicion_iva: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Alias convenientes
export type Profile        = Tables<'profiles'>
export type Producto       = Tables<'productos'>
export type MovimientoStock = Tables<'movimientos_stock'>
export type Proveedor      = Tables<'proveedores'>
export type FacturaCompra  = Tables<'facturas_compra'>
export type FacturaCompraItem = Tables<'factura_compra_items'>
export type Cliente        = Tables<'clientes'>
export type FacturaVenta   = Tables<'facturas_venta'>
export type Arquitecto     = Tables<'arquitectos'>
export type Presupuesto    = Tables<'presupuestos'>
export type MovimientoCaja = Tables<'movimientos_caja'>
export type CategoriaGasto = Tables<'categorias_gasto'>
export type Gasto          = Tables<'gastos'>
export type Pago           = Tables<'pagos'>
export type PagoFactura    = Tables<'pago_facturas'>
export type CierreCaja     = Tables<'cierres_caja'>
export type Remito         = Tables<'remitos'>

export type ResumenVentas       = Database['public']['Views']['v_resumen_ventas']['Row']
export type ResumenCompras      = Database['public']['Views']['v_resumen_compras']['Row']
export type ResumenPagos        = Database['public']['Views']['v_resumen_pagos']['Row']
export type ResumenPresupuestos = Database['public']['Views']['v_resumen_presupuestos']['Row']
export type ResumenRemitos      = Database['public']['Views']['v_resumen_remitos']['Row']
export type GastosPorMes          = Database['public']['Views']['v_gastos_por_mes']['Row']
export type GastosPorCategoriaMes = Database['public']['Views']['v_gastos_por_categoria_mes']['Row']
