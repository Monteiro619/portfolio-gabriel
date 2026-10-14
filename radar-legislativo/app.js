'use strict';
const M = RadarModel;
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const snapshot = window.RADAR_SNAPSHOT || {records: [], capturedAt: ''};
const offlineRecords = snapshot.records.map(M.record);
const CACHE = new Map(offlineRecords.map(p => [p.id, p]));
const STORAGE_KEY = 'gabriel-radar-legislativo-v1';
let watch = [], activeTab = 'explore', mode = 'live', criteria = {}, page = 1, lastPage = 1;
let results = [], hasNext = false, busy = false, currentDetail = null, detailSource = '', searchToken = 0;
let checking = false, lastCheck = '', toastTimer, printing = false;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) watch = M.validateBackup(JSON.parse(saved));
  lastCheck = watch.map(w => w.checkedAt).filter(Boolean).sort().at(-1) || '';
} catch { /* A lista continua disponível nesta sessão. */ }

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 5000);
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version: 1, items: watch})); return true; }
  catch { notify('O navegador não permitiu salvar. Use Backup para preservar sua lista.'); return false; }
}
function formatDate(value, withTime = false) {
  if (!value) return 'Não informado';
  const parts = String(value).slice(0, 10).split('-');
  if (parts.length !== 3 || !/^\d{4}-\d{2}-\d{2}/.test(value)) return 'Não informado';
  return parts.reverse().join('/') + (withTime && value.length > 15 ? ' · ' + value.slice(11, 16) : '');
}
function localDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'});
}
function following(id) { return watch.find(w => w.record.id === Number(id)); }
function unread() { return watch.reduce((n, w) => n + w.changes.filter(c => !c.read).length, 0); }
function filters() {
  return {q: $('keyword').value.trim(), ano: $('year').value, tipo: $('type').value,
    numero: $('number').value.trim(), autor: $('author').value.trim()};
}
async function request(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(M.API + path, {headers: {'Accept': 'application/json'}, signal: controller.signal});
    if (!response.ok) throw Error(`A Câmara retornou HTTP ${response.status}. Tente novamente.`);
    const data = await response.json();
    if (!data || !Object.hasOwn(data, 'dados')) throw Error('A API retornou um formato inesperado.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw Error('A Câmara demorou a responder. Tente novamente.');
    if (error instanceof TypeError) throw Error('Não foi possível acessar a API da Câmara. Verifique a conexão e tente novamente.');
    throw error;
  } finally { clearTimeout(timer); }
}
async function pool(items, limit, fn) {
  let index = 0;
  await Promise.all(Array.from({length: Math.min(limit, items.length)}, async () => {
    while (index < items.length) { const item = items[index++]; await fn(item); }
  }));
}
function updateMetrics() {
  $('metricResults').textContent = results.length;
  $('metricResultsNote').textContent = mode === 'live' ? 'Resultados desta página da API' : 'No recorte da cópia oficial';
  $('metricWatch').textContent = watch.length;
  $('metricChanges').textContent = unread();
  $('navWatch').textContent = watch.length;
  $('navChanges').textContent = unread();
  $('metricCheck').textContent = lastCheck ? new Date(lastCheck).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '—';
  $('metricCheckNote').textContent = lastCheck ? localDate(lastCheck) : 'Verifique as matérias acompanhadas';
  $('refreshWatch').disabled = checking || !watch.length;
}
function setSource(text, sourceMode = mode) {
  $('sourceTitle').textContent = sourceMode === 'live' ? 'Consulta direta à API da Câmara dos Deputados' : 'Cópia de dados oficiais · consulta local';
  $('sourceText').textContent = text;
  $('sourceLabel').textContent = sourceMode === 'live' ? 'API OFICIAL' : 'CÓPIA LOCAL';
  $('sourceBanner').classList.toggle('offline', sourceMode !== 'live');
}
function card(p, watched = false) {
  const item = following(p.id), state = p.status.descricaoSituacao || (p.status.descricaoTramitacao ? 'Último andamento: '+p.status.descricaoTramitacao : p.hasDetails ? 'Situação não informada pela fonte' : 'Consultar situação nos detalhes');
  const author = p.autores.length ? p.autores.slice(0,2).map(a => a.nome).join(' · ') + (p.autores.length > 2 ? ` +${p.autores.length - 2}` : '') : 'Consultar autoria na ficha';
  return `<article class="proposal-card"><div class="proposal-top"><span class="type-tag">${escapeHTML(p.siglaTipo)}</span><span class="proposal-id">ID ${p.id}</span><button data-follow="${p.id}" class="star-button ${item?'saved':''}" aria-label="${item?'Remover da lista':'Acompanhar'} ${escapeHTML(M.label(p))}" aria-pressed="${!!item}">${item?'★':'☆'}</button></div><h3><button data-detail="${p.id}">${escapeHTML(M.label(p))}</button></h3><p class="proposal-summary">${escapeHTML(p.ementa || 'Ementa não informada pela fonte.')}</p><div class="proposal-status"><i class="dot"></i><span>${escapeHTML(state)}</span></div><div class="proposal-meta"><span>⌖ ${escapeHTML(p.status.siglaOrgao || 'Órgão nos detalhes')}</span><span>◷ ${p.dataApresentacao?formatDate(p.dataApresentacao):'Data nos detalhes'}</span></div>${watched?`<div class="watch-meta"><span class="priority ${item.priority==='Alta'?'high':''}">Prioridade ${item.priority.toLowerCase()}</span><small>${item.changes.filter(c=>!c.read).length} alterações não lidas</small></div>`:`<div class="proposal-author">${escapeHTML(author)}</div>`}<div class="proposal-actions"><button data-detail="${p.id}" class="text-link">Ver detalhes e tramitação →</button><a href="${M.officialURL(p)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${escapeHTML(M.label(p))} na Câmara">Fonte ↗</a></div></article>`;
}
function renderResults() {
  const focus = document.activeElement?.closest('[data-detail], [data-follow]');
  const focusKey = focus && $('resultsGrid').contains(focus) ? {detail:focus.dataset.detail, follow:focus.dataset.follow} : null;
  const displayed = M.filter(results, {q: $('localSearch').value.trim()});
  const paged = mode === 'snapshot' && !printing ? displayed.slice((page-1)*12, page*12) : displayed;
  $('resultsGrid').innerHTML = paged.length ? paged.map(p => card(p)).join('') : `<div class="empty-state"><span>⌕</span><h3>${busy?'Consultando a Câmara…':'Nenhuma proposição neste recorte'}</h3><p>${busy?'Aguardando a resposta da API oficial.':'Experimente ampliar o ano, retirar o tipo ou ajustar as palavras-chave.'}</p></div>`;
  if (focusKey) $('resultsGrid').querySelector(focusKey.follow ? `[data-follow="${Number(focusKey.follow)}"]` : `[data-detail="${Number(focusKey.detail)}"]`)?.focus({preventScroll:true});
  $('resultsCount').textContent = displayed.length;
  lastPage = mode === 'snapshot' ? Math.max(1, Math.ceil(displayed.length / 12)) : page;
  if (mode === 'snapshot') page = Math.min(page, lastPage);
  $('pageCaption').textContent = mode === 'live' ? `Página ${page} da API · ${displayed.length} registros exibidos` : `${displayed.length} registros na cópia filtrada · página ${page} de ${lastPage}`;
  $('pageNumber').textContent = String(page);
  $('prevPage').disabled = busy || page <= 1;
  $('nextPage').disabled = busy || (mode === 'live' ? !hasNext : page >= lastPage);
  updateMetrics();
}
function renderWatch() {
  $('watchGrid').innerHTML = watch.length ? [...watch].sort((a,b) => ({Alta:0,Normal:1,Baixa:2}[a.priority])-({Alta:0,Normal:1,Baixa:2}[b.priority])).map(w => card(w.record, true)).join('') : '<div class="empty-state"><span>☆</span><h3>Sua lista começa aqui</h3><p>Encontre uma proposição e use a estrela para acompanhar.</p><button class="button primary" data-go-explore>Explorar proposições →</button></div>';
}
function renderChanges() {
  const changes = watch.flatMap(w => w.changes.map(c => ({...c, record:w.record}))).sort((a,b) => b.at.localeCompare(a.at));
  $('changesList').innerHTML = changes.length ? changes.map(c => `<article class="change-card ${c.read?'read':''}"><div class="change-marker"></div><div><div class="change-top"><button data-detail="${c.record.id}" class="text-link">${escapeHTML(M.label(c.record))}</button><span>${c.read?'Lida':'Não lida'} · detectada em ${localDate(c.at)}</span></div><p>${escapeHTML(c.description)}</p><a href="${M.officialURL(c.record)}" target="_blank" rel="noopener noreferrer" class="text-link">Conferir na Câmara ↗</a></div></article>`).join('') : '<div class="empty-state"><span>↻</span><h3>Nenhuma alteração detectada</h3><p>Adicione matérias à lista e use “Verificar minha lista”. A primeira consulta estabelece uma referência para comparação.</p></div>';
  $('markRead').disabled = !unread();
}
function renderAll() { renderResults(); renderWatch(); renderChanges(); updateMetrics(); }
function tab(name) {
  activeTab = name;
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  for (const panel of ['explore','watch','changes','about']) $(panel+'Panel').hidden = panel !== name;
  $('exportCSV').hidden = name === 'about';
  const titles = {explore:['Radar Legislativo','Encontre proposições, organize sua lista e acompanhe a tramitação.'],watch:['Minha lista','Matérias, prioridades e anotações para o seu acompanhamento.'],changes:['Movimentações','Veja diferenças encontradas entre consultas às matérias da sua lista.'],about:['Sobre o Radar Legislativo','Gestão da informação aplicada à pesquisa e ao acompanhamento parlamentar.']};
  $('pageTitle').textContent = titles[name][0]; $('pageSubtitle').textContent = titles[name][1];
  renderAll();
}
async function search(nextPage = 1, reuseFilters = false) {
  const token = ++searchToken;
  if (!reuseFilters) criteria = filters(); mode = $('dataMode').value; page = nextPage; busy = true; results = [];
  $('searchError').hidden = true; $('searchBtn').disabled = true; $('localSearch').value = '';
  $('searchHint').textContent = mode === 'live' ? 'Palavra-chave usa a indexação oficial; autor aceita parte do nome.' : 'Busca local na ementa e nas palavras-chave do recorte coletado.';
  renderResults();
  if (mode === 'snapshot') {
    results = M.filter(offlineRecords, criteria); busy = false; $('searchBtn').disabled = false;
    setSource(`Recorte real com ${offlineRecords.length} proposições, coletado em ${localDate(snapshot.capturedAt)}. Não é uma consulta atualizada à API.`);
    $('resultCaption').textContent = 'Resultados dentro da cópia coletada. Este recorte não cobre todas as proposições.';
    renderResults(); return;
  }
  setSource('Consultando a fonte oficial. A disponibilidade e o tempo de resposta dependem da Câmara.');
  try {
    const data = await request(M.query(criteria, page));
    if (token !== searchToken) return;
    if (!Array.isArray(data.dados)) throw Error('Lista de proposições inválida.');
    results = data.dados.map(M.record);
    hasNext = (data.links || []).some(link => link.rel === 'next');
    results.forEach(p => CACHE.set(p.id, p));
    setSource(`Resultados recebidos em ${localDate(new Date().toISOString())}. Abra os detalhes para consultar autores e histórico.`);
    $('resultCaption').textContent = 'Resultados da API oficial, ordenados por identificador decrescente. O ID não indica a data da última tramitação.';
    busy = false; $('searchBtn').disabled = false; renderResults();
    await pool([...results], 3, async p => {
      try {
        const detail = await request('/proposicoes/'+p.id);
        if (token !== searchToken) return;
        const enriched = M.record(detail.dados);
        results = results.map(r => r.id === p.id ? enriched : r); CACHE.set(p.id, enriched); renderResults();
      } catch { /* A ficha oficial e a consulta de detalhes permanecem acessíveis. */ }
    });
  } catch (error) {
    if (token !== searchToken) return;
    busy = false; $('searchBtn').disabled = false; hasNext = false;
    $('searchError').hidden = false;
    $('searchError').innerHTML = `<strong>Consulta não concluída.</strong> ${escapeHTML(error.message)} <button id="offlineButton" class="text-link">Explorar a cópia oficial coletada</button>`;
    $('offlineButton').onclick = () => { $('dataMode').value = 'snapshot'; search(); };
    setSource('Nenhuma resposta atualizada foi recebida. Você pode tentar novamente ou escolher a cópia local.');
    $('resultCaption').textContent = 'A consulta à API não foi concluída.'; renderResults();
  }
}
async function fetchFull(id, requireHistory = false) {
  const paths = ['', '/tramitacoes', '/autores', '/temas'];
  const responses = await Promise.allSettled(paths.map(path => request('/proposicoes/'+id+path)));
  if (responses[0].status !== 'fulfilled') throw responses[0].reason;
  if (requireHistory && responses[1].status !== 'fulfilled') throw responses[1].reason;
  const value = i => responses[i].status === 'fulfilled' && Array.isArray(responses[i].value.dados) ? responses[i].value.dados : [];
  const p = M.record({proposicao:responses[0].value.dados, tramitacoes:value(1), autores:value(2), temas:value(3)});
  CACHE.set(p.id,p);
  return {record:p, partial:responses.some(r=>r.status!=='fulfilled')};
}
async function openDetail(id) {
  const token = Number(id); currentDetail = token;
  $('detailTitle').textContent = CACHE.has(token) ? M.label(CACHE.get(token)) : 'Consultando proposição…';
  $('detailContent').innerHTML = '<div class="detail-loading">Consultando dados e tramitação na Câmara…</div>';
  if (!$('detailDialog').open) $('detailDialog').showModal();
  const useOffline = mode === 'snapshot' && activeTab === 'explore';
  if (useOffline && CACHE.has(token)) {
    const p = offlineRecords.find(p=>p.id===token) || CACHE.get(token);
    detailSource = 'snapshot'; renderDetail(p, false); return;
  }
  try {
    const full = await fetchFull(token);
    if (currentDetail !== token || !$('detailDialog').open) return;
    detailSource = 'live'; renderDetail(full.record, full.partial);
  } catch (error) {
    if (currentDetail !== token || !$('detailDialog').open) return;
    const old = following(token)?.record || CACHE.get(token);
    if (old) {
      detailSource = 'saved'; renderDetail(old, true);
      const note = document.createElement('p'); note.className = 'error-box'; note.textContent = 'API indisponível: exibindo dados previamente guardados. '+error.message;
      $('detailContent').prepend(note);
    } else $('detailContent').innerHTML = `<p class="error-box">${escapeHTML(error.message)}</p><a href="${M.officialURL({id:token})}" target="_blank" rel="noopener noreferrer" class="button secondary">Abrir ficha na Câmara ↗</a>`;
  }
}
function renderDetail(p, partial) {
  const item = following(p.id);
  $('detailTitle').textContent = M.label(p);
  $('detailEyebrow').textContent = detailSource === 'live' ? 'DADOS CONSULTADOS NA API OFICIAL' : detailSource === 'snapshot' ? 'DADOS DA CÓPIA OFICIAL COLETADA' : 'DADOS GUARDADOS ANTERIORMENTE';
  const events = p.tramitacoes.slice(0, 100);
  $('detailContent').innerHTML = `${partial?'<p class="detail-warning">Parte dos detalhes não pôde ser atualizada. A ausência de um campo não indica ausência da informação na fonte.</p>':''}<p class="detail-ementa">${escapeHTML(p.ementa)}</p><div class="detail-links"><a class="button primary" href="${M.officialURL(p)}" target="_blank" rel="noopener noreferrer">Ficha oficial ↗</a>${p.urlInteiroTeor?`<a class="button secondary" href="${escapeHTML(p.urlInteiroTeor)}" target="_blank" rel="noopener noreferrer">Inteiro teor ↗</a>`:''}<button id="detailFollow" class="button secondary">${item?'★ Remover da lista':'☆ Acompanhar matéria'}</button></div><div class="detail-data"><div><small>SITUAÇÃO</small><strong>${escapeHTML(p.status.descricaoSituacao || 'Não informada')}</strong></div><div><small>ÓRGÃO</small><strong>${escapeHTML(p.status.siglaOrgao || 'Não informado')}</strong></div><div><small>APRESENTAÇÃO</small><strong>${formatDate(p.dataApresentacao)}</strong></div><div><small>REGIME</small><strong>${escapeHTML(p.status.regime || 'Não informado')}</strong></div></div><section class="detail-section"><h3>Autoria e temas</h3><p>${escapeHTML(p.autores.map(a=>a.nome).join(' · ') || 'Autoria não disponível nesta consulta.')}</p><div class="tags">${p.temas.map(t=>`<span>${escapeHTML(t)}</span>`).join('')}</div></section>${item?`<section class="detail-section notes-section"><div><h3>Meu acompanhamento</h3><label for="priority">Prioridade<select id="priority"><option ${item.priority==='Baixa'?'selected':''}>Baixa</option><option ${item.priority==='Normal'?'selected':''}>Normal</option><option ${item.priority==='Alta'?'selected':''}>Alta</option></select></label></div><label for="notes">Anotações pessoais</label><textarea id="notes" rows="3" maxlength="4000" placeholder="Registre os pontos que deseja acompanhar…">${escapeHTML(item.notes)}</textarea><button id="saveNotes" class="button secondary">Salvar anotações</button><small>Última verificação: ${item.checkedAt?localDate(item.checkedAt):'Ainda não verificada'}</small></section>`:''}<section class="detail-section"><h3>Histórico de tramitação <span class="counter">${p.tramitacoes.length}</span></h3><p class="timeline-note">Mais recente primeiro. Datas e descrições são reproduzidas da fonte.${p.tramitacoes.length>100?' Exibindo as 100 mais recentes.':''}</p><div class="timeline">${events.length?events.map(t=>`<article><div class="timeline-dot"></div><time>${formatDate(t.dataHora,true)} <span>${escapeHTML(t.siglaOrgao)}</span></time><h4>${escapeHTML(t.descricaoTramitacao || 'Movimentação registrada')}</h4><p>${escapeHTML(t.despacho || t.descricaoSituacao || 'Sem descrição adicional.')}</p></article>`).join(''):'<p>Nenhuma tramitação disponível nesta consulta.</p>'}</div></section>`;
  $('detailFollow').onclick = async () => { await toggleFollow(p.id, p); if ($('detailDialog').open) renderDetail(p,partial); };
  if (item) $('saveNotes').onclick = () => { item.priority=$('priority').value; item.notes=$('notes').value; const saved=save();renderAll();if(saved)notify('Prioridade e anotações salvas.'); };
}
async function toggleFollow(id, known) {
  id = Number(id);
  if (following(id)) { watch=watch.filter(w=>w.record.id!==id);save();renderAll();notify('Matéria removida da sua lista.');return; }
  if (watch.length >= 100) { notify('A lista comporta até 100 matérias.');return; }
  let p = known || CACHE.get(id), live = false;
  if (mode === 'live' || activeTab !== 'explore') {
    notify('Consultando a Câmara para estabelecer a referência de acompanhamento…');
    try { p=(await fetchFull(id,true)).record;live=true; }
    catch(error){notify('Não foi possível estabelecer a base de acompanhamento. '+error.message);return;}
  }
  if (!p || following(id)) return;
  watch.push({record:p,addedAt:new Date().toISOString(),checkedAt:live?new Date().toISOString():'',priority:'Normal',notes:'',changes:[]});
  const saved=save();renderAll();if(saved)notify('Matéria adicionada à lista. Esta consulta é a referência inicial.');
}
async function checkWatch() {
  if (checking || !watch.length) return;
  checking=true;updateMetrics();$('refreshWatch').textContent='Verificando…';
  let done=0, success=0, failed=0, differences=0;
  const targets=[...watch];
  await pool(targets, 2, async item => {
    try {
      const full=await fetchFull(item.record.id,true);
      if (following(item.record.id) !== item) return;
      const delta=M.compare(item.record,full.record), now=new Date().toISOString();
      const descriptions=[];
      if(delta.statusChanged)descriptions.push('Situação ou última tramitação alterada: '+(full.record.status.descricaoSituacao||full.record.status.descricaoTramitacao||'consulte a ficha oficial')+'.');
      for(const event of delta.events)descriptions.push(`${formatDate(event.dataHora,true)} · ${event.siglaOrgao}: ${event.descricaoTramitacao}${event.despacho?' — '+event.despacho:''}`);
      item.changes=[...descriptions.map(description=>({at:now,description,read:false})),...item.changes].slice(0,100);
      differences+=descriptions.length;item.record=full.record;item.checkedAt=now;success++;
    }catch{failed++;}
    finally{done++;$('refreshWatch').textContent=`Verificando ${done}/${targets.length}`;}
  });
  if(success)lastCheck=new Date().toISOString();
  checking=false;$('refreshWatch').textContent='↻ Verificar minha lista';save();renderAll();
  notify(`${success} matérias verificadas · ${differences} diferenças detectadas.${failed?' '+failed+' consultas falharam; os dados anteriores foram preservados.':''}`);
}
function download(content, filename, type) {
  const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>tab(button.dataset.tab));
document.addEventListener('click',event=>{
  const detail=event.target.closest('[data-detail]'), follow=event.target.closest('[data-follow]');
  if(detail)openDetail(detail.dataset.detail);
  else if(follow)toggleFollow(follow.dataset.follow);
  else if(event.target.closest('[data-go-explore]'))tab('explore');
});
$('searchForm').onsubmit=event=>{event.preventDefault();search();};
$('dataMode').onchange=()=>search();
$('clearSearch').onclick=()=>{for(const id of ['keyword','year','type','number','author','localSearch'])$(id).value='';search();};
$('localSearch').oninput=()=>{page=mode==='snapshot'?1:page;renderResults();};
$('prevPage').onclick=()=>{if(mode==='live')search(page-1,true);else{page--;renderResults();}};
$('nextPage').onclick=()=>{if(mode==='live')search(page+1,true);else{page++;renderResults();}};
$('closeDialog').onclick=()=>{$('detailDialog').close();currentDetail=null;};
$('detailDialog').addEventListener('close',()=>{currentDetail=null;});
$('refreshWatch').onclick=checkWatch;
$('markRead').onclick=()=>{watch.forEach(w=>w.changes.forEach(c=>c.read=true));save();renderAll();};
$('exportCSV').onclick=()=>{const records=activeTab==='explore'?M.filter(results,{q:$('localSearch').value.trim()}):watch.map(w=>w.record);download(M.csv(records),'radar-legislativo.csv','text/csv;charset=utf-8');notify(`${records.length} proposições exportadas. Na consulta ao vivo, o CSV inclui a página exibida.`);};
$('exportBackup').onclick=()=>download(JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:watch},null,2),'radar-minha-lista.json','application/json');
$('importBackup').onclick=()=>$('backupInput').click();
$('backupInput').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('O backup deve ter até 5 MB.');const imported=M.validateBackup(JSON.parse(await file.text()));if(!confirm(`Substituir sua lista por ${imported.length} matérias do backup?`))return;if(checking)throw Error('Aguarde a verificação em andamento.');watch=imported;watch.forEach(w=>CACHE.set(w.record.id,w.record));lastCheck=watch.map(w=>w.checkedAt).filter(Boolean).sort().at(-1)||'';save();renderAll();notify('Lista restaurada.');}catch(error){notify('Backup não restaurado: '+error.message);}finally{event.target.value='';}};
$('clearLocal').onclick=()=>{if(checking){notify('Aguarde a verificação em andamento.');return;}if(!confirm('Limpar todas as matérias, anotações e alterações da sua lista?'))return;watch=[];lastCheck='';save();renderAll();notify('Sua lista foi limpa.');};
$('printBtn').onclick=()=>window.print();
window.addEventListener('beforeprint',()=>{printing=true;renderResults();});
window.addEventListener('afterprint',()=>{printing=false;renderResults();});
const currentYear=new Date().getFullYear();
for(let year=currentYear;year>=2000;year--){const option=document.createElement('option');option.value=year;option.textContent=year;$('year').append(option);}
$('year').value=String(currentYear);$('type').value='PL';$('dataMode').value='live';
watch.forEach(w=>CACHE.set(w.record.id,w.record));renderAll();search();
