import { catalogRules, validateCatalogText } from './catalog-rules.mjs';

const root=document.querySelector('#root');
const toast=document.querySelector('#toast');
const formatter=new Intl.NumberFormat('es-PE',{maximumFractionDigits:4});
const factorFormat=new Intl.NumberFormat('es-PE',{maximumFractionDigits:6});
const moneyFormat=new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',minimumFractionDigits:2,maximumFractionDigits:4});
const dateFormat=new Intl.DateTimeFormat('es-PE',{dateStyle:'short',timeStyle:'short',timeZone:'America/Lima'});
const qty=value=>value==null?'—':formatter.format(value);
const cost=value=>value==null?'—':'S/ '+new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:6}).format(value);
const money=value=>value==null?'—':moneyFormat.format(value);
const date=value=>value?dateFormat.format(new Date(value)):'—';
const esc=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
const s=(a,b)=>String(a)===String(b);
const catalogNavigation=[
  ['articulos','Artículos'],['unidades','Unidades'],['almacenes','Almacenes'],['proveedores','Proveedores'],['clientes','Clientes'],['conversiones','Conversiones']
];
const navGroups=[
  ['General',[['inicio','⌂','Resumen'],['catalogos','▦','Mantenimiento']]],
  ['Operaciones',[['movimientos','⇄','Movimientos'],['kardex','≡','Kardex'],['conteos','✓','Inventario físico']]],
  ['Consultas',[['reportes','▤','Reportes'],['casos','◇','Casos de prueba'],['auditoria','◷','Auditoría']]]
];
const state={user:null,catalogs:null,filters:{},tab:'articulos',report:'valorado',request:0};
const symbols={COMPRA:'Ingreso',VENTA:'Venta',CONSUMO:'Consumo',AJUSTE_ENTRADA:'Sobrante',AJUSTE_SALIDA:'Faltante'};

async function api(endpoint,body) {
  const config=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Nexo-Inventario':'app'},body:JSON.stringify(body)};
  const response=await fetch('/api/'+endpoint,config);
  const data=await response.json();
  if (response.status===401 && !['login','session'].includes(endpoint)) {
    state.user=null;
    renderLogin();
  }
  if (!response.ok) {
    const error=new Error(data.error??'Ocurrió un error en la operación.');
    error.field=data.campo;
    throw error;
  }
  return data;
}
let timer;
function notify(message) {
  toast.textContent=message;
  toast.classList.add('visible');
  clearTimeout(timer);
  timer=setTimeout(()=>toast.classList.remove('visible'),4500);
}
function logo() {
  return '<span class="brand-icon" aria-hidden="true"><i></i><b></b><em></em></span><span>Nexo<small>Inventario</small></span>';
}
function renderLogin() {
  root.innerHTML=`<div class="login">
    <div class="login-art">
      <div class="brand">${logo()}</div>
      <div class="login-copy"><p class="eyebrow">PLATAFORMA DE INVENTARIO</p><h1>Control de<br>inventario<span>.</span></h1>
        <p>Existencias, kardex y valoración por almacén en un mismo espacio.</p>
      </div>
      <div class="stack" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
      <footer>Prototipo académico · Sistema de almacén</footer>
    </div>
    <div class="login-content"><div class="login-panel">
      <h2>Iniciar sesión</h2><p>Ingresa a tu espacio de inventario.</p>
      <form id="login-form">
        <label>Usuario<input name="usuario" autocomplete="username" required placeholder="Usuario" maxlength="60"></label>
        <label>Contraseña<input name="clave" type="password" autocomplete="current-password" required placeholder="Contraseña" maxlength="160"></label>
        <p class="form-error" role="alert"></p>
        <button class="primary" type="submit">Entrar al sistema <span aria-hidden="true">→</span></button>
      </form>
      <div class="login-note">Instalación local · Datos de demostración</div>
    </div></div>
  </div>`;
  bindForm('login-form',async (values)=>{
    state.user=await api('login',values);
    state.catalogs=null;
    showShell();
    navigate();
  });
}
function renderMenu(page) {
  return navGroups.map(([label,items])=>`<div class="nav-group"><p>${label}</p>${items.map(([key,icon,title])=>
    `<a href="#${key}" ${key===page?'class="active" aria-current="page"':''}><i aria-hidden="true">${icon}</i>${title}</a>`
  ).join('')}</div>`).join('');
}
function showShell() {
  root.innerHTML=`<div class="app-shell">
    <aside id="sidebar"><a class="brand" href="#inicio" aria-label="Nexo Inventario, inicio">${logo()}</a>
      <nav id="nav" aria-label="Menú principal"></nav>
      <div class="sidebar-footer"><span class="dot"></span> Entorno académico</div>
    </aside>
    <div class="work">
      <header class="topbar">
        <div><button class="icon-btn mobile-menu" type="button" aria-label="Mostrar menú" aria-expanded="false">☰</button>
          <span class="breadcrumb">Inventario <span>›</span> <strong id="crumb">Resumen</strong></span></div>
        <div class="account"><span class="avatar" aria-hidden="true">${esc(state.user.usuario.slice(0,2).toUpperCase())}</span>
          <span class="account-name">${esc(state.user.nombre)}</span><button class="secondary account-settings" id="manage-account" type="button">Mi cuenta</button><button class="subtle" id="logout" type="button">Salir</button></div>
      </header>
      <main id="screen"></main>
    </div>
    <dialog id="dialog"></dialog>
  </div>`;
  document.querySelector('.mobile-menu').onclick=event=>{
    const open=document.querySelector('#sidebar').classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded',String(open));
  };
  document.querySelector('#manage-account').onclick=accountForm;
  document.querySelector('#logout').onclick=async ()=>{
    try {await api('logout',{});state.user=null;renderLogin();} catch(error){notify(error.message);}
  };
}
const pageFns={inicio:dashboard,catalogos:catalogs,movimientos:movements,kardex,conteos:counts,reportes:reports,casos:cases,auditoria:audit};
const pageNames=Object.fromEntries(navGroups.flatMap(group=>group[1].map(([key,,name])=>[key,name])));
async function navigate() {
  if (!state.user) return;
  const requested=location.hash.slice(1);
  const route=Object.hasOwn(pageFns,requested)?requested:'inicio';
  const screen=document.querySelector('#screen');
  if (!screen) return;
  const request=++state.request;
  document.querySelector('#nav').innerHTML=renderMenu(route);
  document.querySelector('#sidebar').classList.remove('open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');
  document.querySelector('#crumb').textContent=pageNames[route];
  document.title=pageNames[route]+' | Nexo Inventario';
  screen.innerHTML='<p class="loading">Cargando…</p>';
  try {
    state.catalogs??=await api('catalogos');
    const render=await pageFns[route]();
    if (request===state.request && screen.isConnected) {
      screen.innerHTML=render.html;
      render.bind?.();
    }
  } catch(error) {
    if (request===state.request && screen.isConnected) screen.innerHTML=`<p class="callout error">${esc(error.message)}</p>`;
  }
}
window.addEventListener('hashchange',navigate);
function heading(title,intro,action='') {
  return `<div class="page-head"><div><h1>${title}</h1><p>${intro}</p></div>${action}</div>`;
}
function button(text,key='new-record') {return `<button type="button" class="primary" id="${key}">+ ${text}</button>`;}
function showDialog(title,body) {
  const dialog=document.querySelector('#dialog');
  dialog.innerHTML=`<div class="dialog-head"><h2>${title}</h2><button type="button" class="icon-btn" aria-label="Cerrar">×</button></div>${body}`;
  dialog.querySelector('button').onclick=()=>dialog.close();
  if(!dialog.open)dialog.showModal();
  return dialog;
}
function bindForm(formId,action) {
  const form=document.getElementById(formId);
  const errorText=form.querySelector('.form-error');
  form.addEventListener('invalid',event=>{
    const input=event.target;
    input.setAttribute('aria-invalid','true');
    const label=input.closest('label')?.firstChild?.textContent?.trim()||'el campo marcado';
    if(!errorText.textContent)errorText.textContent=input.dataset.format||'Revisa el valor de '+label+'.';
  },true);
  form.oninput=event=>{
    event.target.removeAttribute('aria-invalid');
    errorText.textContent='';
  };
  form.onsubmit=async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type=submit]');
    button.disabled=true;
    errorText.textContent='';
    try {await action(Object.fromEntries(new FormData(form)),form);}
    catch(error) {
      errorText.textContent=error.message;
      const parts=String(error.field??'').split('.');
      const target=parts.length===3?form.querySelectorAll('.movement-line')[Number(parts[1])]?.querySelector('[name='+parts[2]+']'):form.elements.namedItem(parts[0]);
      if(target?.focus){
        target.setAttribute('aria-invalid','true');
        target.focus();
      }
    }
    finally {button.disabled=false;}
  };
}
function accountForm() {
  const account=state.user;
  showDialog('Mi cuenta',`<form id="account-form" class="modal-form">
    <div class="account-intro"><div class="avatar">${esc(account.usuario.slice(0,2).toUpperCase())}</div>
      <div><strong>${esc(account.nombre)}</strong><small class="cell-meta">Usuario · ${esc(account.usuario)}</small></div></div>
    <h3>Cambiar contraseña</h3>
    <div class="form-grid account-fields">
      ${textField('actual','Contraseña actual','','type="password" autocomplete="current-password" maxlength="160" required')}
      ${textField('nueva','Nueva contraseña','','type="password" autocomplete="new-password" minlength="12" maxlength="128" required')}
      ${textField('confirmacion','Confirmar nueva contraseña','','type="password" autocomplete="new-password" minlength="12" maxlength="128" required')}
    </div><p class="form-hint">Usa de 12 a 128 caracteres, con al menos una letra y un número. El cambio cierra las sesiones abiertas.</p>
    ${formBottom('Cambiar contraseña')}</form>`);
  bindForm('account-form',async values=>{
    await api('cuenta/clave',values);
    state.user=null;
    renderLogin();
    notify('Contraseña actualizada. Ingresa con tu nueva contraseña.');
  });
}
const saved=(message)=>{document.querySelector('#dialog')?.close();notify(message);navigate();};
const formBottom=label=>`<p class="form-error" role="alert"></p><div class="dialog-actions"><button type="submit" class="primary">${label}</button></div>`;
const makeOptions=(items,selected)=>items.map(([value,text])=>`<option value="${esc(value)}" ${s(value,selected)?'selected':''}>${esc(text)}</option>`).join('');
function selectField(name,label,items,selected='',placeholder='Seleccionar…',required=true) {
  return `<label>${label}<select name="${name}" ${required?'required':''}><option value="">${placeholder}</option>${makeOptions(items,selected)}</select></label>`;
}
const warehouses=(onlyActive=false)=>state.catalogs.almacenes.filter(x=>!onlyActive||x.activo).map(x=>[x.id_almacen,x.nombre]);
const articles=(onlyActive=false)=>state.catalogs.articulos.filter(x=>!onlyActive||x.activo).map(x=>[x.id_articulo,x.codigo_sku+' · '+x.descripcion]);
const units=()=>state.catalogs.unidades.filter(x=>x.activo).map(x=>[x.id_unidad_medida,x.nombre+' ('+x.abreviatura+')']);
const textField=(name,label,value='',more='')=>`<label>${label}<input name="${name}" value="${esc(value)}" ${more}></label>`;
const numericFields={qty:[4,'Cantidad'],price:[6,'Precio o costo'],count:[4,'Conteo'],factor:[6,'Factor'],reference:[4,'Precio referencial']};
function decimalField(name,label,kind,value='') {
  const [precision,description]=numericFields[kind];
  const positive=kind!=='count'&&kind!=='reference';
  const step='0.'+'0'.repeat(precision-1)+'1';
  return textField(name,label,value,`type="number" min="${positive?step:0}" max="999999999.${'9'.repeat(precision)}" step="${step}" inputmode="decimal" required
    data-format="${description}: número ${positive?'mayor que cero':'desde cero'} con hasta ${precision} decimales."`);
}
const articleCell=(x)=>`<strong>${esc(x.nombre_articulo??x.descripcion??'')}</strong><small class="cell-meta">${esc(x.codigo_sku)}</small>`;
const operationBadge=(code,label)=>`<span class="pill ${code==='COMPRA'||code==='AJUSTE_ENTRADA'?'green':code==='VENTA'?'blue':'neutral'}">${esc(label??symbols[code]??code)}</span>`;
const table=(headers,data,empty='Aún no hay registros para esta consulta.')=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
  ${data.length?data.map(row=>'<tr>'+row.map(cell=>'<td>'+cell+'</td>').join('')+'</tr>').join(''):`<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
function query(name) {
  return new URLSearchParams(Object.entries(state.filters[name]??{}).filter(([,value])=>value)).toString();
}
function filterPanel(name,{dates=false,exportable=false,monthly=false}={}) {
  const values=state.filters[name]??{};
  const first=monthly?values.desde?.slice(0,7):values.desde;
  const last=monthly?values.hasta?.slice(0,7):values.hasta;
  const periodType=monthly?'type="month"':'type="date"';
  return `<form class="filters" id="filters">
    ${selectField('almacen','Almacén',warehouses(),values.almacen,'Todos los almacenes',false)}
    ${selectField('articulo','Artículo',articles(),values.articulo,'Todos los artículos',false)}
    ${dates?textField('desde',monthly?'Mes inicial':'Desde',first,periodType)+textField('hasta',monthly?'Mes final':'Hasta',last,periodType):''}
    <div class="filter-actions"><button class="primary" type="submit">Aplicar</button></div>
    ${exportable?'<div class="export-tools"><span>Exportar</span><button class="secondary export" type="button" data-format="pdf">PDF</button><button class="secondary export" type="button" data-format="xlsx">Excel</button><button class="subtle export" type="button" data-format="csv">CSV</button></div>':''}
  </form>`;
}
function bindFilters(name,exportData) {
  const filters=document.querySelector('#filters');
  filters.onsubmit=event=>{
    event.preventDefault();
    const values=Object.fromEntries(new FormData(filters));
    if(values.desde&&values.hasta&&values.desde>values.hasta){
      notify('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }
    if(name==='utilidad')for(const field of ['desde','hasta'])if(values[field]?.length===7)values[field]+='-01';
    state.filters[name]=values;
    navigate();
  };
  if(exportData)filters.querySelectorAll('[data-format]').forEach(el=>el.onclick=async ()=>{
    const format=el.dataset.format;
    if(format==='csv') {
      downloadCsv(name,exportData.columns,exportData.rows);
      return;
    }
    el.disabled=true;
    try{
      const response=await fetch('/api/'+name+'/exportar/'+format+'?'+query(name));
      if(!response.ok)throw new Error((await response.json()).error);
      const filename=/filename="?([^";]+)/.exec(response.headers.get('Content-Disposition')??'')?.[1]||'nexo-inventario-'+name+'.'+format;
      download(await response.blob(),filename);
      notify('Reporte '+(format==='pdf'?'PDF':'Excel')+' preparado.');
    }catch(error){notify(error.message);}
    finally{el.disabled=false;}
  });
}
function downloadCsv(name,columns,records) {
  const csvCell=value=>{
    let text=String(value??'');
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text))text="'"+text;
    return '"'+text.replaceAll('"','""')+'"';
  };
  const csv=[columns.map(column=>column[0]),...records.map(row=>columns.map(([,key])=>row[key]))]
    .map(row=>row.map(csvCell).join(';')).join('\r\n');
  download(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'nexo-inventario-'+name+'.csv');
}
function download(blob,filename) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function dashboardCard(icon,label,value,footer,tone) {
  return `<article class="stat"><span class="stat-icon ${tone}">${icon}</span><span>${label}</span><strong>${value}</strong><small>${footer}</small></article>`;
}
async function dashboard() {
  const [inventory,moves,profits,counts]=await Promise.all(['valorado','movimientos','utilidad','conteos'].map(item=>api(item)));
  const total=inventory.reduce((sum,item)=>sum+Number(item.valor_inventario),0);
  const gross=profits.reduce((sum,item)=>sum+Number(item.utilidad_bruta),0);
  const perWarehouse=new Map();
  for (const item of inventory) {
    const amount=perWarehouse.get(item.codigo_almacen)?.value??0;
    perWarehouse.set(item.codigo_almacen,{name:item.nombre_almacen.replace(/^\d+ · /,''),value:amount+Number(item.valor_inventario)});
  }
  const sorted=[...perWarehouse.values()].sort((a,b)=>b.value-a.value).slice(0,5);
  const max=sorted[0]?.value||1;
  return {html:`<section class="dashboard-hero"><div class="hero-copy"><div class="hero-kicker"><span class="dot"></span> OPERACIONES DE ALMACÉN</div>
      <h1>Resumen de inventario</h1><p>Consulta existencias, movimientos y resultados por almacén.</p>
      <div class="hero-actions"><button type="button" class="primary" id="quick-move">+ Registrar movimiento</button><a href="#reportes" class="secondary">Ver reportes</a></div></div>
      <div class="hero-figure" aria-hidden="true"><i></i><i></i><i></i><b></b><span></span></div>
      <div class="hero-value"><span>Inventario valorizado</span><strong>${money(total)}</strong><small>Todos los almacenes · PEN</small></div>
    </section>
    <div class="stats">${dashboardCard('✓','Conteos registrados',counts.length,'Tomas físicas y ajustes','green')}
    ${dashboardCard('▦','Artículos activos',state.catalogs.articulos.filter(x=>x.activo).length,'Catálogo de artículos','blue')}
    ${dashboardCard('⇄','Movimientos',moves.length,'Compras, salidas y ajustes','sand')}
    ${dashboardCard('↗','Utilidad bruta',money(gross),'Ventas de todos los períodos','green')}</div>
    <div class="dashboard-grid"><section class="card"><div class="card-head"><div><h2>Valor por almacén</h2><p>Los cinco almacenes con mayor valor</p></div><a href="#reportes">Ver reporte →</a></div>
    <div class="bar-list">${sorted.length?sorted.map(item=>`<div class="bar-row"><div><span>${esc(item.name)}</span><strong>${money(item.value)}</strong></div>
      <progress max="100" value="${item.value/max*100}" aria-label="${esc(item.name)}"></progress></div>`).join(''):'<p class="empty">Registra una compra para ver existencias.</p>'}</div></section>
    <section class="card"><div class="card-head"><div><h2>Inventario físico</h2><p>Últimas tomas registradas</p></div><a href="#conteos">Ver conteos →</a></div>
    <div class="count-summary">${counts.slice(0,4).map(item=>`<div><span class="stat-icon green">✓</span>
      <div><strong>${esc(item.codigo_toma)} · ${esc(item.codigo_sku)}</strong><small>${esc(item.almacen)}</small></div>
      <span class="pill neutral">${qty(item.diferencia_cantidad)} u.</span></div>`).join('')||'<p class="empty">Aún no hay conteos registrados.</p>'}</div>
    <button type="button" class="secondary card-link" id="quick-count">Registrar conteo</button></section></div>
    <section class="card"><div class="card-head"><div><h2>Movimientos recientes</h2><p>Últimas operaciones registradas</p></div><a href="#movimientos">Ver historial →</a></div>
    ${table(['Movimiento','Tipo','Almacén','Fecha y hora'],moves.slice(0,6).map(x=>[
      '<strong>'+esc(x.numero_movimiento)+'</strong>',operationBadge(x.codigo),esc(x.almacen),date(x.fecha_movimiento)]))}</section>`,
    bind(){
      document.querySelector('#quick-move').onclick=()=>movementForm();
      document.querySelector('#quick-count').onclick=()=>countForm();
    }};
}
const catalogFields={
  articulos:{single:'artículo',id:'id_articulo',fields:[['codigo_sku','SKU'],['descripcion','Descripción'],['id_unidad_base','Unidad base'],['precio_venta_ref','Precio referencial por unidad base (S/)']]},
  unidades:{single:'unidad',id:'id_unidad_medida',fields:[['codigo','Código'],['nombre','Nombre'],['abreviatura','Abreviatura']]},
  almacenes:{single:'almacén',id:'id_almacen',fields:[['codigo','Código'],['nombre','Nombre'],['ubicacion','Ubicación']]},
  proveedores:{single:'proveedor',id:'id_proveedor',fields:[['numero_documento','Código de referencia ficticio'],['razon_social','Razón social']]},
  clientes:{single:'cliente',id:'id_cliente',fields:[['numero_documento','Código de referencia ficticio'],['nombre_razon_social','Nombre']]}
};
async function catalogs() {
  const tab=state.tab;
  const spec=catalogFields[tab];
  const lines=state.catalogs[tab];
  const tabs=`<div class="tabs">${catalogNavigation.map(([key,label])=>`<button type="button" data-tab="${key}" aria-pressed="${key===tab}">${label}</button>`).join('')}</div>`;
  let headers, content;
  if (tab==='conversiones') {
    headers=['Artículo','Unidad alternativa','Factor a unidad base'];
    content=lines.map(x=>[esc(articles().find(a=>s(a[0],x.id_articulo))?.[1]),esc(units().find(u=>s(u[0],x.id_unidad_medida))?.[1]??'Unidad inactiva'),factorFormat.format(x.factor_a_base)]);
  } else {
    headers=[...spec.fields.map(field=>field[1]),'Estado',''];
    content=lines.map(x=>[...spec.fields.map(([key])=>{
      if (key==='id_unidad_base') return esc(x.abreviatura);
      if (key==='precio_venta_ref') return money(x.precio_venta_ref);
      return esc(x[key]??'—');
    }),`<span class="pill ${x.activo?'green':'neutral'}">${x.activo?'Activo':'Inactivo'}</span>`,
    `<button class="subtle" type="button" data-edit="${esc(x[spec.id])}">Editar</button>`]);
  }
  const label=spec?'Crear '+spec.single:'Configurar conversión';
  return {
    html:`${heading('Mantenimiento','Gestiona artículos, unidades, almacenes y participantes de las operaciones.',button(label))}
      <section class="card">${tabs}${table(headers,content)}</section>`,
    bind(){
      document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{state.tab=el.dataset.tab;navigate();});
      document.querySelector('#new-record').onclick=()=>tab==='conversiones'?conversionForm():catalogForm(tab);
      document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>catalogForm(tab,lines.find(x=>s(x[spec.id],el.dataset.edit))));
    }
  };
}
function catalogForm(tab,item={}) {
  const spec=catalogFields[tab];
  const existing=item[spec.id];
  const fields=spec.fields.map(([key,label])=>{
    if (key==='id_unidad_base') return selectField(key,label,units(),item[key]);
    if (key==='precio_venta_ref') return decimalField(key,label,'reference',item[key]??'0');
    const rule=catalogRules[tab][key];
    const attributes=[
      'maxlength="'+rule.max+'"',
      'placeholder="'+esc(rule.example)+'"',
      'aria-describedby="catalog-hint-'+key+'"',
      'data-format="'+esc(label+': '+rule.hint)+'"'
    ];
    if (!rule.optional) attributes.push('required');
    return `<div>${textField(key,label,item[key],attributes.join(' '))}
      <small id="catalog-hint-${key}" class="cell-meta">${esc(rule.hint)}</small></div>`;
  }).join('');
  showDialog((existing?'Editar ':'Crear ')+spec.single,`<form id="catalog-form" class="modal-form">
    <div class="form-grid">${fields}${existing?`<label class="check"><input type="checkbox" name="activo" ${item.activo?'checked':''}> Registro activo</label>`:''}</div>
    ${formBottom('Guardar cambios')}</form>`);
  bindForm('catalog-form',async values=>{
    for (const [key,label] of spec.fields) {
      const rule=catalogRules[tab][key];
      if (!rule) continue;
      try {
        values[key]=validateCatalogText(rule,values[key],label);
      } catch (error) {
        error.field=key;
        throw error;
      }
    }
    await api('catalogos/'+tab,{...values,id:existing,activo:existing?values.activo==='on':true});
    state.catalogs=null;
    saved('Catálogo actualizado.');
  });
}
function conversionForm() {
  const node=showDialog('Configurar unidad alternativa',`<form id="conversion-form" class="modal-form"><div class="form-grid">
    ${selectField('articulo','Artículo',articles(true))}
    <div id="conversion-unit"></div>
    ${decimalField('factor','Unidades base por unidad alternativa','factor','1')}
    </div><p class="form-hint">Ejemplo: si un rollo contiene 100 metros, selecciona Rollo e ingresa 100. El factor admite hasta seis decimales.</p>
    ${formBottom('Guardar conversión')}</form>`);
  const form=node.querySelector('form');
  function updateUnit() {
    const product=state.catalogs.articulos.find(x=>s(x.id_articulo,form.elements.articulo.value));
    const options=product?units().filter(([unit])=>!s(unit,product.id_unidad_base)):[];
    node.querySelector('#conversion-unit').innerHTML=selectField('unidad','Unidad alternativa',options,'',
      !product?'Selecciona primero un artículo':options.length?'Seleccionar…':'No hay unidades alternativas activas');
  }
  form.elements.articulo.onchange=updateUnit;
  updateUnit();
  bindForm('conversion-form',async values=>{
    await api('conversiones',values);state.catalogs=null;saved('Conversión guardada.');
  });
}
async function movements() {
  const list=await api('movimientos?'+query('movimientos'));
  return {html:`${heading('Movimientos','Registra compras, ventas y salidas por consumo.',button('Nuevo movimiento'))}
    <section class="card">${filterPanel('movimientos',{dates:true})}${table(['Movimiento','Tipo','Almacén','Destino u origen','Fecha','Líneas',''],list.map(x=>[
      '<strong>'+esc(x.numero_movimiento)+'</strong>',operationBadge(x.codigo),esc(x.almacen),
      esc(x.razon_social??x.nombre_razon_social??x.centro??'Inventario físico'),date(x.fecha_movimiento),x.lineas,
      `<button type="button" class="subtle" data-movement="${esc(x.numero_movimiento)}">Ver detalle</button>`]))}</section>`,
    bind(){
      bindFilters('movimientos');
      document.querySelector('#new-record').onclick=()=>movementForm(state.filters.movimientos?.almacen);
      document.querySelectorAll('[data-movement]').forEach(el=>el.onclick=()=>movementDetail(el.dataset.movement));
    }};
}
const thirdParties=(type)=>({
  COMPRA:['Proveedor',state.catalogs.proveedores.filter(x=>x.activo).map(x=>[x.id_proveedor,x.razon_social])],
  VENTA:['Cliente',state.catalogs.clientes.filter(x=>x.activo).map(x=>[x.id_cliente,x.nombre_razon_social])],
  CONSUMO:['Centro de costo',state.catalogs.centros.filter(x=>x.activo).map(x=>[x.id_centro_costo,x.nombre])]
})[type];
function movementForm(warehouse) {
  const node=showDialog('Nuevo movimiento',`<form id="move-form" class="modal-form"><div class="form-grid">
    ${selectField('tipo','Tipo de operación',[['COMPRA','Ingreso por compra'],['VENTA','Salida por venta'],['CONSUMO','Salida por consumo']],'COMPRA')}
    ${selectField('almacen','Almacén',warehouses(true),warehouse)}
    <div id="party"></div>${textField('nota','Referencia u observación','','maxlength="400" placeholder="Opcional"')}
    </div><div class="line-head"><h3>Artículos del movimiento</h3><button class="secondary" type="button" id="add-line">+ Agregar línea</button></div>
    <div id="lines"></div>${formBottom('Registrar movimiento')}</form>`);
  const form=node.querySelector('form');
  const lines=node.querySelector('#lines');
  const type=()=>form.elements.tipo.value||'COMPRA';
  const updateParty=()=>{
    const [label,options]=thirdParties(type());
    node.querySelector('#party').innerHTML=selectField('tercero',label,options,options.length===1?options[0][0]:'');
  };
  function configure(line,changePrice=true) {
    const article=line.querySelector('select[name=articulo]').value;
    const unitElement=line.querySelector('[data-unit]');
    const current=unitElement.querySelector('select')?.value;
    const item=state.catalogs.articulos.find(x=>s(x.id_articulo,article));
    const conversion=state.catalogs.conversiones.filter(x=>s(x.id_articulo,article));
    const factorByUnit=new Map(conversion.map(x=>[String(x.id_unidad_medida),x.factor_a_base]));
    const options=item?units().filter(([u])=>s(u,item.id_unidad_base)||factorByUnit.has(String(u))):[];
    unitElement.innerHTML=selectField('unidad','Unidad',options,options.some(([u])=>s(u,current))?current:item?.id_unidad_base);
    const input=line.querySelector('input[name=precio]');
    function updatePrice(){
      const unit=unitElement.querySelector('select').value;
      const multiplier=Number(factorByUnit.get(String(unit))??1);
      input.value=type()==='VENTA'&&item?(Number(item.precio_venta_ref)*multiplier).toFixed(4):'';
    }
    const spend=type()==='CONSUMO';
    line.querySelector('[data-price]').hidden=spend;
    line.querySelector('[data-price-label]').textContent=type()==='COMPRA'?'Costo por unidad elegida (S/)':'Precio por unidad elegida (S/)';
    input.required=!spend;
    input.disabled=spend;
    if(changePrice) updatePrice();
    unitElement.querySelector('select').onchange=updatePrice;
  }
  function addLine() {
    if (lines.children.length>=25) return;
    const line=document.createElement('div');
    line.className='movement-line';
    line.innerHTML=`${selectField('articulo','Artículo',articles(true))}<div data-unit></div>
      ${decimalField('cantidad','Cantidad','qty')}
      <label data-price><span data-price-label></span><input name="precio" type="number" min="0.000001" step="0.000001"
        max="999999999.999999" inputmode="decimal" data-format="Ingresa un importe positivo con hasta 6 decimales." required></label>
      <button type="button" class="icon-btn" aria-label="Quitar línea">×</button>`;
    lines.append(line);
    configure(line);
    line.querySelector('select').onchange=()=>configure(line);
    line.querySelector('button').onclick=()=>{if (lines.children.length>1) line.remove();else notify('El movimiento debe tener una línea.');};
  }
  form.elements.tipo.onchange=()=>{updateParty();for (const line of lines.children) configure(line);};
  node.querySelector('#add-line').onclick=addLine;
  updateParty();
  addLine();
  bindForm('move-form',async values=>{
    const body={tipo:values.tipo,almacen:values.almacen,tercero:values.tercero,nota:values.nota,
      lineas:[...lines.children].map(line=>Object.fromEntries([...line.querySelectorAll('input,select')].map(el=>[el.name,el.value])))};
    const result=await api('movimientos',body);state.catalogs=null;saved(result.numero+' registrado correctamente.');
  });
}
async function movementDetail(number) {
  try {
    const data=await api('movimientos/'+encodeURIComponent(number));
    showDialog(esc(number),table(['Artículo','Cantidad ingresada','Unidades base','Costo de movimiento','Saldo'],data.map(x=>[
      articleCell(x),qty(x.cantidad_ingresada)+' '+esc(x.abreviatura),qty(x.cantidad_base),money(x.costo_total_mov),qty(x.saldo_cantidad)])));
  } catch(error) {notify(error.message);}
}
async function kardex() {
  const items=await api('kardex?'+query('kardex'));
  const displayed=[...items].reverse();
  const columns=[['Orden','orden_cronologico'],['Movimiento','numero_movimiento'],['Operación','tipo'],['Almacén','almacen'],
    ['SKU','codigo_sku'],['Entrada','cantidad_entrada'],['Salida','cantidad_salida'],['Costo aplicado','costo_unitario_mov'],
    ['Costo de movimiento','costo_total_mov'],['Saldo','saldo_cantidad'],['Costo promedio','costo_promedio_nuevo'],['Valor','saldo_valorizado']];
  return {html:`${heading('Kardex','Sigue las entradas, salidas y saldos al costo promedio ponderado por almacén.')}
    <section class="card">${filterPanel('kardex',{dates:true,exportable:true})}${table(['Movimiento','Artículo y almacén','Entrada','Salida','Costo aplicado','Importe','Saldo','Promedio','Saldo valorizado'],displayed.map(x=>[
      '<strong>'+esc(x.numero_movimiento)+'</strong><small class="cell-meta">'+operationBadge(x.operacion)+'</small>',
      articleCell(x)+'<small class="cell-meta">'+esc(x.almacen)+'</small>',qty(x.cantidad_entrada),qty(x.cantidad_salida),
      cost(x.costo_unitario_mov),money(x.costo_total_mov),qty(x.saldo_cantidad),cost(x.costo_promedio_nuevo),'<strong>'+money(x.saldo_valorizado)+'</strong>']))}</section>`,
    bind(){bindFilters('kardex',{columns,rows:displayed});}};
}
async function counts() {
  const list=await api('conteos?'+query('conteos'));
  return {html:`${heading('Inventario físico','Concilia el conteo y registra diferencias de unidades.',button('Registrar conteo'))}
    <section class="card">${filterPanel('conteos')}${table(['Toma','Artículo','Almacén','Stock al corte','Conteo','Diferencia','Valor diferencia','Ajuste'],list.map(x=>[
      '<strong>'+esc(x.codigo_toma)+'</strong><small class="cell-meta">'+date(x.fecha_corte)+'</small>',articleCell(x),esc(x.almacen),
      qty(x.stock_sistema_corte),qty(x.cantidad_contada_final),qty(x.diferencia_cantidad),money(x.diferencia_valorizada),
      x.ajuste?'<button class="subtle" type="button" data-movement="'+esc(x.ajuste)+'">'+esc(x.ajuste)+'</button>':'<span class="pill neutral">Conciliado</span>']))}</section>`,
    bind(){
      bindFilters('conteos');
      document.querySelector('#new-record').onclick=()=>countForm(state.filters.conteos?.almacen);
      document.querySelectorAll('[data-movement]').forEach(el=>el.onclick=()=>movementDetail(el.dataset.movement));
    }};
}
function countForm(warehouse) {
  const node=showDialog('Registrar conteo físico',`<form id="count-form" class="modal-form"><div class="form-grid">
    ${selectField('almacen','Almacén',warehouses(true),warehouse)}${selectField('articulo','Artículo',articles(true))}
    ${decimalField('cantidad','Cantidad física en unidad base','count')}
    ${textField('nota','Observación','','maxlength="250" placeholder="Opcional"')}</div>
    <p id="count-preview" class="callout">Selecciona el almacén y el artículo para consultar el saldo.</p>
    <p class="form-hint">Si hay diferencia, se registra el movimiento de ajuste al confirmar.</p>
    ${formBottom('Confirmar conteo')}</form>`);
  const form=node.querySelector('form');
  let previewRequest=0;
  form.onchange=async event=>{
    if (!['almacen','articulo'].includes(event.target.name))return;
    const request=++previewRequest;
    const {almacen,articulo}=Object.fromEntries(new FormData(form));
    if (!almacen||!articulo)return;
    try {
      const [item]=await api('valorado?'+new URLSearchParams({almacen,articulo}));
      const article=state.catalogs.articulos.find(x=>s(x.id_articulo,articulo));
      if(request===previewRequest)node.querySelector('#count-preview').textContent='Saldo consultado: '+qty(item?.stock_actual??0)+' '+article.abreviatura+'.';
    } catch(error) {notify(error.message);}
  };
  bindForm('count-form',async values=>{
    const result=await api('conteos',values);state.catalogs=null;saved(result.codigo+(result.ajuste?' · ajuste '+result.ajuste:' · sin diferencia'));
  });
}
async function reports() {
  const name=state.report;
  const valued=name==='valorado';
  const data=await api(name+'?'+query(name));
  const columns=valued?[['Almacén','nombre_almacen'],['SKU','codigo_sku'],['Artículo','nombre_articulo'],['Stock','stock_actual'],
    ['Unidad base','unidad_base'],['Costo promedio','costo_promedio'],['Valor','valor_inventario']]:[
    ['Mes','mes'],['Almacén','nombre_almacen'],['SKU','codigo_sku'],['Artículo','nombre_articulo'],['Unidades base vendidas','unidades_vendidas'],
    ['Ingresos','ingreso_ventas_base'],['Costo de ventas','costo_ventas_cpp'],['Utilidad','utilidad_bruta'],['Margen (%)','margen_bruto_pct']];
  const total=data.reduce((sum,row)=>sum+Number(row[valued?'valor_inventario':'utilidad_bruta']),0);
  return {html:`${heading('Reportes','Consulta el valor de las existencias y la utilidad de las ventas.')}
    <section class="card"><div class="tabs">
    <button type="button" data-report="valorado" aria-pressed="${valued}">Inventario valorado</button>
    <button type="button" data-report="utilidad" aria-pressed="${!valued}">Utilidad bruta</button></div>
    ${filterPanel(name,{dates:!valued,monthly:!valued,exportable:true})}
    <div class="report-total">${valued?'Valor total filtrado':'Utilidad bruta filtrada'} <strong>${money(total)}</strong></div>
    ${valued?table(['Artículo','Almacén','Stock','Costo promedio','Valor del inventario'],data.map(x=>[
      articleCell(x),esc(x.nombre_almacen),qty(x.stock_actual)+' '+esc(x.unidad_base),cost(x.costo_promedio),'<strong>'+money(x.valor_inventario)+'</strong>'
    ])):table(['Período','Artículo','Almacén','Unidades','Ingresos','Costo de ventas','Utilidad','Margen'],data.map(x=>[
      esc(x.mes),articleCell(x),esc(x.nombre_almacen),qty(x.unidades_vendidas),money(x.ingreso_ventas_base),money(x.costo_ventas_cpp),
      '<strong>'+money(x.utilidad_bruta)+'</strong>',qty(x.margen_bruto_pct)+' %']))}</section>`,
    bind(){
      bindFilters(name,{columns,rows:data});
      document.querySelectorAll('[data-report]').forEach(el=>el.onclick=()=>{state.report=el.dataset.report;navigate();});
    }};
}
async function cases() {
  const data=await api('escenarios');
  return {html:`${heading('Casos de prueba','Ocho escenarios académicos basados en catálogos comerciales peruanos.')}
    <div class="case-grid">${data.map(item=>`<section class="card case"><div><span class="pill green">Caso ${esc(item.codigo)}</span><h2>${esc(item.empresa)}</h2><p>${esc(item.objetivo)}</p></div>
      <div><strong>${esc(item.descripcion)}</strong><small class="cell-meta">${esc(item.almacen)}${item.almacen_secundario?' / '+esc(item.almacen_secundario):''}</small>
      <small class="cell-meta">Precio publicado ${money(item.precio_publicado)} · <a href="${esc(item.referencia)}" target="_blank" rel="noopener noreferrer">Ver ficha</a></small></div>
      <p class="callout"><strong>Resultado esperado</strong><br>${esc(item.esperado)}</p><button class="secondary" type="button" data-case="${esc(item.codigo)}">Consultar kardex →</button></section>`).join('')}</div>`,
    bind(){document.querySelectorAll('[data-case]').forEach(el=>el.onclick=()=>{
      const found=data.find(a=>a.codigo===el.dataset.case);
      state.filters.kardex={almacen:found.id_almacen,articulo:found.id_articulo};
      location.hash='kardex';
    });}};
}
async function audit() {
  const records=await api('auditoria');
  return {html:`${heading('Auditoría','Consulta los últimos 200 cambios en los catálogos y operaciones.')}
    <section class="card">${table(['Evento','Tabla','Registro','Acción','Usuario','Fecha'],records.map(x=>[
      esc(x.id_auditoria),esc(x.tabla_afectada),esc(x.id_registro_afectado),esc(x.accion),esc(x.usuario_evento),date(x.fecha_evento)]))}</section>`};
}
try {state.user=await api('session');showShell();await navigate();}
catch {renderLogin();}
