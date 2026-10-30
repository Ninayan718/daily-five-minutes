(function () {
  'use strict';

  var KEY = 'read5.v1';
  var EPOCH = Date.UTC(2026, 9, 28);

  var state = load();
  var view = 'today';
  var tagMode = 'work';
  var libQuery = '';
  var libField = '';
  var libEra = '';

  function load() {
    var base = { assign: {}, records: [], custom: [], swaps: {}, tags: {} };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return base;
      var s = JSON.parse(raw);
      return {
        assign: s.assign || {},
        records: s.records || [],
        custom: s.custom || [],
        swaps: s.swaps || {},
        tags: s.tags || {}
      };
    } catch (e) {
      return base;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert('本地存储写入失败，请用「备份 JSON」导出数据，避免丢失。');
    }
  }

  function pool() {
    return (window.BOOK_CARDS || []).concat(state.custom || []);
  }

  function allCards() {
    return pool();
  }

  function getCard(id) {
    var list = allCards();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function todayStr(d) {
    var t = d || new Date();
    var m = t.getMonth() + 1, dd = t.getDate();
    return t.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }

  function dayIndex(dateStr) {
    var p = dateStr.split('-');
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    return Math.floor((t - EPOCH) / 86400000);
  }

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }

  function pickCard(dateStr) {
    var all = allCards();
    if (!all.length) return null;
    var used = {};
    Object.keys(state.assign).forEach(function (k) {
      if (k !== dateStr) used[state.assign[k]] = 1;
    });
    var swapped = state.swaps[dateStr] || [];
    swapped.forEach(function (id) { used[id] = 1; });

    var available = all.filter(function (c) { return !used[c.id]; });
    if (!available.length) available = all.filter(function (c) { return swapped.indexOf(c.id) < 0; });
    if (!available.length) available = all;

    var fields = window.FIELDS || ['决策', '沟通', '效率', '管理', '心理', '财富'];
    var di = dayIndex(dateStr);
    var pref = fields[((di % fields.length) + fields.length) % fields.length];
    var cands = available.filter(function (c) { return c.field === pref; });
    var list = cands.length ? cands : available;
    return list[hash(dateStr) % list.length];
  }

  function ensureToday() {
    var d = todayStr();
    if (!state.assign[d] || !getCard(state.assign[d])) {
      var c = pickCard(d);
      if (!c) return null;
      state.assign[d] = c.id;
      save();
    }
    return getCard(state.assign[d]);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function eraLabel(era) {
    if (era === 'classic') return '经典名著';
    if (era === 'modern') return '近年新书';
    if (era === 'custom') return '我自己添加的';
    return '';
  }

  function eraClass(era) {
    if (era === 'modern') return 'era-tag modern';
    if (era === 'custom') return 'era-tag custom';
    return 'era-tag';
  }

  /* ---------- 今日卡片 ---------- */

  function renderToday() {
    var slot = document.getElementById('today-slot');
    var card = ensureToday();
    if (!card) { slot.innerHTML = '<div class="empty">书摘库为空。</div>'; return; }

    var d = todayStr();
    var rec = state.records.filter(function (r) { return r.date === d; });
    var h = '';

    h += '<div class="card">';
    h += '<div class="card-date">' + d + ' · ' + esc(card.field) + '</div>';
    h += '<div class="excerpt">' + esc(card.excerpt) + '</div>';
    h += '<div class="source">《' + esc(card.book) + '》 ' + esc(card.author);
    if (card.era) h += '<span class="' + eraClass(card.era) + '">' + eraLabel(card.era) + '</span>';
    h += '</div>';
    h += '<p class="context">' + esc(card.context) + '</p>';

    h += '<div class="block"><div class="block-title">它到底在说什么</div>';
    h += '<div class="core-line">' + esc(card.core) + '</div>';
    h += '<dl class="mech">';
    h += '<dt>底层机制</dt><dd>' + esc(card.mechanism) + '</dd>';
    h += '<dt>常见误解</dt><dd>' + esc(card.misconception) + '</dd>';
    h += '</dl></div>';

    if (card.work && card.work.length) {
      h += '<div class="block"><div class="block-title">工作怎么用</div><ol class="steps">';
      card.work.forEach(function (w) {
        h += '<li>';
        if (w.t) h += '<span class="trigger">触发条件：' + esc(w.t) + '</span>';
        h += esc(w.a);
        if (w.s) h += '<span class="script">可以直接这样说：「' + esc(w.s) + '」</span>';
        h += '</li>';
      });
      h += '</ol></div>';
    }

    if (card.life && card.life.length) {
      h += '<div class="block"><div class="block-title">生活怎么用</div><ul class="plain">';
      card.life.forEach(function (l) { h += '<li>' + esc(l) + '</li>'; });
      h += '</ul></div>';
    }

    if (card.micro) {
      h += '<div class="micro">';
      h += '<p class="do">今日微行动 · ' + esc(card.micro.do) + '</p>';
      h += '<p class="rec">完成后记一笔：' + esc(card.micro.record) + '</p>';
      h += '</div>';
    }

    h += '<div class="row-actions">';
    h += '<button class="btn btn-primary" id="btn-record">记一笔用法</button>';
    h += '<button class="btn" id="btn-share-card">生成分享图</button>';
    h += '<button class="btn btn-ghost" id="btn-swap">换一条</button>';
    h += '</div>';
    if (rec.length) h += '<div style="margin-top:12px"><span class="remember">今天已记录 ' + rec.length + ' 条实践</span></div>';
    h += '</div>';

    slot.innerHTML = h;

    document.getElementById('btn-record').onclick = function () {
      switchView('journal');
      setTimeout(function () {
        var el = document.getElementById('f-scene');
        if (el) el.focus();
      }, 60);
    };
    document.getElementById('btn-share-card').onclick = function () { openShareCard(card); };
    document.getElementById('btn-swap').onclick = function () {
      var cur = state.assign[todayStr()];
      if (!state.swaps[todayStr()]) state.swaps[todayStr()] = [];
      if (cur) state.swaps[todayStr()].push(cur);
      delete state.assign[todayStr()];
      var next = ensureToday();
      save();
      if (next) renderToday();
    };
  }

  /* ---------- 我的记录 ---------- */

  function renderJournal() {
    var slot = document.getElementById('journal-slot');
    var card = ensureToday();
    var h = '';

    h += '<div class="card">';
    h += '<div class="block-title" style="margin-bottom:12px">今天读了《' + esc(card ? card.book : '—') + '》，我用在哪</div>';
    h += '<div class="field"><label>用的场景</label><input type="text" id="f-scene" placeholder="比如：和供应商谈交付时间"></div>';
    h += '<div class="field"><label>我怎么做的</label><textarea id="f-did" placeholder="比如：先复述了对方的要求，再提我的方案"></textarea></div>';
    h += '<div class="field"><label>结果 + 一句话反思</label><textarea id="f-result" placeholder="比如：对方当场同意了。下次可以更早复述。"></textarea></div>';
    h += '<div class="field"><label>归属</label><div class="seg">';
    h += '<button data-tag="work" class="' + (tagMode === 'work' ? 'on' : '') + '">工作</button>';
    h += '<button data-tag="life" class="' + (tagMode === 'life' ? 'on' : '') + '">生活</button>';
    h += '</div></div>';
    h += '<button class="btn btn-primary" id="btn-save-rec">保存记录</button>';
    h += '</div>';

    h += '<div class="card"><div class="block-title" style="margin-bottom:6px">全部记录（' + state.records.length + ' 条）</div>';
    if (!state.records.length) {
      h += '<div class="empty">还没有记录。读完卡片后写下你是怎么用的，这一步才是重点。</div>';
    } else {
      var sorted = state.records.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      sorted.forEach(function (r) {
        var c = getCard(r.cardId);
        h += '<div class="entry">';
        h += '<div class="entry-head"><span class="entry-date">' + esc(r.date) + '</span>';
        h += '<span class="entry-book">《' + esc(c ? c.book : '已删除') + '》</span>';
        h += '<span class="entry-tag ' + (r.tag === 'life' ? 'life' : '') + '">' + (r.tag === 'life' ? '生活' : '工作') + '</span>';
        h += '<button class="btn btn-sm btn-ghost" data-del="' + r.id + '" style="margin-left:auto">删除</button>';
        h += '</div>';
        if (r.scene) h += '<p class="entry-line"><span>场景</span>' + esc(r.scene) + '</p>';
        if (r.did) h += '<p class="entry-line"><span>做法</span>' + esc(r.did) + '</p>';
        if (r.result) h += '<p class="entry-line"><span>结果</span>' + esc(r.result) + '</p>';
        h += '</div>';
      });
    }
    h += '</div>';

    slot.innerHTML = h;

    Array.prototype.forEach.call(slot.querySelectorAll('.seg button'), function (b) {
      b.onclick = function () { tagMode = b.getAttribute('data-tag'); renderJournal(); };
    });
    document.getElementById('btn-save-rec').onclick = function () {
      var scene = document.getElementById('f-scene').value.trim();
      var did = document.getElementById('f-did').value.trim();
      var result = document.getElementById('f-result').value.trim();
      if (!scene && !did && !result) { alert('至少写一项再保存。'); return; }
      state.records.push({
        id: 'r' + Date.now(),
        date: todayStr(),
        cardId: card ? card.id : '',
        tag: tagMode,
        scene: scene, did: did, result: result
      });
      save();
      renderJournal();
      renderToday();
    };
    Array.prototype.forEach.call(slot.querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        state.records = state.records.filter(function (r) { return r.id !== id; });
        save();
        renderJournal();
      };
    });
  }

  /* ---------- 统计 ---------- */

  function renderStats() {
    var slot = document.getElementById('stats-slot');
    var days = Object.keys(state.assign).sort();
    var recDates = {};
    state.records.forEach(function (r) { recDates[r.date] = 1; });
    var recDayCount = Object.keys(recDates).length;
    var rate = days.length ? Math.round(recDayCount / days.length * 100) : 0;

    var streak = 0;
    var cursor = new Date();
    for (;;) {
      var ds = todayStr(cursor);
      if (days.indexOf(ds) >= 0) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }

    var h = '';
    h += '<div class="stats-grid">';
    h += '<div class="stat"><div class="stat-n">' + days.length + '</div><div class="stat-l">累计阅读天数</div></div>';
    h += '<div class="stat"><div class="stat-n">' + streak + '</div><div class="stat-l">连续天数</div></div>';
    h += '<div class="stat"><div class="stat-n">' + state.records.length + '</div><div class="stat-l">实践记录条数</div></div>';
    h += '<div class="stat"><div class="stat-n">' + rate + '%</div><div class="stat-l">实践率（记录/阅读）</div></div>';
    h += '</div>';

    var byField = {};
    state.records.forEach(function (r) {
      var c = getCard(r.cardId);
      var f = c ? c.field : '其他';
      byField[f] = (byField[f] || 0) + 1;
    });
    var keys = Object.keys(byField).sort(function (a, b) { return byField[b] - byField[a]; });
    var max = keys.length ? byField[keys[0]] : 1;

    h += '<div class="card"><div class="block-title">实践集中在哪些领域</div>';
    if (!keys.length) {
      h += '<div class="empty">还没有记录，先写一条试试。</div>';
    } else {
      h += '<div class="bars">';
      keys.forEach(function (k) {
        h += '<div class="bar-row"><span class="bar-name">' + esc(k) + '</span>';
        h += '<span class="bar-track"><span class="bar-fill" style="width:' + Math.round(byField[k] / max * 100) + '%"></span></span>';
        h += '<span class="bar-num">' + byField[k] + '</span></div>';
      });
      h += '</div>';
    }
    h += '</div>';

    var byCard = {};
    state.records.forEach(function (r) { byCard[r.cardId] = (byCard[r.cardId] || 0) + 1; });
    var topIds = Object.keys(byCard).sort(function (a, b) { return byCard[b] - byCard[a]; }).slice(0, 3);
    h += '<div class="card"><div class="block-title">你用得最多的方法</div>';
    if (!topIds.length) {
      h += '<div class="empty">还没有记录。</div>';
    } else {
      h += '<ul class="plain">';
      topIds.forEach(function (id) {
        var c = getCard(id);
        if (!c) return;
        h += '<li><b>《' + esc(c.book) + '》</b> · ' + esc(c.core) + ' <span style="color:#8C877C">（用过 ' + byCard[id] + ' 次）</span></li>';
      });
      h += '</ul>';
    }
    h += '</div>';

    slot.innerHTML = h;
  }

  /* ---------- 书摘库 ---------- */

  function renderLibrary() {
    var slot = document.getElementById('library-slot');
    var sel = document.getElementById('lib-field');
    if (sel.options.length <= 1) {
      (window.FIELDS || []).forEach(function (f) {
        var o = document.createElement('option'); o.value = f; o.textContent = f; sel.appendChild(o);
      });
    }
    document.getElementById('lib-count').textContent = (window.BOOK_CARDS || []).length;

    var todayId = state.assign[todayStr()];
    var q = libQuery.trim().toLowerCase();
    var list = allCards().filter(function (c) {
      if (libField && c.field !== libField) return false;
      if (libEra) {
        if (libEra === 'custom' && c.era !== 'custom') return false;
        if (libEra !== 'custom' && c.era !== libEra) return false;
      }
      if (!q) return true;
      var hay = (c.book + ' ' + c.author + ' ' + c.excerpt + ' ' + c.core + ' ' + c.field).toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    if (!list.length) { slot.innerHTML = '<div class="empty">没有匹配的条目。</div>'; return; }

    var h = '';
    list.forEach(function (c) {
      h += '<div class="lib-item' + (c.id === todayId ? ' is-today' : '') + '" data-card="' + esc(c.id) + '">';
      h += '<div class="lib-item-top"><span class="lib-item-book">《' + esc(c.book) + '》</span>';
      h += '<span class="lib-item-field">' + esc(c.field) + '</span>';
      if (c.era) h += '<span class="' + eraClass(c.era) + '">' + eraLabel(c.era) + '</span>';
      if (c.id === todayId) h += '<span class="lib-item-field">今日</span>';
      h += '</div>';
      h += '<p class="lib-item-ex">' + esc(c.excerpt) + '</p>';
      h += '</div>';
    });
    slot.innerHTML = h;

    Array.prototype.forEach.call(slot.querySelectorAll('[data-card]'), function (el) {
      el.onclick = function () { openCard(el.getAttribute('data-card')); };
    });
  }

  function openCard(id) {
    var c = getCard(id);
    if (!c) return;
    var h = '';
    h += '<div class="excerpt">' + esc(c.excerpt) + '</div>';
    h += '<div class="source">《' + esc(c.book) + '》 ' + esc(c.author) + ' · ' + esc(c.field) + '</div>';
    h += '<p class="context">' + esc(c.context) + '</p>';
    h += '<div class="block"><div class="block-title">它到底在说什么</div>';
    h += '<div class="core-line">' + esc(c.core) + '</div>';
    h += '<dl class="mech"><dt>底层机制</dt><dd>' + esc(c.mechanism) + '</dd>';
    h += '<dt>常见误解</dt><dd>' + esc(c.misconception) + '</dd></dl></div>';
    if (c.work && c.work.length) {
      h += '<div class="block"><div class="block-title">工作怎么用</div><ol class="steps">';
      c.work.forEach(function (w) {
        h += '<li>';
        if (w.t) h += '<span class="trigger">触发条件：' + esc(w.t) + '</span>';
        h += esc(w.a);
        if (w.s) h += '<span class="script">「' + esc(w.s) + '」</span>';
        h += '</li>';
      });
      h += '</ol></div>';
    }
    if (c.life && c.life.length) {
      h += '<div class="block"><div class="block-title">生活怎么用</div><ul class="plain">';
      c.life.forEach(function (l) { h += '<li>' + esc(l) + '</li>'; });
      h += '</ul></div>';
    }
    if (c.micro) {
      h += '<div class="micro"><p class="do">今日微行动 · ' + esc(c.micro.do) + '</p>';
      h += '<p class="rec">完成后记一笔：' + esc(c.micro.record) + '</p></div>';
    }
    h += '<div class="row-actions">';
    h += '<button class="btn btn-primary" id="btn-set-today">设为今日卡片</button>';
    if (c.era === 'custom') h += '<button class="btn btn-ghost" id="btn-del-card">删除这条</button>';
    h += '</div>';
    showModal(c.book, h);
    document.getElementById('btn-set-today').onclick = function () {
      state.assign[todayStr()] = c.id;
      save(); hideModal(); renderLibrary(); renderToday();
    };
    var del = document.getElementById('btn-del-card');
    if (del) del.onclick = function () {
      if (!confirm('删除这条自定义书摘？')) return;
      state.custom = state.custom.filter(function (x) { return x.id !== c.id; });
      save(); hideModal(); renderLibrary();
    };
  }

  function openAddForm() {
    var h = '';
    h += '<div class="field"><label>书名</label><input type="text" id="a-book" placeholder="比如：认知觉醒"></div>';
    h += '<div class="field"><label>作者</label><input type="text" id="a-author" placeholder="选填"></div>';
    h += '<div class="field"><label>书中原文</label><textarea id="a-excerpt" style="min-height:110px" placeholder="粘贴你想整理的原文"></textarea>';
    h += '<div class="hint">原文会保留在书摘卡片中；AI 只负责补充解读和实践建议。</div></div>';
    h += '<div class="row-actions"><button class="btn btn-primary" id="btn-ai-prompt">生成 AI 补全提示词</button></div>';
    h += '<div id="ai-step" style="display:none;margin-top:16px">';
    h += '<div class="field"><label>复制下面提示词，发给你使用的 AI</label><textarea id="a-ai-prompt" style="min-height:160px" readonly></textarea></div>';
    h += '<div class="row-actions"><button class="btn" id="btn-copy-prompt">复制提示词</button></div>';
    h += '<div class="field" style="margin-top:16px"><label>把 AI 返回的 JSON 粘贴到这里</label><textarea id="a-ai-output" style="min-height:150px" placeholder="粘贴 AI 返回的 JSON"></textarea></div>';
    h += '<div class="row-actions"><button class="btn btn-primary" id="btn-ai-import">导入并检查补全内容</button></div></div>';
    h += '<div id="ai-fields" style="display:none;margin-top:16px">';
    h += '<div class="field"><label>领域</label><select id="a-field">';
    (window.FIELDS || []).forEach(function (f) { h += '<option>' + esc(f) + '</option>'; });
    h += '</select></div>';
    h += '<div class="field"><label>背景说明</label><textarea id="a-context"></textarea></div>';
    h += '<div class="field"><label>核心观点</label><textarea id="a-core"></textarea></div>';
    h += '<div class="field"><label>底层机制</label><textarea id="a-mechanism"></textarea></div>';
    h += '<div class="field"><label>常见误解 / 适用边界</label><textarea id="a-misconception"></textarea></div>';
    h += '<div class="field"><label>工作中的应用（每行一条）</label><textarea id="a-work" style="min-height:80px"></textarea></div>';
    h += '<div class="field"><label>生活中的应用（每行一条）</label><textarea id="a-life" style="min-height:80px"></textarea></div>';
    h += '<div class="field"><label>今日微行动</label><input type="text" id="a-micro"></div>';
    h += '<div class="field"><label>完成后记录什么</label><input type="text" id="a-micro-record"></div>';
    h += '<div class="row-actions"><button class="btn btn-primary" id="btn-add-save">检查后加入书摘库</button></div></div>';
    showModal('添加书摘', h);

    document.getElementById('btn-ai-prompt').onclick = function () {
      var book = document.getElementById('a-book').value.trim();
      var excerpt = document.getElementById('a-excerpt').value.trim();
      if (!book || !excerpt) { alert('请先填写书名和书中原文。'); return; }
      var author = document.getElementById('a-author').value.trim() || '未提供';
      var fields = (window.FIELDS || ['决策', '沟通', '效率', '管理', '心理', '财富']);
      var prompt = '请根据我提供的书名、作者和原文，为「每日5分钟读书与实践」生成一张书摘卡片。原文是唯一可靠依据，不要编造书中背景、作者观点或引文；分析可以是你的推论，并请说明适用边界。工作与生活建议要具体、可执行。\n\n书名：' + book + '\n作者：' + author + '\n原文：' + excerpt + '\n\n只返回一个合法 JSON 对象，不要 Markdown 代码围栏，结构如下：\n' + JSON.stringify({field:fields[0],context:'原文的主题背景或问题',core:'一句话概括核心观点',mechanism:'观点背后的原因或机制',misconception:'可能的误解、前提或适用边界',work:[{t:'触发场景',a:'具体做法',s:'可直接使用的一句话（没有则空字符串）'}],life:['生活中的具体应用'],micro:{do:'一个今天可做的小行动',record:'完成后值得记录的结果'}},null,2) + '\n\nfield 必须从以下选一个：' + fields.join('、') + '。work 返回 2 条，life 返回 2 条。不要重复输出 book、author、excerpt。';
      document.getElementById('a-ai-prompt').value = prompt;
      document.getElementById('ai-step').style.display = 'block';
      document.getElementById('ai-fields').style.display = 'none';
      document.getElementById('ai-step').scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    document.getElementById('btn-copy-prompt').onclick = function () {
      var box = document.getElementById('a-ai-prompt');
      box.focus(); box.select();
      var copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(box.value).then(function () { alert('提示词已复制。发给 AI 后，把它返回的 JSON 粘贴到下方。'); }).catch(function () { alert('请长按上方提示词并复制。'); });
      } else {
        try { copied = document.execCommand('copy'); } catch (e) {}
        alert(copied ? '提示词已复制。发给 AI 后，把它返回的 JSON 粘贴到下方。' : '请长按上方提示词并复制。');
      }
    };
    document.getElementById('btn-ai-import').onclick = function () {
      var raw = document.getElementById('a-ai-output').value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      var ai;
      try { ai = JSON.parse(raw); } catch (e) { alert('暂时无法解析。请粘贴 AI 返回的完整 JSON 对象。'); return; }
      if (!ai || typeof ai !== 'object') { alert('返回内容格式不正确。'); return; }
      var fields = window.FIELDS || ['决策', '沟通', '效率', '管理', '心理', '财富'];
      document.getElementById('a-field').value = fields.indexOf(ai.field) >= 0 ? ai.field : fields[0];
      document.getElementById('a-context').value = ai.context || '';
      document.getElementById('a-core').value = ai.core || '';
      document.getElementById('a-mechanism').value = ai.mechanism || '';
      document.getElementById('a-misconception').value = ai.misconception || '';
      var work = Array.isArray(ai.work) ? ai.work.map(function (w) {
        if (typeof w === 'string') return w;
        return [w.t || '', w.a || '', w.s || ''].filter(Boolean).join(' → ');
      }) : [];
      document.getElementById('a-work').value = work.join('\n');
      document.getElementById('a-life').value = Array.isArray(ai.life) ? ai.life.join('\n') : '';
      document.getElementById('a-micro').value = ai.micro && ai.micro.do || '';
      document.getElementById('a-micro-record').value = ai.micro && ai.micro.record || '';
      document.getElementById('ai-fields').style.display = 'block';
      document.getElementById('ai-fields').scrollIntoView({behavior:'smooth',block:'nearest'});
    };
    document.getElementById('btn-add-save').onclick = function () {
      var book = document.getElementById('a-book').value.trim();
      var excerpt = document.getElementById('a-excerpt').value.trim();
      if (!book || !excerpt) { alert('书名和书摘必填。'); return; }
      if (!document.getElementById('a-core').value.trim()) { alert('请先生成并导入 AI 补全内容。'); return; }
      var work = document.getElementById('a-work').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean)
        .map(function (s) {
          var parts = s.split(/→|->|｜|\|/);
          if (parts.length > 1) return { t: parts[0].trim(), a: parts[1].trim(), s: parts.slice(2).join(' ').trim() };
          return { t: '', a: s, s: '' };
        });
      var life = document.getElementById('a-life').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      state.custom.push({
        id: 'my-' + Date.now(),
        field: document.getElementById('a-field').value,
        era: 'custom',
        book: book,
        author: document.getElementById('a-author').value.trim() || '未标注',
        excerpt: excerpt,
        context: document.getElementById('a-context').value.trim(),
        core: document.getElementById('a-core').value.trim(),
        mechanism: document.getElementById('a-mechanism').value.trim(),
        misconception: document.getElementById('a-misconception').value.trim(),
        work: work,
        life: life,
        micro: { do: document.getElementById('a-micro').value.trim() || '今天用一次这条', record: document.getElementById('a-micro-record').value.trim() || '写下你用的场景和结果' }
      });
      save();
      hideModal();
      libEra = 'custom';
      document.getElementById('lib-era').value = 'custom';
      renderLibrary();
    };
  }

  /* ---------- 今日分享图 ---------- */

  function pathRoundRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function shareText(ctx, text, x, y, maxWidth, lineHeight, maxLines, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    var source = String(text || '').replace(/\s+/g, ' ').trim();
    if (!source) return y;
    var lines = [], line = '';
    Array.from(source).forEach(function (ch) {
      var test = line + ch;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = ch;
      } else line = test;
    });
    if (line) lines.push(line);
    var shown = lines.slice(0, maxLines);
    if (lines.length > maxLines && shown.length) {
      var last = shown[shown.length - 1];
      while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      shown[shown.length - 1] = last + '…';
    }
    shown.forEach(function (s, i) { ctx.fillText(s, x, y + i * lineHeight); });
    return y + shown.length * lineHeight;
  }

  function shareDivider(ctx, y) {
    ctx.strokeStyle = '#EAE4D9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(92, y);
    ctx.lineTo(988, y);
    ctx.stroke();
  }

  function buildShareCanvas(card, includePractice) {
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    var ctx = canvas.getContext('2d');
    var ink = '#292820', muted = '#777367', accent = '#9A5B2C';

    ctx.fillStyle = '#F2EEE5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#E9DFD1';
    ctx.beginPath(); ctx.arc(1000, 90, 190, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E6EBE2';
    ctx.beginPath(); ctx.arc(80, 1370, 175, 0, Math.PI * 2); ctx.fill();
    pathRoundRect(ctx, 34, 34, 1012, 1372, 36);
    ctx.fillStyle = '#FFFEFB'; ctx.fill();

    ctx.fillStyle = accent;
    pathRoundRect(ctx, 88, 82, 48, 48, 14); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('读', 112, 106); ctx.textAlign = 'left';
    ctx.fillStyle = ink; ctx.font = '700 34px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('每日 5 分钟', 154, 92);
    ctx.fillStyle = muted; ctx.font = '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('读一点 · 用一次 · 记一笔', 154, 137);

    var date = todayStr();
    ctx.fillStyle = '#F4E8DC'; pathRoundRect(ctx, 88, 188, 185, 50, 24); ctx.fill();
    ctx.fillStyle = accent; ctx.font = '600 23px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textBaseline = 'middle'; ctx.fillText(card.field || '今日阅读', 112, 213);
    ctx.fillStyle = muted; ctx.font = '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'right'; ctx.fillText(date, 990, 213); ctx.textAlign = 'left';

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = muted; ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('TODAY’S READING', 92, 302);
    var quoteEnd = shareText(ctx, '“' + (card.excerpt || '') + '”', 92, 356, 896, 61, 4,
      '500 43px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif', ink);
    ctx.fillStyle = muted; ctx.font = '26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    shareText(ctx, '《' + (card.book || '') + '》 · ' + (card.author || '作者未标注'), 92, Math.max(quoteEnd + 12, 610), 896, 36, 1,
      '26px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', muted);

    shareDivider(ctx, 660);
    ctx.fillStyle = accent; ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('我读到的', 92, 714);
    shareText(ctx, card.core || card.excerpt || '', 92, 765, 896, 48, 2,
      '600 34px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink);

    shareDivider(ctx, 880);
    ctx.fillStyle = accent; ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    var records = state.records.filter(function (r) { return r.date === date && r.cardId === card.id; });
    var record = records.length ? records[records.length - 1] : null;
    if (record && includePractice) {
      ctx.fillText('我的实践', 92, 934);
      if (record.scene) {
        ctx.fillStyle = muted; ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'; ctx.fillText('场景', 92, 976);
        shareText(ctx, record.scene, 172, 976, 810, 34, 1, '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink);
      }
      if (record.did) {
        ctx.fillStyle = muted; ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'; ctx.fillText('做法', 92, 1022);
        shareText(ctx, record.did, 172, 1022, 810, 34, 2, '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink);
      }
      if (record.result) {
        ctx.fillStyle = muted; ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'; ctx.fillText('回顾', 92, 1096);
        shareText(ctx, record.result, 172, 1096, 810, 34, 2, '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink);
      }
    } else {
      ctx.fillText('今天可以这样用', 92, 934);
      var work = card.work && card.work.length ? card.work[0] : null;
      var life = card.life && card.life.length ? card.life[0] : '';
      var practiceY = 980;
      if (work) {
        ctx.fillStyle = muted; ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'; ctx.fillText('工作', 92, practiceY);
        practiceY = shareText(ctx, work.a || '', 172, practiceY, 810, 34, 2, '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink) + 8;
      }
      if (life) {
        ctx.fillStyle = muted; ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'; ctx.fillText('生活', 92, practiceY);
        shareText(ctx, life, 172, practiceY, 810, 34, 2, '24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink);
      }
    }

    var microY = record && includePractice ? 1200 : 1190;
    pathRoundRect(ctx, 82, microY, 916, 128, 20); ctx.fillStyle = '#F4E8DC'; ctx.fill();
    ctx.fillStyle = accent; ctx.font = '700 21px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('今日微行动', 112, microY + 38);
    shareText(ctx, card.micro && card.micro.do || '把今天读到的观点用一次。', 112, microY + 76, 850, 32, 2,
      '25px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif', ink);

    ctx.fillStyle = muted; ctx.font = '22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('把读到的，变成自己的方法', 540, 1368); ctx.textAlign = 'left';
    return canvas;
  }

  function openShareCard(card) {
    var date = todayStr();
    var records = state.records.filter(function (r) { return r.date === date && r.cardId === card.id; });
    var includePractice = records.length > 0;
    var h = '<p class="share-note">竖版 3:4 图片，适合保存后发布到小红书。图片在本机生成，不会上传你的记录。</p>';
    if (records.length) h += '<label class="share-check"><input type="checkbox" id="share-include-practice" checked> 图片包含我今天写下的实践和回顾</label>';
    h += '<img class="share-preview" id="share-preview" alt="今日读书实践分享图预览">';
    h += '<div class="row-actions share-actions"><button class="btn btn-primary" id="btn-share-file">分享图片</button><button class="btn" id="btn-save-image">保存图片</button><button class="btn btn-ghost" id="btn-copy-caption">复制配文</button></div>';
    h += '<p class="share-note">若系统分享菜单里没有小红书，先保存图片，再到小红书发布笔记。</p>';
    showModal('今日读书实践分享图', h);
    var canvas = buildShareCanvas(card, includePractice);
    document.getElementById('share-preview').src = canvas.toDataURL('image/png');
    var toggle = document.getElementById('share-include-practice');
    if (toggle) toggle.onchange = function () {
      includePractice = toggle.checked;
      canvas = buildShareCanvas(card, includePractice);
      document.getElementById('share-preview').src = canvas.toDataURL('image/png');
    };
    function pngBlob(done) { canvas.toBlob(done, 'image/png'); }
    function filename() { return '每日5分钟-' + date + '.png'; }
    function saveBlob(blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = filename();
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    }
    document.getElementById('btn-save-image').onclick = function () { pngBlob(saveBlob); };
    document.getElementById('btn-share-file').onclick = function () {
      pngBlob(function (blob) {
        var file = new File([blob], filename(), { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ title: '每日读书实践', files: [file] }).catch(function () {});
        } else saveBlob(blob);
      });
    };
    document.getElementById('btn-copy-caption').onclick = function () {
      var rec = includePractice && records.length ? records[records.length - 1] : null;
      var caption = '今日读书｜《' + card.book + '》\n' + (card.core || card.excerpt) +
        (rec && rec.did ? '\n\n我的实践：' + rec.did : '') +
        (rec && rec.result ? '\n我的回顾：' + rec.result : '') +
        '\n\n#每日5分钟 #读书分享 #读书笔记';
      function fallbackCopy() {
        var field = document.createElement('textarea');
        field.value = caption; field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.appendChild(field); field.select();
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(field);
        alert(copied ? '配文已复制，可以粘贴到小红书。' : caption);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(caption).then(function () { alert('配文已复制，可以粘贴到小红书。'); }).catch(fallbackCopy);
      } else fallbackCopy();
    };
  }

  function showModal(title, html) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal').classList.remove('is-hidden');
  }

  function hideModal() {
    document.getElementById('modal').classList.add('is-hidden');
  }

  /* ---------- 导入导出 ---------- */

  function toMarkdown() {
    var lines = ['# 每日 5 分钟 · 实践记录', ''];
    var sorted = state.records.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var byDate = {};
    sorted.forEach(function (r) {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });
    var dates = Object.keys(byDate).sort().reverse();
    dates.forEach(function (d) {
      lines.push('## ' + d);
      byDate[d].forEach(function (r) {
        var c = getCard(r.cardId);
        lines.push('');
        lines.push('- 出处：《' + (c ? c.book : '已删除') + '》' + (c ? ' ' + c.author : ''));
        lines.push('- 归属：' + (r.tag === 'life' ? '生活' : '工作'));
        if (r.scene) lines.push('- 场景：' + r.scene);
        if (r.did) lines.push('- 做法：' + r.did);
        if (r.result) lines.push('- 结果：' + r.result);
      });
      lines.push('');
    });
    if (state.custom && state.custom.length) {
      lines.push('## 我添加的书摘');
      state.custom.forEach(function (c) {
        lines.push('');
        lines.push('### 《' + c.book + '》' + (c.author ? ' ' + c.author : ''));
        lines.push(c.excerpt);
      });
    }
    return lines.join('\n');
  }

  function download(name, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 视图切换 ---------- */

  function switchView(v) {
    view = v;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-view') === v);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.view'), function (s) {
      s.classList.toggle('is-hidden', s.id !== 'view-' + v);
    });
    if (v === 'today') renderToday();
    if (v === 'journal') renderJournal();
    if (v === 'stats') renderStats();
    if (v === 'library') renderLibrary();
    window.scrollTo(0, 0);
  }

  function boot() {
    ensureToday();
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.onclick = function () { switchView(t.getAttribute('data-view')); };
    });
    document.getElementById('btn-add-card').onclick = openAddForm;
    document.getElementById('lib-search').oninput = function (e) { libQuery = e.target.value; renderLibrary(); };
    document.getElementById('lib-field').onchange = function (e) { libField = e.target.value; renderLibrary(); };
    document.getElementById('lib-era').onchange = function (e) { libEra = e.target.value; renderLibrary(); };
    document.getElementById('btn-export-md').onclick = function () {
      download('每日5分钟-实践记录-' + todayStr() + '.md', toMarkdown(), 'text/markdown;charset=utf-8');
    };
    document.getElementById('btn-export-json').onclick = function () {
      download('每日5分钟-备份-' + todayStr() + '.json', JSON.stringify(state, null, 2), 'application/json');
    };
    document.getElementById('btn-import-json').onclick = function () {
      document.getElementById('file-import').click();
    };
    document.getElementById('file-import').onchange = function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var s = JSON.parse(reader.result);
          state = {
            assign: s.assign || {},
            records: s.records || [],
            custom: s.custom || [],
            swaps: s.swaps || {},
            tags: s.tags || {}
          };
          save();
          switchView(view);
          alert('已恢复。');
        } catch (err) {
          alert('文件格式不对，导入失败。');
        }
      };
      reader.readAsText(f);
      e.target.value = '';
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (el) {
      el.onclick = hideModal;
    });
    switchView('today');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
