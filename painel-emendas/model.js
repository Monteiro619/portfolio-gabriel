/* Modelo independente da interface. Valores de demonstração, em reais. */
(function(root) {
  const areas=['Saúde','Educação','Infraestrutura','Assistência social','Esporte e cultura'];
  const cities=['Belo Horizonte','Uberlândia','Montes Claros','Juiz de Fora','Diamantina','Teófilo Otoni','Governador Valadares','Viçosa'];
  const purposes=['Equipamentos para atenção básica','Modernização de escolas','Pavimentação e mobilidade','Estruturação de serviços sociais','Espaços de esporte e cultura'];
  const fields=['id','ano','municipio','uf','area','tipo','beneficiario','objeto','indicado','empenhado','liquidado','pago'];
  function seed(){const rows=[]; for(let year=2024;year<=2026;year++)for(let i=0;i<20;i++){
    const area=i%5, value=(3+(i*7+year)%18)*250000, ratios=[0,.25,.6,.85,1], stage=i%5;
    const committed=stage===0?0:value, settled=stage<2?0:Math.round(value*ratios[stage]), paid=stage<3?0:Math.round(value*(stage===4?1:.45));
    rows.push({id:`DEMO-${year}-${String(i+1).padStart(3,'0')}`,ano:year,municipio:cities[(i*3+year)%8],uf:'MG',area:areas[area],tipo:i%3?'Individual':'Bancada',beneficiario:`Entidade demonstrativa ${i+1}`,objeto:purposes[area],indicado:value,empenhado:committed,liquidado:settled,pago:paid});
  } return rows;}
  function status(r){return r.indicado>0&&r.pago===r.indicado?'Paga':r.pago>0?'Pagamento parcial':r.liquidado>0?'Em liquidação':r.empenhado>0?'Empenhada':'Sem execução';}
  function sum(rows){return rows.reduce((a,r)=>{for(const k of ['indicado','empenhado','liquidado','pago']) a[k]+=r[k];return a;},{indicado:0,empenhado:0,liquidado:0,pago:0});}
  function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function filter(rows,f){return rows.filter(r=>(!f.ano||String(r.ano)===String(f.ano))&&(!f.municipio||r.municipio===f.municipio)&&(!f.area||r.area===f.area)&&(!f.tipo||r.tipo===f.tipo)&&(!f.status||status(r)===f.status)&&(!f.q||normalize([r.id,r.municipio,r.beneficiario,r.objeto].join(' ')).includes(normalize(f.q))));}
  function validate(rows){if(!Array.isArray(rows)||!rows.length||rows.length>5000)throw Error('Informe de 1 a 5.000 registros.');const ids=new Set();return rows.map((original,i)=>{const r={};for(const k of fields)r[k]=original[k];
    for(const k of ['id','municipio','uf','area','tipo','beneficiario','objeto']){r[k]=String(r[k]??'').trim();if(!r[k]||r[k].length>400)throw Error(`Linha ${i+2}: campo ${k} inválido.`);}
    r.ano=Number(r.ano);if(!Number.isInteger(r.ano)||r.ano<2000||r.ano>2100)throw Error(`Linha ${i+2}: ano inválido.`);
    for(const k of ['indicado','empenhado','liquidado','pago']){if(r[k]==null||String(r[k]).trim()==='')throw Error(`Linha ${i+2}: informe ${k}.`);r[k]=Number(r[k]);if(!Number.isFinite(r[k])||r[k]<0||r[k]>1e12)throw Error(`Linha ${i+2}: valor ${k} inválido.`);}
    if(r.pago>r.liquidado||r.liquidado>r.empenhado||r.empenhado>r.indicado)throw Error(`Linha ${i+2}: use pago ≤ liquidado ≤ empenhado ≤ indicado.`);
    if(ids.has(r.id))throw Error(`Identificador repetido: ${r.id}.`);ids.add(r.id);return r;});}
  function csv(rows){const cell=v=>'"'+String(v).replace(/"/g,'""')+'"';return '\uFEFF'+[fields.join(';'),...rows.map(r=>fields.map(k=>cell(typeof r[k]==='string'&&/^[=+@\-]/.test(r[k])?"'"+r[k]:r[k])).join(';'))].join('\r\n');}
  function parseCSV(text){text=text.replace(/^\uFEFF/,'');let lines=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===';'&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))lines.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw Error('CSV com aspas não fechadas.');row.push(cell);if(row.some(v=>v.trim()))lines.push(row);if(lines.length<2)throw Error('CSV sem registros.');const header=lines.shift().map(x=>x.trim());if(fields.some(k=>!header.includes(k)))throw Error('Cabeçalho incompatível. Baixe o modelo CSV.');return validate(lines.map((r,i)=>{if(r.length!==header.length)throw Error(`Linha ${i+2}: número de colunas incompatível.`);return Object.fromEntries(header.map((k,j)=>[k,r[j]]));}));}
  const api={seed,status,sum,filter,validate,csv,parseCSV,fields};if(typeof module!=='undefined')module.exports=api;else root.EmendaModel=api;
})(typeof window==='undefined'?globalThis:window);
