-- Normalizar los strings vacíos históricos a NULL.
--
-- Los formularios enviaban FormData crudo, así que un campo opcional que el
-- usuario no completaba llegaba como '' y se guardaba como '' en vez de NULL.
-- Eso rompe los filtros `is null`, ensucia los reportes y haría colisionar
-- cualquier índice único sobre CUIT (todos los '' son iguales entre sí).
--
-- La app ya no genera estos valores; esto limpia lo que quedó cargado.

update clientes set
  apellido     = nullif(btrim(apellido), ''),
  razon_social = nullif(btrim(razon_social), ''),
  cuit         = nullif(btrim(cuit), ''),
  telefono     = nullif(btrim(telefono), ''),
  email        = nullif(btrim(email), ''),
  direccion    = nullif(btrim(direccion), ''),
  notas        = nullif(btrim(notas), '')
where btrim(coalesce(apellido, 'x'))     = ''
   or btrim(coalesce(razon_social, 'x')) = ''
   or btrim(coalesce(cuit, 'x'))         = ''
   or btrim(coalesce(telefono, 'x'))     = ''
   or btrim(coalesce(email, 'x'))        = ''
   or btrim(coalesce(direccion, 'x'))    = ''
   or btrim(coalesce(notas, 'x'))        = '';

update proveedores set
  cuit          = nullif(btrim(cuit), ''),
  condicion_iva = nullif(btrim(condicion_iva::text), '')::condicion_iva,
  contacto      = nullif(btrim(contacto), ''),
  telefono      = nullif(btrim(telefono), ''),
  email         = nullif(btrim(email), ''),
  direccion     = nullif(btrim(direccion), ''),
  alias_cbu     = nullif(btrim(alias_cbu), ''),
  cbu           = nullif(btrim(cbu), ''),
  notas         = nullif(btrim(notas), '')
where btrim(coalesce(cuit, 'x'))      = ''
   or btrim(coalesce(contacto, 'x'))  = ''
   or btrim(coalesce(telefono, 'x'))  = ''
   or btrim(coalesce(email, 'x'))     = ''
   or btrim(coalesce(direccion, 'x')) = ''
   or btrim(coalesce(alias_cbu, 'x')) = ''
   or btrim(coalesce(cbu, 'x'))       = ''
   or btrim(coalesce(notas, 'x'))     = '';

update arquitectos set
  apellido  = nullif(btrim(apellido), ''),
  estudio   = nullif(btrim(estudio), ''),
  telefono  = nullif(btrim(telefono), ''),
  email     = nullif(btrim(email), ''),
  direccion = nullif(btrim(direccion), ''),
  notas     = nullif(btrim(notas), '')
where btrim(coalesce(apellido, 'x'))  = ''
   or btrim(coalesce(estudio, 'x'))   = ''
   or btrim(coalesce(telefono, 'x'))  = ''
   or btrim(coalesce(email, 'x'))     = ''
   or btrim(coalesce(direccion, 'x')) = ''
   or btrim(coalesce(notas, 'x'))     = '';

update productos set descripcion = nullif(btrim(descripcion), '')
where btrim(coalesce(descripcion, 'x')) = '';
