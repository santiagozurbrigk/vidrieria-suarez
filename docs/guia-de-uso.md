# Guía rápida del sistema

Esta guía explica **sólo lo que cambió** en esta última actualización, paso a paso.
No hace falta saber nada técnico: son las pantallas de siempre, con cosas nuevas.

Resumen de lo nuevo:

1. [**Vender en el local**: qué hacer en el sistema](#1-vender-en-el-local)
2. [Proveedores: dónde se cargan y el Alias / CBU](#2-proveedores)
3. [Facturas de compra: cargan el stock solas](#3-facturas-de-compra)
4. [Remitos: poner el monto a mano](#4-remitos)
5. [Obras: asignarle un arquitecto](#5-obras)
6. [Presupuestos: hacerlos sobre una obra](#6-presupuestos)
7. [Stock: ajustar para arriba **y para abajo**](#7-ajustar-el-stock)

---

## 1. Vender en el local

**Toda venta se registra en el mismo lugar: 🧾 Ventas.** No importa si fue en el
local, por teléfono o a un cliente de siempre.

Son **dos pasos**: primero la factura, después el cobro.

### Paso 1 — Cargar la venta

Menú → **🧾 Ventas** → **+ Nueva factura**.

1. **Cliente.** Si es alguien que compra en el local y no hace falta ficharlo,
   apretá **Venta de mostrador**: la venta queda a nombre de *Consumidor Final*
   y no tenés que cargar una ficha nueva por cada persona.
   Si es un cliente que ya tenés cargado, elegilo de la lista.
2. **Tipo.** *Factura* o *Ticket*, según lo que le des.
3. **Agregá los productos.** El precio sale de la lista, y lo podés cambiar.
4. Guardá.

Al guardar, el sistema **descuenta el stock solo**. La factura queda en estado
**Pendiente**: la mercadería salió, pero la plata todavía no está registrada.

### Paso 2 — Cobrar

En la lista de ventas, en la fila de esa factura, apretá el botón verde
**Cobrar**. Poné el monto y el medio de pago (efectivo, transferencia, tarjeta…)
y confirmá.

Recién ahí **la plata entra a 💰 Caja**, sola. No hace falta cargar nada en Caja
a mano.

| Estado de la factura | Qué significa |
|---|---|
| **Pendiente** | Se entregó la mercadería, no se cobró nada todavía |
| **Parcial** | Pagó una parte, queda saldo |
| **Pagada** | Está cobrada por completo |

### Si te pagan todo en el momento (lo habitual en el local)

Hacés los dos pasos uno atrás del otro: cargás la factura y le das **Cobrar** por
el total. Queda **Pagada**, el stock bajó y la plata está en Caja.

> **¿Por qué dos pasos y no uno?** Porque muchas ventas no se cobran al toque:
> se entrega y se cobra después, o se cobra en cuotas. Separarlo es lo que te
> permite ver en todo momento cuánto te deben, en el cuadro **Por cobrar**.

### Lo que NO hay que usar para una venta

| No uses… | Porque… |
|---|---|
| **💰 Caja** a mano | El cobro ya genera el movimiento solo. Si lo cargás aparte, la plata queda contada dos veces |
| **🚚 Remitos** | El remito es el comprobante de entrega y **no descuenta stock ni registra plata** |
| **📄 Presupuestos** | Es lo que le pasás antes de que te confirme |
| **📦 Stock → Movimiento** | Es para ajustes y roturas, no para ventas. La venta ya descuenta el stock |

---

## 2. Proveedores

### Dónde se cargan

Menú de la izquierda → **🏭 Proveedores** → botón **+ Nuevo proveedor**.

### El Alias y el CBU

Son **dos campos separados** en la ficha del proveedor:

- **Alias CBU** → el alias, tipo `vidrios.suarez.mp`
- **CBU** → los 22 números

Antes la lista mostraba sólo el alias, y si cargabas el CBU parecía que no se
había guardado. **Ya está arreglado**: la columna de la lista ahora se llama
**Alias / CBU** y muestra los dos.

> **Si un dato sigue apareciendo como `-`:** es que ese campo quedó vacío.
> Entrá a **Editar** el proveedor, completalo y guardá.

---

## 3. Facturas de compra

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

### El IVA (esto cambió)

**Antes el total salía inflado**: el sistema sumaba los renglones y encima le
sumaba el IVA otra vez, cuando en la mayoría de las facturas el IVA ya viene
adentro de los precios. **Ya está arreglado.**

Abajo de los totales hay una casilla:

> ☑ **Los importes de los renglones ya incluyen IVA**

| Si la factura es… | La casilla va… | Porque… |
|---|---|---|
| **B, C** o un **ticket** | **Tildada** (viene así) | Los precios que figuran ya tienen el IVA adentro |
| **A** (con el IVA discriminado aparte) | **Destildada** | Los renglones son netos y el IVA se suma para llegar al total |

Cuando escaneás la factura, el sistema **se da cuenta solo** y deja la casilla
como corresponde. Igual conviene mirarla.

**Cómo saber si quedó bien:** abajo del total aparece el **total impreso en el
comprobante**, o sea lo que dice el papel. Los dos números tienen que coincidir.
Si no coinciden, el sistema te avisa en un cartel amarillo y te dice qué revisar
— casi siempre es la casilla del IVA al revés.

---

## 4. Remitos

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
- **El remito no toca el stock.** El stock lo descuenta la **factura de venta**.
  Así un mismo producto no se descuenta dos veces.

---

## 5. Obras

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

## 6. Presupuestos

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

## 7. Ajustar el stock

Menú → **📦 Stock** → en la fila del producto, botón **Movimiento**.

### Los tres tipos

| Tipo | Qué hace | Cuándo usarlo |
|---|---|---|
| **Entrada** | **Suma** al stock | Entró mercadería que no vino por una factura de compra |
| **Salida** | **Resta** del stock | Salió mercadería que no salió por una factura de venta |
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
Porque lo baja la factura de venta. Si lo bajaran los dos, el producto se
descontaría dos veces.

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
Mirá la casilla *Los importes de los renglones ya incluyen IVA*. Si el total
calculado te da más que el impreso, el IVA se está sumando dos veces: tildala.

**Vendí en el local y la plata no aparece en Caja.**
Falta el segundo paso: apretá **Cobrar** en la fila de esa factura. La plata
entra a Caja cuando registrás el cobro, no cuando creás la factura.

**No quiero cargar una ficha de cliente por cada venta del local.**
No hace falta. En la factura de venta apretá **Venta de mostrador** y va contra
la ficha *Consumidor Final*.
