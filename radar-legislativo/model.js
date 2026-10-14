(function (root) {
  'use strict';
  const API = 'https://dadosabertos.camara.leg.br/api/v2';
  const text = value => String(value ?? '');
  const normalizeText = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function record(raw) {
    const p = raw.proposicao || raw;
    const id = Number(p.id);
    if (!Number.isSafeInteger(id) || id < 1) throw Error('Identificador de proposição inválido.');
    const status = p.statusProposicao || {};
    return {
      id, hasDetails: !!raw.proposicao || Object.hasOwn(p, 'statusProposicao'), siglaTipo: text(p.siglaTipo), numero: Number(p.numero) || 0, ano: Number(p.ano) || 0,
      ementa: text(p.ementa), ementaDetalhada: text(p.ementaDetalhada), keywords: text(p.keywords),
      dataApresentacao: text(p.dataApresentacao), urlInteiroTeor: safeLink(p.urlInteiroTeor),
      status: {
        dataHora: text(status.dataHora), siglaOrgao: text(status.siglaOrgao),
        descricaoSituacao: text(status.descricaoSituacao), descricaoTramitacao: text(status.descricaoTramitacao),
        despacho: text(status.despacho), regime: text(status.regime), apreciacao: text(status.apreciacao)
      },
      autores: (Array.isArray(raw.autores) ? raw.autores : []).map(a => ({nome: text(a.nome), proponente: a.proponente})),
      temas: (Array.isArray(raw.temas) ? raw.temas : []).map(t => text(t.tema)).filter(Boolean),
      tramitacoes: (Array.isArray(raw.tramitacoes) ? raw.tramitacoes : []).map(t => ({
        dataHora: text(t.dataHora), sequencia: Number(t.sequencia) || 0, siglaOrgao: text(t.siglaOrgao),
        descricaoTramitacao: text(t.descricaoTramitacao), descricaoSituacao: text(t.descricaoSituacao), despacho: text(t.despacho)
      })).sort((a, b) => b.dataHora.localeCompare(a.dataHora) || b.sequencia - a.sequencia)
    };
  }
  function safeLink(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'camara.leg.br' || url.hostname.endsWith('.camara.leg.br')) ? url.href : '';
    } catch { return ''; }
  }
  const label = p => `${p.siglaTipo} ${p.numero}/${p.ano}`;
  const officialURL = p => `https://www.camara.leg.br/propostas-legislativas/${p.id}`;

  function query(filters, page = 1) {
    const params = new URLSearchParams({itens: '12', pagina: String(page), ordem: 'DESC', ordenarPor: 'id'});
    for (const [field, parameter] of [['ano', 'ano'], ['tipo', 'siglaTipo'], ['numero', 'numero'], ['q', 'keywords']]) {
      if (text(filters[field]).trim()) params.set(parameter, text(filters[field]).trim());
    }
    if (text(filters.autor).trim()) params.set('autor', '"' + text(filters.autor).replace(/"/g, '').trim() + '"');
    return '/proposicoes?' + params;
  }
  function filter(records, f) {
    return records.filter(p => (!f.ano || String(p.ano) === String(f.ano)) && (!f.tipo || p.siglaTipo === f.tipo)
      && (!f.numero || String(p.numero) === String(f.numero))
      && (!f.autor || normalizeText(p.autores.map(a => a.nome).join(' ')).includes(normalizeText(f.autor)))
      && (!f.q || normalizeText(p.ementa + ' ' + p.keywords).includes(normalizeText(f.q))));
  }
  function fingerprint(status) { return JSON.stringify(status); }
  function eventKey(event) { return JSON.stringify([event.dataHora, event.sequencia, event.siglaOrgao, event.descricaoTramitacao, event.descricaoSituacao, event.despacho]); }
  function compare(previous, current) {
    const known = new Set(previous.tramitacoes.map(eventKey));
    return {statusChanged: fingerprint(previous.status) !== fingerprint(current.status),
      events: current.tramitacoes.filter(event => !known.has(eventKey(event)))};
  }
  function validateBackup(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.items) || data.items.length > 100) throw Error('Backup incompatível. Use um arquivo exportado pelo Radar.');
    const ids = new Set();
    return data.items.map(item => {
      const p = item.record;
      if (!p || !Number.isSafeInteger(p.id) || p.id < 1 || !Array.isArray(p.tramitacoes) || !Array.isArray(p.autores) || !Array.isArray(p.temas) || !p.status) throw Error('Registro inválido no backup.');
      if (ids.has(p.id)) throw Error('Backup contém proposições repetidas.'); ids.add(p.id);
      const clean = record({proposicao: {...p, statusProposicao: p.status}, autores: p.autores, temas: p.temas.map(tema => ({tema})), tramitacoes: p.tramitacoes});
      return {record: clean, addedAt: text(item.addedAt), checkedAt: text(item.checkedAt),
        priority: ['Normal', 'Alta', 'Baixa'].includes(item.priority) ? item.priority : 'Normal',
        notes: text(item.notes).slice(0, 4000), changes: Array.isArray(item.changes) ? item.changes.slice(0, 100).map(c => ({
          at: text(c.at), description: text(c.description).slice(0, 3000), read: Boolean(c.read)
        })) : []};
    });
  }
  function csv(records) {
    const headers = ['Proposição', 'ID', 'Ementa', 'Situação', 'Órgão', 'Última tramitação', 'Fonte'];
    const escape = v => '"' + (/^[=+@\-]/.test(text(v)) ? "'" : '') + text(v).replace(/"/g, '""') + '"';
    return '\uFEFF' + [headers.join(';'), ...records.map(p => [label(p), p.id, p.ementa, p.status.descricaoSituacao,
      p.status.siglaOrgao, p.status.dataHora, officialURL(p)].map(escape).join(';'))].join('\r\n');
  }
  const api = {API, record, label, officialURL, safeLink, query, filter, compare, validateBackup, csv};
  if (typeof module !== 'undefined') module.exports = api; else root.RadarModel = api;
})(typeof window === 'undefined' ? globalThis : window);
