(function(root) {
  'use strict';
  const API = 'https://dadosabertos.camara.leg.br/api/v2';
  const text = v => String(v ?? '').trim();
  const normalize = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function today() {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value = kind => parts.find(p=>p.type===kind).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Informe uma data válida.');
    const d = new Date(value+'T12:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==value) throw Error('Informe uma data válida.');
    return d;
  }
  function shift(value, days) { const d=date(value); d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
  function period(value, kind) {
    const d=date(value);
    if(kind==='day')return {start:value,end:value};
    if(kind==='month')return {start:`${value.slice(0,7)}-01`,end:new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0,12)).toISOString().slice(0,10)};
    const start=shift(value,-((d.getUTCDay()+6)%7));return {start,end:shift(start,6)};
  }
  function validateRange(start,end) {
    const span=(date(end)-date(start))/86400000;
    if(span<0)throw Error('A data final deve ser igual ou posterior à inicial.');
    if(span>92)throw Error('Escolha um intervalo de até 93 dias.');
    return {start,end};
  }
  function safeLink(value, video=false) {
    try { const u=new URL(value), h=u.hostname;
      return u.protocol==='https:'&&(h==='camara.leg.br'||h.endsWith('.camara.leg.br')||(video&&['youtube.com','www.youtube.com','youtu.be'].includes(h)))?u.href:'';
    } catch { return ''; }
  }
  function organ(raw) {return {id:Number(raw.id)||0,sigla:text(raw.sigla),nome:text(raw.nome),apelido:text(raw.apelido),codTipoOrgao:Number(raw.codTipoOrgao)||0,tipoOrgao:text(raw.tipoOrgao)};}
  function group(org) {
    if(org.sigla==='PLEN'||org.codTipoOrgao===27)return 'plenario';
    if(org.sigla!=='MESA'&&normalize(org.tipoOrgao).includes('comiss'))return 'comissoes';
    return 'outros';
  }
  function event(raw) {
    const id=Number(raw.id);if(!Number.isSafeInteger(id)||id<1)throw Error('Evento com identificador inválido.');
    const orgs=(Array.isArray(raw.orgaos)?raw.orgaos:[]).map(organ);
    const groups=[...new Set(orgs.map(group))];
    return {id,start:text(raw.dataHoraInicio),end:text(raw.dataHoraFim),day:text(raw.dataHoraInicio).slice(0,10),
      type:text(raw.descricaoTipo),status:text(raw.situacao),description:text(raw.descricao),organs:orgs,
      groups:groups.length?groups:['outros'],location:text(raw.localExterno)||text(raw.localCamara?.nome)||'Local não informado',
      video:safeLink(raw.urlRegistro,true),document:safeLink(raw.urlDocumentoPauta)};
  }
  const officialURL=e=>`https://www.camara.leg.br/evento-legislativo/${e.id}`;
  function filter(events,f) {
    return events.filter(e=>(!f.start||e.day>=f.start)&&(!f.end||e.day<=f.end)&&(!f.day||e.day===f.day)
      &&(!f.category||e.groups.includes(f.category))&&(!f.organ||e.organs.some(o=>String(o.id)===String(f.organ)))
      &&(!f.type||e.type===f.type)&&(!f.status||e.status===f.status)
      &&(!f.q||normalize([e.type,e.description,e.location,...e.organs.flatMap(o=>[o.sigla,o.nome])].join(' ')).includes(normalize(f.q))));
  }
  const sort=events=>[...events].sort((a,b)=>a.start.localeCompare(b.start)||a.id-b.id);
  function query(start,end,page=1) {validateRange(start,end);return '/eventos?'+new URLSearchParams({dataInicio:start,dataFim:end,pagina:String(page),itens:'100',ordem:'ASC',ordenarPor:'dataHoraInicio'});}
  function agenda(raw) {
    const p=raw.proposicao||raw.proposicao_||{},related=raw.proposicaoRelacionada||raw.proposicaoRelacionada_||{};
    const main=related.id&&related.siglaTipo?related:p;
    return {order:Number(raw.ordem)||0,title:text(raw.titulo),topic:text(raw.topico),regime:text(raw.regime),status:text(raw.situacaoItem),
      opinion:text(raw.textoParecer),relator:text(raw.relator?.nome),propositionId:Number(main.id)||0,
      propositionLabel:main.siglaTipo?`${main.siglaTipo} ${main.numero}${Number(main.ano)>0?'/'+main.ano:''}`:text(main.nome||main.titulo),ementa:text(p.ementa||related.ementa)};
  }
  function overlaps(events) {
    const pairs=[];const cancelled=e=>normalize(e.status).includes('cancelad');
    for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++){
      const a=events[i],b=events[j];if(cancelled(a)||cancelled(b)||!a.start||!b.start||a.day!==b.day)continue;
      if(a.start===b.start||(a.end&&b.end&&a.start<b.end&&b.start<a.end))pairs.push([a.id,b.id]);
    }
    return pairs;
  }
  function backup(data) {
    if(data?.version!==1||!Array.isArray(data.items)||data.items.length>200)throw Error('Backup incompatível com a Agenda.');
    const ids=new Set();return data.items.map(item=>{
      const raw=item.event;
      if(!raw||!Array.isArray(raw.organs))throw Error('Evento inválido no backup.');
      const e=event({id:raw.id,dataHoraInicio:raw.start,dataHoraFim:raw.end,descricaoTipo:raw.type,situacao:raw.status,descricao:raw.description,
        orgaos:raw.organs,localExterno:raw.location,urlRegistro:raw.video,urlDocumentoPauta:raw.document});
      if(e.day)date(e.day);
      if(ids.has(e.id))throw Error('Backup com eventos repetidos.');ids.add(e.id);
      return {event:e,notes:text(item.notes).slice(0,4000),checkedAt:text(item.checkedAt)};
    });
  }
  function ics(events) {
    const escape=v=>text(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const timestamp=value=>value.slice(0,19).replace(/[-:]/g,'')+(value.length===16?'00':'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gabriel Monteiro Ramos//Agenda da Camara//PT-BR','CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE','TZID:America/Sao_Paulo','BEGIN:STANDARD','DTSTART:20190101T000000','TZOFFSETFROM:-0300','TZOFFSETTO:-0300','TZNAME:-03','END:STANDARD','END:VTIMEZONE'];
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
    for(const e of events){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(e.start))continue;
      lines.push('BEGIN:VEVENT',`UID:camara-${e.id}@agenda-gabriel`,`DTSTAMP:${stamp}`,`DTSTART;TZID=America/Sao_Paulo:${timestamp(e.start)}`);
      if(e.end&&e.end>e.start)lines.push(`DTEND;TZID=America/Sao_Paulo:${timestamp(e.end)}`);
      lines.push('SUMMARY:'+escape(`${e.organs.map(o=>o.sigla).join(' / ')} · ${e.type}`),'DESCRIPTION:'+escape(e.description),'LOCATION:'+escape(e.location),'URL:'+officialURL(e));
      if(normalize(e.status).includes('cancelad'))lines.push('STATUS:CANCELLED');
      lines.push('END:VEVENT');
    }lines.push('END:VCALENDAR');
    return lines.map(line=>{const chunks=[];let chunk='',length=0;for(const c of line){const size=new TextEncoder().encode(c).length;if(length+size>73){chunks.push(chunk);chunk=' '+c;length=1+size;}else{chunk+=c;length+=size;}}chunks.push(chunk);return chunks.join('\r\n');}).join('\r\n')+'\r\n';
  }
  function csv(events) {
    const escape=v=>'"'+(/^[=+@\-]/.test(text(v))?"'":'')+text(v).replace(/"/g,'""')+'"';
    return '\uFEFF'+['ID;Início (Brasília);Fim (Brasília);Órgãos;Tipo;Situação;Descrição;Local;Fonte',...events.map(e=>[e.id,e.start,e.end,e.organs.map(o=>o.sigla).join(' / '),e.type,e.status,e.description,e.location,officialURL(e)].map(escape).join(';'))].join('\r\n');
  }
  const api={API,today,date,shift,period,validateRange,safeLink,organ,group,event,officialURL,filter,sort,query,agenda,overlaps,backup,ics,csv,normalize};
  if(typeof module!=='undefined')module.exports=api;else root.AgendaModel=api;
})(typeof window==='undefined'?globalThis:window);
