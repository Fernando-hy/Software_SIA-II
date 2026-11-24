import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const palette={navy:'#171F3C',purple:'#5946BC',ink:'#162238',muted:'#50607A',light:'#EEF0F7',line:'#DBE0ED'};
const columns={
  valorado:[
    ['Código','codigo_sku',.095],['Artículo','nombre_articulo',.245],['Almacén','nombre_almacen',.20],
    ['Stock','stock_actual',.10,'qty'],['Unidad','unidad_base',.08],['Costo promedio','costo_promedio',.13,'cost'],
    ['Saldo valorizado','valor_inventario',.15,'money']
  ],
  utilidad:[
    ['Mes','mes',.08],['SKU','codigo_sku',.09],['Artículo','nombre_articulo',.19],['Almacén','nombre_almacen',.145],
    ['Unidades','unidades_vendidas',.08,'qty'],['Ingreso','ingreso_ventas_base',.11,'money'],
    ['Costo','costo_ventas_cpp',.105,'money'],['Utilidad','utilidad_bruta',.11,'money'],['Margen (%)','margen_bruto_pct',.09,'pct']
  ],
  kardex:[
    ['Movimiento','numero_movimiento',.10],['SKU','codigo_sku',.081],['Almacén','almacen',.14],['Tipo','tipo',.121],
    ['Entrada','cantidad_entrada',.07,'qty'],['Salida','cantidad_salida',.065,'qty'],
    ['Costo aplicado','costo_unitario_mov',.106,'cost'],['Saldo','saldo_cantidad',.073,'qty'],
    ['Promedio','costo_promedio_nuevo',.114,'cost'],['Saldo valorizado','saldo_valorizado',.13,'money']
  ]
};
const titles={valorado:'Inventario valorado',utilidad:'Utilidad bruta por artículo',kardex:'Kardex valorizado'};
const totals={
  valorado:[['Valor total filtrado','valor_inventario']],
  utilidad:[['Ingresos','ingreso_ventas_base'],['Costo de ventas','costo_ventas_cpp'],['Utilidad bruta','utilidad_bruta']]
};
const formats={qty:'#,##0.####',cost:'"S/ "#,##0.00####',money:'"S/ "#,##0.00##',pct:'0.00'};
const digits={qty:4,cost:6,money:4,pct:2};
const fmt=(value,kind)=> {
  if (value==null) return '—';
  if (!kind) return String(value);
  const options={maximumFractionDigits:digits[kind],minimumFractionDigits:['money','cost','pct'].includes(kind)?2:0};
  const text=new Intl.NumberFormat('es-PE',options).format(Number(value));
  return ['money','cost'].includes(kind)?'S/ '+text:text;
};
const sheetDate=new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'});
const normalize=s=>String(s).replace(/[\p{Cc}\p{Cf}]/gu,' ');
function filterCaption(kind,meta) {
  const scope=[normalize(meta.warehouse),normalize(meta.article)];
  if (meta.from||meta.to) {
    const trim=value=>kind==='utilidad'?value?.slice(0,7):value;
    scope.push((trim(meta.from)??'Inicio')+' a '+(trim(meta.to)??'Actualidad'));
  }
  return scope.join('  |  ');
}
function totalsFor(kind,records) {
  return (totals[kind]??[]).map(([label,key])=>{
    const cents=records.reduce((sum,row)=>{
      const [whole,fraction='']=String(row[key]??0).split('.');
      const negative=whole.startsWith('-');
      const amount=BigInt(whole.replace('-','')+fraction.padEnd(4,'0').slice(0,4));
      return sum+(negative?-amount:amount);
    },0n);
    return [label,Number(cents)/10000,key];
  });
}
function exportRows(kind,records) {
  return kind==='kardex'?[...records].reverse():records;
}

async function pdf(kind,records,meta) {
  const columnsFor=columns[kind];
  const title=titles[kind];
  const doc=new PDFDocument({size:'A4',layout:'landscape',margin:0,bufferPages:true,
    info:{Title:title,Author:'Nexo Inventario',Subject:'Reporte de inventario en PEN'}});
  const chunks=[];
  const complete=new Promise((resolve,reject)=>{
    doc.on('data',chunk=>chunks.push(chunk));
    doc.on('end',()=>resolve(Buffer.concat(chunks)));
    doc.on('error',reject);
  });
  const firstX=38;
  const lastX=doc.page.width-firstX;
  const width=lastX-firstX;
  const rowWidths=columnsFor.map(([, ,proportion])=>proportion*width);
  const maximumY=doc.page.height-52;
  const stamp=sheetDate.format(meta.when)+' · Lima';
  function drawPageHeader() {
    doc.rect(0,0,doc.page.width,121).fill(palette.navy);
    doc.rect(firstX,25,30,27).fill(palette.purple);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#fff').text('NX',firstX+5,32,{lineBreak:false});
    doc.fontSize(10).text('NEXO INVENTARIO',firstX+41,29,{lineBreak:false});
    doc.font('Helvetica').fontSize(9).fillColor('#C9CCE6').text(stamp,lastX-178,29,{width:178,align:'right',lineBreak:false});
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#fff').text(title,firstX,57,{lineBreak:false});
    doc.font('Helvetica').fontSize(9).fillColor('#DCE1F4')
      .text(filterCaption(kind,meta),firstX,95,{width,height:14,ellipsis:true});
    doc.rect(firstX,139,width,26).fill(palette.light);
    let x=firstX;
    columnsFor.forEach(([label,,,type],index)=>{
      const cell=rowWidths[index];
      doc.font('Helvetica-Bold').fontSize(8).fillColor(palette.ink).text(label,x+5,148,
        {width:cell-10,align:type?'right':'left',lineBreak:false});
      x+=cell;
    });
    return 165;
  }
  let y=drawPageHeader();
  if (!records.length) {
    doc.font('Helvetica').fontSize(11).fillColor(palette.muted).text('Sin registros para los filtros seleccionados.',firstX+6,y+12);
    y+=38;
  }
  records.forEach((row,index)=>{
    const values=columnsFor.map(([,key,,type])=>normalize(fmt(row[key],type)));
    const lineHeight=doc.font('Helvetica').fontSize(8).currentLineHeight();
    const h=Math.min(46,Math.max(24,...values.map((text,i)=>
      doc.heightOfString(text,{width:rowWidths[i]-10})+12)));
    if(y+h>maximumY){doc.addPage();y=drawPageHeader();}
    if(index%2===1)doc.rect(firstX,y,width,h).fill('#F6F7FB');
    doc.moveTo(firstX,y+h).lineTo(lastX,y+h).lineWidth(.35).stroke(palette.line);
    let x=firstX;
    values.forEach((value,i)=>{
      const cell=rowWidths[i];
      doc.font('Helvetica').fontSize(8).fillColor(palette.ink).text(value,x+5,y+6,
        {width:cell-10,height:Math.max(lineHeight,h-11),ellipsis:true,align:columnsFor[i][3]?'right':'left'});
      x+=cell;
    });
    y+=h;
  });
  const sums=totalsFor(kind,records);
  if (sums.length) {
    if(y+53>maximumY){doc.addPage();y=drawPageHeader();}
    const tileWidth=width/sums.length;
    sums.forEach(([label,value],index)=>{
      const x=firstX+tileWidth*index;
      doc.rect(x,y+13,tileWidth-5,34).fill(palette.light);
      doc.font('Helvetica').fontSize(8).fillColor(palette.muted).text(label,x+8,y+18,{lineBreak:false});
      doc.font('Helvetica-Bold').fontSize(11).fillColor(palette.ink).text(fmt(value,'money'),x+8,y+29,{lineBreak:false});
    });
  }
  const pageCount=doc.bufferedPageRange().count;
  for(let n=0;n<pageCount;n++){
    doc.switchToPage(n);
    const baseline=doc.page.height-29;
    doc.font('Helvetica').fontSize(8).fillColor(palette.muted).text(
      'Nexo Inventario  |  '+records.length+' registros  |  Usuario: '+normalize(meta.user),firstX,baseline,{lineBreak:false});
    doc.text('Página '+(n+1)+' de '+pageCount,lastX-86,baseline,{lineBreak:false,width:86,align:'right'});
  }
  doc.end();
  return complete;
}

async function workbook(kind,records,meta) {
  const columnsFor=columns[kind];
  const book=new ExcelJS.Workbook();
  book.creator='Nexo Inventario';
  book.created=meta.when;
  const sheet=book.addWorksheet(titles[kind],{views:[{state:'frozen',ySplit:4}],
    pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
  const last=columnsFor.length;
  sheet.mergeCells(1,1,1,last);
  const title=sheet.getCell('A1');
  title.value=titles[kind]+' | Nexo Inventario';
  title.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF171F3C'}};
  title.font={bold:true,size:17,color:{argb:'FFFFFFFF'}};
  title.alignment={vertical:'middle',indent:1};
  sheet.getRow(1).height=32;
  sheet.mergeCells(2,1,2,last);
  sheet.getCell('A2').value=filterCaption(kind,meta);
  sheet.mergeCells(3,1,3,last);
  sheet.getCell('A3').value=sheetDate.format(meta.when)+' · Lima | Usuario: '+meta.user+' | '+records.length+' registros · PEN';
  const header=sheet.getRow(4);
  header.values=columnsFor.map(([label])=>label);
  header.height=24;
  header.eachCell(cell=>{
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF5946BC'}};
    cell.font={bold:true,color:{argb:'FFFFFFFF'}};
    cell.alignment={vertical:'middle',wrapText:true};
  });
  columnsFor.forEach(([,key,fraction,type],i)=>{
    const column=sheet.getColumn(i+1);
    column.width=Math.max(14,Math.min(49,185*fraction));
    if(type)column.numFmt=formats[type];
  });
  records.forEach((item,index)=>{
    const row=sheet.addRow(columnsFor.map(([,key,,type])=>item[key]==null?null:type?Number(item[key]):String(item[key])));
    row.height=28;
    row.eachCell(cell=>{
      cell.alignment={vertical:'middle',wrapText:true};
      if (index%2===1)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF2F4FA'}};
    });
  });
  if(records.length) sheet.autoFilter={from:{row:4,column:1},to:{row:4+records.length,column:last}};
  for(const [label,value,key] of totalsFor(kind,records)){
    const row=sheet.addRow([label]);
    const index=columnsFor.findIndex(([,field])=>field===key)+1;
    const sum=row.getCell(index);
    const letter=sheet.getColumn(index).letter;
    sum.value=records.length?{formula:'SUM('+letter+'5:'+letter+(4+records.length)+')',result:value}:0;
    sum.numFmt=formats.money;
    row.font={bold:true,color:{argb:'FF171F3C'}};
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}

export async function exportReport(kind,format,data,meta) {
  const when=new Date();
  const rows=exportRows(kind,data);
  const reportMeta={...meta,when};
  const result=format==='pdf'?await pdf(kind,rows,reportMeta):await workbook(kind,rows,reportMeta);
  return {
    filename:'nexo-inventario-'+kind+'-'+when.toISOString().slice(0,10)+'.'+format,
    type:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    data:result
  };
}
