# Guía rápida del sistema

Esta guía explica **sólo lo que cambió** en esta última actualización, paso a paso.
No hace falta saber nada técnico: son las pantallas de siempre, con cosas nuevas.

Resumen de lo nuevo:

1. [**Caja**: todo lo que entra y sale se carga acá](#1-caja)
2. [Gastos: todos los egresos, por categoría](#2-gastos)
3. [Proveedores: dónde se cargan y el Alias / CBU](#3-proveedores)
4. [Facturas de compra: stock automático y el IVA](#4-facturas-de-compra)
5. [Remitos: poner el monto a mano](#5-remitos)
6. [Obras: asignarle un arquitecto](#6-obras)
7. [Presupuestos: hacerlos sobre una obra](#7-presupuestos)
8. [Stock: ajustar para arriba **y para abajo**](#8-ajustar-el-stock)

---

## 1. Caja

**Caja es el único lugar donde se carga plata.** Una venta en el local, un gasto,
un pago a un proveedor: todo entra por acá. Así la plata se registra una sola vez
y el saldo siempre cierra.

Menú → **💰 Caja** → **+ Nuevo movimiento**. Lo primero que elegís:

| | |
|---|---|
| **↑ Entra plata** | Una venta, o cualquier otro ingreso |
| **↓ Sale plata** | Un gasto, un pago a proveedor, un retiro |

### Si entra plata

Después te pregunta de qué es:

**A) Venta de productos.** Elegís del stock qué se vendió. Por cada producto podés
cambiar la cantidad y el precio (viene el de la lista, pero lo pisás si hiciste un
precio especial). El sistema:

- **descuenta el stock solo**,
- genera el ticket, que podés imprimir,
- y registra la plata en caja, ya cobrada.

El cliente es opcional: si no elegís ninguno, la venta queda a nombre de
*Consumidor final*, que es lo normal en el mostrador. Si es un cliente que tenés
cargado, elegilo de la lista.

> Si no hay stock suficiente de algo, el sistema no te deja y te dice cuánto hay.
> No queda la venta cargada a medias.

**B) Otro motivo.** Un aporte, un reintegro, lo que sea: escribís de qué es y el
monto.

### Si sale plata

Elegís la **categoría**, que es obligatoria:

| Categoría | Para |
|---|---|
| **Proveedor** | Pagarle a un proveedor |
| **Servicio** | Luz, gas, agua, internet, teléfono |
| **Retiro** | Plata que se saca de la caja |
| **Varios** | Lo que no entra en ninguna otra |
| **Vehículos** | Arreglos, seguro, patente |
| **Combustible** | Nafta, gasoil |

**Si elegís Proveedor** se abre la parte importante: elegís a quién le pagaste y
el sistema te muestra **sus facturas con saldo pendiente**. Ahí cargás cuánto le
pagás a cada una.

> **No hace falta pagar la factura completa.** Si una factura debe $200.000 y le
> cargás $100.000, quedan $100.000 pendientes en esa misma factura, y el total que
> le debés al proveedor baja $100.000. La pantalla te va mostrando cuánto queda
> pendiente en cada una.
>
> Si pagás más de lo que imputás, el resto queda **a cuenta** del proveedor.

**Con cualquier otra categoría** sólo escribís el detalle y el monto.

### En todos los casos

Siempre se pide **medio de pago** (efectivo, transferencia, tarjeta, cheque) y la
**fecha**.

### Ver todo

La pantalla de Caja muestra:

- **El saldo actual**, y los totales que entraron y salieron.
- **Gráficos** de entradas y salidas, que podés ver **por día, por semana o por
  mes**. Pasá el mouse por una barra para ver el detalle de ese día.
- **Las salidas por categoría** del mes, para ver en qué se te va la plata.
- **Todos los movimientos**, con su categoría, que podés filtrar y buscar.
- **Los cierres**, en la pestaña de al lado.

### Cierre del día

Botón **Cierre del día**. El sistema te dice cuánto debería haber según los
movimientos; vos contás la caja y pones cuánto hay de verdad. Queda guardada la
diferencia.

### El botón Ajuste

Es sólo para corregir una diferencia de conteo que no sabés de dónde salió. **No
lo uses para cargar una venta ni un gasto**: esos van por *+ Nuevo movimiento*,
que les pone categoría.

---

## 2. Gastos

Menú → **📋 Gastos**. Es la pantalla para **mirar** los egresos, no para cargarlos.

Muestra **todo lo que salió de caja**, incluidos los pagos a proveedores, con su
categoría. Podés:

- cambiar de **mes**,
- filtrar por **categoría**,
- buscar por detalle o proveedor,
- **exportar a Excel**.

Arriba ves el total del mes y cuánto se fue en cada categoría.

### Editar o borrar

**Todas las filas** se pueden editar y eliminar, con los botones de la derecha.

- **Un gasto común** (servicio, combustible, varios…): cambiás la categoría, el
  detalle, el monto, la fecha o el medio de pago. Al eliminarlo también se borra
  su movimiento de caja.
- **Un pago a proveedor**: el modal te muestra el proveedor y las facturas con el
  reparto que tiene hoy. Si cambiás el monto, **repartilo de nuevo** entre las
  facturas. Al eliminarlo, **el saldo de las facturas que pagaba vuelve a quedar
  pendiente**, así que la deuda con ese proveedor sube de nuevo.

> Si un gasto común en realidad era un pago a proveedor, eliminalo y cargalo de
> nuevo desde Caja: así se imputa a sus facturas. No se puede convertir en el
> lugar, porque un pago necesita saber a qué factura va.

---

## 3. Proveedores

### Dónde se cargan

Menú de la izquierda → **🏭 Proveedores** → botón **+ Nuevo proveedor**.

### El Alias y el CBU

Son **dos campos separados** en la ficha del proveedor:

- **Alias CBU** → el alias, tipo `aberturas.sp.mp`
- **CBU** → los 22 números

Antes la lista mostraba sólo el alias, y si cargabas el CBU parecía que no se
había guardado. **Ya está arreglado**: la columna de la lista ahora se llama
**Alias / CBU** y muestra los dos.

> **Si un dato sigue apareciendo como `-`:** es que ese campo quedó vacío.
> Entrá a **Editar** el proveedor, completalo y guardá.

---

## 4. Facturas de compra

Las facturas de compra son las que **suman stock automáticamente**.

### Dónde se cargan

Menú → **🏭 Proveedores** → en la fila del proveedor, botón **+ Factura**.

> Ojo: la sección **🛒 Compras** es sólo para *mirar* las facturas ya cargadas
> y ver cuáles están pagas o pendientes. Para cargar una nueva, entrá por
> Proveedores.

### Cómo cargarla

Tenés dos caminos:

**A) Sacarle una foto / subir el PDF (lo más rápido)**

1. Apretá donde dice subir el archivo y elegí la foto o el PDF de la factura.
   Sirven JPG, PNG, WEBP y PDF.
2. Esperá unos segundos: el sistema lee la factura solo y completa el número,
   la fecha, el IVA y los renglones.
3. **Revisá lo que completó** y corregí lo que haga falta.
4. Guardá.

   Los renglones que el sistema reconoce contra tu catálogo se enlazan solos.
   Los que **no** reconoce se cargan como **producto nuevo**: antes de guardar,
   revisá que el nombre y la unidad de medida estén bien, porque ese producto
   va a quedar creado en el catálogo.

**B) A mano**, cargando los renglones uno por uno.

En los dos casos, al guardar la factura **el stock de cada producto sube solo**.
No hay que cargar el movimiento de stock aparte.

### El IVA

**El total es el que dice la factura.** Ese importe ya tiene el IVA adentro, así que
el sistema no le suma nada encima: lo que hace es **discriminarlo**, o sea decirte
cuánto de ese total es IVA.

Vas a ver tres renglones:

| Renglón | Qué es |
|---|---|
| **Total de la factura** | El importe final impreso en el papel. **Es el que manda.** |
| **IVA** | Cuánto de ese total es impuesto |
| **Neto (sin IVA)** | El total menos el IVA |

Cuando escaneás la factura, el sistema completa el total y el IVA con lo que lee
del comprobante. Si el IVA no está discriminado en el papel, tenés los botones
**21%** y **10,5%** que lo calculan hacia adentro, y **Sin IVA** para dejarlo en cero.

> **Antes el total salía inflado**, porque sumaba los renglones y encima le sumaba
> el IVA otra vez. Ya está arreglado: ahora vale el total impreso.

Si los renglones que cargaste no suman el total de la factura, el sistema te avisa
en un cartel amarillo, pero **vale el total**. Suele pasar con un descuento global
o con un renglón que no se leyó bien.

---

## 5. Remitos

### El cambio

Antes, para poner un importe en el remito había que elegir un producto y el
sistema sacaba el precio de la lista. **Ahora el monto lo ponés vos**, siempre.

### Cómo se hace

Menú → **🚚 Remitos** → **+ Nuevo remito**. Completás cliente y fecha, y abajo,
en **Detalle**, tenés dos formas de agregar renglones:

| Querés… | Hacé esto |
|---|---|
| Algo que está en el catálogo | Elegilo en **Agregar un producto del catálogo…** |
| Algo que no está en el catálogo | Apretá **+ Renglón libre** y escribí la descripción |

**En los dos casos el precio queda editable.** Si elegís un producto, el sistema
te sugiere el precio de lista para no escribirlo de cero, pero lo pisás y listo:
si la lista dice $20.000 y vos ponés $7.500, el remito sale por $7.500.

El subtotal y el total se recalculan solos a medida que escribís.

### Dos cosas para tener en cuenta

- **Un remito puede ir sin ningún renglón.** Si sólo querés el comprobante de
  entrega, dejá el detalle vacío y guardá.
- **El remito no toca el stock.** El stock lo descuenta la **venta** que cargás en
  Caja. Así un mismo producto no se descuenta dos veces.

---

## 6. Obras

Es una sección **nueva**. Una obra es el trabajo concreto —una casa, un edificio,
un local— y **cada obra tiene su arquitecto**.

### Crear una obra

Menú → **🏗️ Obras** → **+ Nueva obra**.

| Campo | ¿Obligatorio? | Para qué sirve |
|---|---|---|
| **Nombre de la obra** | Sí | Cómo la vas a reconocer. Ej: *Torre Belgrano* |
| **Arquitecto** | Sí | El arquitecto a cargo |
| **Cliente** | No | Podés dejarlo en *Sin cliente asignado* y completarlo después |
| **Dirección** | No | Dónde queda |
| **Notas** | No | Lo que quieras anotar |

> El arquitecto tiene que existir antes. Si no está, crealo primero en
> **📐 Arquitectos**.

### La lista de obras

Arriba ves cuántas obras activas tenés, cuántos arquitectos están trabajando y
cuántos presupuestos hay en total. El buscador encuentra por nombre de obra,
arquitecto, cliente o dirección.

### Terminar una obra: **Archivar**, no borrar

Cuando una obra termina, apretá **Archivar**. La obra:

- desaparece del selector al cargar presupuestos nuevos,
- pero **sigue existiendo**, y los presupuestos viejos siguen mostrando a qué
  obra pertenecen.

Si te equivocaste, el botón pasa a decir **Reactivar** y la volvés a habilitar.

> Por eso no hay botón de borrar: si se borrara la obra, los presupuestos
> quedarían huérfanos.

---

## 7. Presupuestos

Menú → **📄 Presupuestos** → **+ Nuevo presupuesto**.

### Lo que cambió

Ahora hay un selector de **Obra**. Cuando elegís una obra:

- el **arquitecto se completa solo** (es el de la obra) y queda bloqueado,
- el **cliente también se completa solo**, si la obra tiene uno.

Al lado de Arquitecto vas a ver la aclaración *(lo define la obra)*. Está
bloqueado a propósito: el arquitecto es del trabajo, no del presupuesto, y si se
pudiera cambiar acá el presupuesto diría una cosa y la obra otra.

### ¿Y si el presupuesto no es para ninguna obra?

Dejá el selector en **— Sin obra —** y elegí el arquitecto a mano, como antes.
Nada de lo viejo se rompe.

> Si el selector dice *"No hay obras cargadas"*, andá a **🏗️ Obras** y creá una.

---

## 8. Ajustar el stock

Menú → **📦 Stock** → en la fila del producto, botón **Movimiento**.

### Los tres tipos

| Tipo | Qué hace | Cuándo usarlo |
|---|---|---|
| **Entrada** | **Suma** al stock | Entró mercadería que no vino por una factura de compra |
| **Salida** | **Resta** del stock | Salió mercadería que no salió por una venta |
| **Ajuste por conteo** | **Deja el stock en el número que pongas** | Contaste el depósito y el sistema no coincide |

### El cambio importante

Antes el ajuste **sólo podía sumar**. Si el sistema decía 10 y en el depósito
había 6, no había manera de bajarlo. **Ya está arreglado.**

Ahora el ajuste funciona como un conteo: **escribís cuánto hay de verdad** y el
stock queda en ese número, sea más o sea menos.

**Ejemplo.** El sistema dice que tenés 10 m² de espejo. Contás y hay 6:

1. Apretá **Movimiento** → Tipo: **Ajuste por conteo**
2. En **Stock contado**, poné `6`
3. Abajo te avisa: *El stock queda en 6 m².*
4. En **Motivo**, escribí por qué. Ej: *conteo de depósito*
5. Registrar → el stock pasó de 10 a 6 ✅

Si se rompió todo, poné **0**. También vale.

> **Cuidado:** en el ajuste **no** se pone cuánto sacar, se pone **cuánto queda**.
> Si contaste 6, poné `6`, no `4`. La pantalla te muestra siempre en qué número
> va a terminar el stock antes de que confirmes, así que mirá esa línea.

### Poner el inventario inicial

Para arrancar, usá **Ajuste por conteo** en cada producto y cargá lo que tengas
en el depósito. No importa que el sistema arranque en 0 o en cualquier número:
el ajuste lo deja en el que vos digas.

---

## Preguntas rápidas

**¿Por qué el remito no baja el stock?**
Porque lo baja la venta. Si lo bajaran los dos, el producto se descontaría dos
veces.

**Cargué una factura de compra y el stock no subió.**
Fijate que la factura tenga los renglones cargados: cada renglón suma stock al
guardar. Si el stock subió en un producto que no esperabas, puede ser que el
sistema no haya reconocido el renglón y haya creado un producto nuevo parecido
al que ya tenías. En ese caso corregí el stock de los dos con un
**Ajuste por conteo**.

**Borré sin querer una obra.**
No se puede: las obras se archivan. Buscala en la lista (aparece en gris, con el
cartel *Archivada*) y apretá **Reactivar**.

**El arquitecto del presupuesto está bloqueado y quiero cambiarlo.**
Cambialo en la obra: **🏗️ Obras** → **Editar** → Arquitecto. O sacá la obra del
presupuesto (poné *— Sin obra —*) y elegí el arquitecto a mano.

**Puse mal un ajuste de stock.**
Hacé otro ajuste con el número correcto. El último ajuste manda.

**El total de una factura de compra no coincide con el papel.**
Corregí el campo **Total de la factura** y poné lo que dice el papel: ese es el que
manda. El cartel amarillo sólo te avisa que los renglones no suman lo mismo.

**¿Dónde cargo una venta del local?**
En **💰 Caja → + Nuevo movimiento → Entra plata → Venta de productos**. Descuenta el
stock y registra la plata, todo junto.

**No quiero cargar una ficha de cliente por cada venta del local.**
No hace falta: dejá el cliente vacío y la venta queda a nombre de *Consumidor
final*.

**Le pagué una parte de una factura a un proveedor.**
Se puede: en el egreso de categoría *Proveedor*, cargale a esa factura sólo lo que
le pagaste. El resto queda pendiente en la misma factura.

**Eliminé un pago a proveedor. ¿Qué pasa con la factura?**
Vuelve a quedar con saldo pendiente por lo que ese pago le había imputado, y la
deuda con el proveedor sube de nuevo. El sistema te lo avisa antes de confirmar.

**¿Y el módulo de Ventas?**
Ya no está. Las ventas se cargan desde Caja y se ven ahí mismo, junto con todo lo
demás. Lo que los clientes te deben lo seguís viendo en **💳 Pagos**.
