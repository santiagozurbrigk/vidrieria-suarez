// Generado desde el esquema real con:
//   npx supabase gen types typescript --project-id xavpyzyhphcjduycmyuy > lib/supabase/types.ts
//
// NO editar a mano: regenerar después de cada migración. Los alias de
// conveniencia del final son el único agregado propio.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      arquitectos: {
        Row: {
          activo: boolean
          apellido: string | null
          created_at: string
          direccion: string | null
          email: string | null
          estudio: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estudio?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          estudio?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          accion: string
          created_at: string
          datos: Json | null
          entidad: string
          entidad_id: string | null
          id: number
          usuario_id: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          datos?: Json | null
          entidad: string
          entidad_id?: string | null
          id?: never
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          datos?: Json | null
          entidad?: string
          entidad_id?: string | null
          id?: never
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_gasto: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      cierres_caja: {
        Row: {
          created_at: string
          diferencia: number | null
          estado: string
          fecha: string
          id: string
          notas: string | null
          saldo_real: number | null
          saldo_sistema: number
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          diferencia?: number | null
          estado?: string
          fecha: string
          id?: string
          notas?: string | null
          saldo_real?: number | null
          saldo_sistema: number
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          diferencia?: number | null
          estado?: string
          fecha?: string
          id?: string
          notas?: string | null
          saldo_real?: number | null
          saldo_sistema?: number
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cierres_caja_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          apellido: string | null
          condicion_iva: Database["public"]["Enums"]["condicion_iva"] | null
          created_at: string
          cuit: string | null
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          razon_social: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          condicion_iva?: Database["public"]["Enums"]["condicion_iva"] | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          razon_social?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          condicion_iva?: Database["public"]["Enums"]["condicion_iva"] | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          razon_social?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contadores_comprobante: {
        Row: {
          prefijo: string
          tipo: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          prefijo?: string
          tipo: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          prefijo?: string
          tipo?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      factura_compra_items: {
        Row: {
          cantidad: number
          costo_unitario: number
          created_at: string
          factura_compra_id: string
          id: string
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad: number
          costo_unitario: number
          created_at?: string
          factura_compra_id: string
          id?: string
          producto_id: string
          subtotal: number
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          factura_compra_id?: string
          id?: string
          producto_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "factura_compra_items_factura_compra_id_fkey"
            columns: ["factura_compra_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_compra_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_compra_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos_bajo_minimo"
            referencedColumns: ["id"]
          },
        ]
      }
      factura_venta_items: {
        Row: {
          cantidad: number
          created_at: string
          factura_venta_id: string
          id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string
          factura_venta_id: string
          id?: string
          precio_unitario: number
          producto_id: string
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          factura_venta_id?: string
          id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "factura_venta_items_factura_venta_id_fkey"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factura_venta_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos_bajo_minimo"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_compra: {
        Row: {
          archivo_adjunto_path: string | null
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          id: string
          iva: number
          notas: string | null
          numero: string
          proveedor_id: string
          saldo_pendiente: number
          subtotal: number
          tipo_comprobante: string
          total: number
          updated_at: string
        }
        Insert: {
          archivo_adjunto_path?: string | null
          created_at?: string
          created_by: string
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          id?: string
          iva?: number
          notas?: string | null
          numero: string
          proveedor_id: string
          saldo_pendiente: number
          subtotal?: number
          tipo_comprobante?: string
          total: number
          updated_at?: string
        }
        Update: {
          archivo_adjunto_path?: string | null
          created_at?: string
          created_by?: string
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          id?: string
          iva?: number
          notas?: string | null
          numero?: string
          proveedor_id?: string
          saldo_pendiente?: number
          subtotal?: number
          tipo_comprobante?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_compra_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_venta: {
        Row: {
          archivo_adjunto_path: string | null
          cliente_id: string
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          id: string
          iva: number
          notas: string | null
          numero: string
          saldo_pendiente: number
          subtotal: number
          tipo_comprobante: string
          total: number
          updated_at: string
        }
        Insert: {
          archivo_adjunto_path?: string | null
          cliente_id: string
          created_at?: string
          created_by: string
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          id?: string
          iva?: number
          notas?: string | null
          numero: string
          saldo_pendiente: number
          subtotal?: number
          tipo_comprobante?: string
          total: number
          updated_at?: string
        }
        Update: {
          archivo_adjunto_path?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string
          estado?: Database["public"]["Enums"]["estado_factura"]
          fecha?: string
          id?: string
          iva?: number
          notas?: string | null
          numero?: string
          saldo_pendiente?: number
          subtotal?: number
          tipo_comprobante?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_venta_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          archivo_adjunto_path: string | null
          categoria_id: string
          concepto: string
          created_at: string
          fecha: string
          id: string
          medio_pago: string | null
          monto: number
          notas: string | null
          usuario_id: string
        }
        Insert: {
          archivo_adjunto_path?: string | null
          categoria_id: string
          concepto: string
          created_at?: string
          fecha?: string
          id?: string
          medio_pago?: string | null
          monto: number
          notas?: string | null
          usuario_id: string
        }
        Update: {
          archivo_adjunto_path?: string | null
          categoria_id?: string
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          medio_pago?: string | null
          monto?: number
          notas?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_caja: {
        Row: {
          concepto: string
          created_at: string
          fecha: string
          gasto_id: string | null
          id: string
          medio_pago: string | null
          monto: number
          pago_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
          usuario_id: string
        }
        Insert: {
          concepto: string
          created_at?: string
          fecha?: string
          gasto_id?: string | null
          id?: string
          medio_pago?: string | null
          monto: number
          pago_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
          usuario_id: string
        }
        Update: {
          concepto?: string
          created_at?: string
          fecha?: string
          gasto_id?: string | null
          id?: string
          medio_pago?: string | null
          monto?: number
          pago_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento_caja"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_caja_gasto"
            columns: ["gasto_id"]
            isOneToOne: false
            referencedRelation: "gastos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_caja_pago"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_caja_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          created_at: string
          factura_compra_id: string | null
          factura_venta_id: string | null
          fecha: string
          id: string
          motivo: string | null
          producto_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
          usuario_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          factura_compra_id?: string | null
          factura_venta_id?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          producto_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
          usuario_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          factura_compra_id?: string | null
          factura_venta_id?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          producto_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimiento_stock"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mov_factura_compra"
            columns: ["factura_compra_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_mov_factura_venta"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos_bajo_minimo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_facturas: {
        Row: {
          created_at: string
          factura_compra_id: string | null
          factura_venta_id: string | null
          id: string
          monto_imputado: number
          pago_id: string
        }
        Insert: {
          created_at?: string
          factura_compra_id?: string | null
          factura_venta_id?: string | null
          id?: string
          monto_imputado: number
          pago_id: string
        }
        Update: {
          created_at?: string
          factura_compra_id?: string | null
          factura_venta_id?: string | null
          id?: string
          monto_imputado?: number
          pago_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_facturas_factura_compra_id_fkey"
            columns: ["factura_compra_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_facturas_factura_venta_id_fkey"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_facturas_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string
          fecha: string
          id: string
          medio_pago: string
          monto: number
          notas: string | null
          proveedor_id: string | null
          tipo: Database["public"]["Enums"]["tipo_pago"]
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by: string
          fecha?: string
          id?: string
          medio_pago: string
          monto: number
          notas?: string | null
          proveedor_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_pago"]
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          fecha?: string
          id?: string
          medio_pago?: string
          monto?: number
          notas?: string | null
          proveedor_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pago"]
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          precio_unitario: number
          presupuesto_id: string
          producto_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad: number
          created_at?: string
          descripcion: string
          id?: string
          precio_unitario: number
          presupuesto_id: string
          producto_id?: string | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          precio_unitario?: number
          presupuesto_id?: string
          producto_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_items_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_productos_bajo_minimo"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          arquitecto_id: string
          cliente_id: string | null
          convertido_en_factura_id: string | null
          created_at: string
          created_by: string
          estado: string
          fecha: string
          id: string
          notas: string | null
          numero: string
          obra: string | null
          total: number
          updated_at: string
          validez_dias: number
        }
        Insert: {
          arquitecto_id: string
          cliente_id?: string | null
          convertido_en_factura_id?: string | null
          created_at?: string
          created_by: string
          estado?: string
          fecha?: string
          id?: string
          notas?: string | null
          numero: string
          obra?: string | null
          total?: number
          updated_at?: string
          validez_dias?: number
        }
        Update: {
          arquitecto_id?: string
          cliente_id?: string | null
          convertido_en_factura_id?: string | null
          created_at?: string
          created_by?: string
          estado?: string
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string
          obra?: string | null
          total?: number
          updated_at?: string
          validez_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_arquitecto_id_fkey"
            columns: ["arquitecto_id"]
            isOneToOne: false
            referencedRelation: "arquitectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_convertido_en_factura_id_fkey"
            columns: ["convertido_en_factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria_producto"]
          costo_actual: number
          created_at: string
          descripcion: string | null
          id: string
          margen_ganancia: number
          nombre: string
          precio_venta: number
          stock_actual: number
          stock_minimo: number
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria: Database["public"]["Enums"]["categoria_producto"]
          costo_actual?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          margen_ganancia?: number
          nombre: string
          precio_venta?: number
          stock_actual?: number
          stock_minimo?: number
          unidad_medida: Database["public"]["Enums"]["unidad_medida"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_producto"]
          costo_actual?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          margen_ganancia?: number
          nombre?: string
          precio_venta?: number
          stock_actual?: number
          stock_minimo?: number
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          alias_cbu: string | null
          cbu: string | null
          condicion_iva: Database["public"]["Enums"]["condicion_iva"] | null
          contacto: string | null
          created_at: string
          cuit: string | null
          direccion: string | null
          email: string | null
          id: string
          margen_ganancia: number
          notas: string | null
          razon_social: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          alias_cbu?: string | null
          cbu?: string | null
          condicion_iva?: Database["public"]["Enums"]["condicion_iva"] | null
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          margen_ganancia?: number
          notas?: string | null
          razon_social: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          alias_cbu?: string | null
          cbu?: string | null
          condicion_iva?: Database["public"]["Enums"]["condicion_iva"] | null
          contacto?: string | null
          created_at?: string
          cuit?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          margen_ganancia?: number
          notas?: string | null
          razon_social?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      remitos: {
        Row: {
          archivo_adjunto_path: string | null
          cliente_id: string
          created_at: string
          created_by: string
          estado: string
          factura_venta_id: string | null
          fecha: string
          id: string
          notas: string | null
          numero: string
        }
        Insert: {
          archivo_adjunto_path?: string | null
          cliente_id: string
          created_at?: string
          created_by: string
          estado?: string
          factura_venta_id?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          numero: string
        }
        Update: {
          archivo_adjunto_path?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string
          estado?: string
          factura_venta_id?: string | null
          fecha?: string
          id?: string
          notas?: string | null
          numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "remitos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_factura_venta_id_fkey"
            columns: ["factura_venta_id"]
            isOneToOne: false
            referencedRelation: "facturas_venta"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_gastos_por_categoria_mes: {
        Row: {
          cantidad: number | null
          categoria: string | null
          categoria_id: string | null
          mes: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gastos_por_mes: {
        Row: {
          cantidad: number | null
          mes: string | null
          total: number | null
        }
        Relationships: []
      }
      v_productos_bajo_minimo: {
        Row: {
          activo: boolean | null
          categoria: Database["public"]["Enums"]["categoria_producto"] | null
          costo_actual: number | null
          created_at: string | null
          descripcion: string | null
          id: string | null
          margen_ganancia: number | null
          nombre: string | null
          precio_venta: number | null
          stock_actual: number | null
          stock_minimo: number | null
          unidad_medida: Database["public"]["Enums"]["unidad_medida"] | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: Database["public"]["Enums"]["categoria_producto"] | null
          costo_actual?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: string | null
          margen_ganancia?: number | null
          nombre?: string | null
          precio_venta?: number | null
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"] | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: Database["public"]["Enums"]["categoria_producto"] | null
          costo_actual?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: string | null
          margen_ganancia?: number | null
          nombre?: string | null
          precio_venta?: number | null
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: Database["public"]["Enums"]["unidad_medida"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_resumen_compras: {
        Row: {
          cantidad: number | null
          pagadas: number | null
          parciales: number | null
          pendientes: number | null
          total_facturado: number | null
          total_pendiente: number | null
        }
        Relationships: []
      }
      v_resumen_pagos: {
        Row: {
          cantidad: number | null
          total_cobros: number | null
          total_pagos: number | null
        }
        Relationships: []
      }
      v_resumen_presupuestos: {
        Row: {
          aprobados: number | null
          borradores: number | null
          cantidad: number | null
          convertidos: number | null
          enviados: number | null
          rechazados: number | null
          total: number | null
        }
        Relationships: []
      }
      v_resumen_remitos: {
        Row: {
          cancelados: number | null
          cantidad: number | null
          entregados: number | null
          pendientes: number | null
        }
        Relationships: []
      }
      v_resumen_ventas: {
        Row: {
          cantidad: number | null
          pagadas: number | null
          parciales: number | null
          pendientes: number | null
          total_facturado: number | null
          total_pendiente: number | null
        }
        Relationships: []
      }
      v_saldo_caja: {
        Row: {
          saldo_actual: number | null
          total_egresos: number | null
          total_ingresos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      convertir_presupuesto_en_factura: {
        Args: { p_numero?: string; p_presupuesto_id: string }
        Returns: {
          archivo_adjunto_path: string | null
          cliente_id: string
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          id: string
          iva: number
          notas: string | null
          numero: string
          saldo_pendiente: number
          subtotal: number
          tipo_comprobante: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "facturas_venta"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_factura_compra: {
        Args: {
          p_fecha: string
          p_items: Json
          p_iva?: number
          p_notas?: string
          p_numero?: string
          p_proveedor_id: string
          p_subtotal: number
          p_tipo_comprobante?: string
          p_total: number
        }
        Returns: {
          archivo_adjunto_path: string | null
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          id: string
          iva: number
          notas: string | null
          numero: string
          proveedor_id: string
          saldo_pendiente: number
          subtotal: number
          tipo_comprobante: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "facturas_compra"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_factura_venta: {
        Args: {
          p_cliente_id: string
          p_fecha: string
          p_items: Json
          p_iva?: number
          p_notas?: string
          p_numero?: string
          p_subtotal: number
          p_tipo_comprobante?: string
          p_total: number
        }
        Returns: {
          archivo_adjunto_path: string | null
          cliente_id: string
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["estado_factura"]
          fecha: string
          id: string
          iva: number
          notas: string | null
          numero: string
          saldo_pendiente: number
          subtotal: number
          tipo_comprobante: string
          total: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "facturas_venta"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_presupuesto: {
        Args: {
          p_arquitecto_id: string
          p_cliente_id?: string
          p_fecha: string
          p_items: Json
          p_notas?: string
          p_numero?: string
          p_obra?: string
          p_validez_dias?: number
        }
        Returns: {
          arquitecto_id: string
          cliente_id: string | null
          convertido_en_factura_id: string | null
          created_at: string
          created_by: string
          estado: string
          fecha: string
          id: string
          notas: string | null
          numero: string
          obra: string | null
          total: number
          updated_at: string
          validez_dias: number
        }
        SetofOptions: {
          from: "*"
          to: "presupuestos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      crear_remito: {
        Args: {
          p_cliente_id: string
          p_factura_venta_id?: string
          p_fecha: string
          p_notas?: string
          p_numero?: string
        }
        Returns: {
          archivo_adjunto_path: string | null
          cliente_id: string
          created_at: string
          created_by: string
          estado: string
          factura_venta_id: string | null
          fecha: string
          id: string
          notas: string | null
          numero: string
        }
        SetofOptions: {
          from: "*"
          to: "remitos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_vendedor_or_above: { Args: never; Returns: boolean }
      recalcular_precios_proveedor: {
        Args: { p_proveedor_id: string }
        Returns: number
      }
      registrar_cobro_venta: {
        Args: {
          p_factura_id: string
          p_fecha: string
          p_medio_pago: string
          p_monto: number
          p_notas?: string
        }
        Returns: {
          cliente_id: string | null
          created_at: string
          created_by: string
          fecha: string
          id: string
          medio_pago: string
          monto: number
          notas: string | null
          proveedor_id: string | null
          tipo: Database["public"]["Enums"]["tipo_pago"]
        }
        SetofOptions: {
          from: "*"
          to: "pagos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_pago: {
        Args: {
          p_cliente_id?: string
          p_fecha: string
          p_imputaciones?: Json
          p_medio_pago: string
          p_monto: number
          p_notas?: string
          p_proveedor_id?: string
          p_tipo: string
        }
        Returns: {
          cliente_id: string | null
          created_at: string
          created_by: string
          fecha: string
          id: string
          medio_pago: string
          monto: number
          notas: string | null
          proveedor_id: string | null
          tipo: Database["public"]["Enums"]["tipo_pago"]
        }
        SetofOptions: {
          from: "*"
          to: "pagos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      siguiente_numero: { Args: { p_tipo: string }; Returns: string }
    }
    Enums: {
      categoria_producto: "VIDRIO" | "ALUMINIO" | "ACCESORIO" | "INSUMO"
      condicion_iva:
        | "RESPONSABLE_INSCRIPTO"
        | "MONOTRIBUTISTA"
        | "EXENTO"
        | "CONSUMIDOR_FINAL"
      estado_factura: "PENDIENTE" | "PARCIAL" | "PAGADA"
      rol_usuario: "ADMIN" | "VENDEDOR" | "DEPOSITO"
      tipo_movimiento_caja: "INGRESO" | "EGRESO" | "AJUSTE"
      tipo_movimiento_stock: "ENTRADA" | "SALIDA" | "AJUSTE"
      tipo_pago: "COBRO_CLIENTE" | "PAGO_PROVEEDOR"
      unidad_medida: "UNIDAD" | "M2" | "ML"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      categoria_producto: ["VIDRIO", "ALUMINIO", "ACCESORIO", "INSUMO"],
      condicion_iva: [
        "RESPONSABLE_INSCRIPTO",
        "MONOTRIBUTISTA",
        "EXENTO",
        "CONSUMIDOR_FINAL",
      ],
      estado_factura: ["PENDIENTE", "PARCIAL", "PAGADA"],
      rol_usuario: ["ADMIN", "VENDEDOR", "DEPOSITO"],
      tipo_movimiento_caja: ["INGRESO", "EGRESO", "AJUSTE"],
      tipo_movimiento_stock: ["ENTRADA", "SALIDA", "AJUSTE"],
      tipo_pago: ["COBRO_CLIENTE", "PAGO_PROVEEDOR"],
      unidad_medida: ["UNIDAD", "M2", "ML"],
    },
  },
} as const

// ── Alias de conveniencia (agregado propio) ──────────────────────────────────

export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']

export type Profile           = Tables<'profiles'>
export type Producto          = Tables<'productos'>
export type MovimientoStock   = Tables<'movimientos_stock'>
export type Proveedor         = Tables<'proveedores'>
export type FacturaCompra     = Tables<'facturas_compra'>
export type FacturaCompraItem = Tables<'factura_compra_items'>
export type Cliente           = Tables<'clientes'>
export type FacturaVenta      = Tables<'facturas_venta'>
export type Arquitecto        = Tables<'arquitectos'>
export type Presupuesto       = Tables<'presupuestos'>
export type MovimientoCaja    = Tables<'movimientos_caja'>
export type CategoriaGasto    = Tables<'categorias_gasto'>
export type Gasto             = Tables<'gastos'>
export type Pago              = Tables<'pagos'>
export type PagoFactura       = Tables<'pago_facturas'>
export type CierreCaja        = Tables<'cierres_caja'>
export type Remito            = Tables<'remitos'>

export type ResumenVentas         = Views<'v_resumen_ventas'>
export type ResumenCompras        = Views<'v_resumen_compras'>
export type ResumenPagos          = Views<'v_resumen_pagos'>
export type ResumenPresupuestos   = Views<'v_resumen_presupuestos'>
export type ResumenRemitos        = Views<'v_resumen_remitos'>
export type GastosPorMes          = Views<'v_gastos_por_mes'>
export type GastosPorCategoriaMes = Views<'v_gastos_por_categoria_mes'>
