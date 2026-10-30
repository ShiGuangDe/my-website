'use strict';
(() => {
  const files = window.DRIVE_FILES || [];
  const labels = {all:'全部文件',recent:'最近更新',documents:'文档资料',images:'壁纸图库',notes:'实用清单'};
  const state = {category:'all', query:'', sort:'default', view:'list'};
  const $ = (id) => document.getElementById(id);
  const list = $('file-list'), dialog = $('preview-dialog');
  let previewToken = 0;
  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const size = (n) => n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
  const totalBytes = files.reduce((n, f) => n + f.bytes, 0);
  $('all-count').textContent = files.length;
  document.querySelectorAll('[data-count]').forEach(el => el.textContent = files.filter(f => f.category === el.dataset.count).length);
  $('total-size').textContent = `${files.length} 个公开文件 · ${size(totalBytes)}`;

  function render() {
    let visible = files.filter(f => (state.category === 'all' || state.category === 'recent' || f.category === state.category) && `${f.name} ${f.description} ${f.type} ${labels[f.category]}`.toLowerCase().includes(state.query.toLowerCase().trim()));
    if (state.sort === 'name') visible.sort((a,b) => a.name.localeCompare(b.name,'zh-CN'));
    if (state.sort === 'size') visible.sort((a,b) => b.bytes - a.bytes);
    if (state.sort === 'date' || state.category === 'recent' && state.sort === 'default') visible.sort((a,b) => b.updated.localeCompare(a.updated) || b.order - a.order);
    document.querySelectorAll('.nav-item').forEach(el => {
      const active = el.dataset.category === state.category;
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
    });
    $('category-crumb').textContent = labels[state.category];
    const heading = state.query.trim() ? '搜索结果' : labels[state.category];
    $('files-title').firstChild.textContent = `${heading} `;
    $('file-count').textContent = `${visible.length} 个文件`;
    list.classList.toggle('grid', state.view === 'grid');
    document.querySelector('.file-table-head').hidden = state.view === 'grid';
    list.replaceChildren();
    for (const f of visible) {
      const row = document.createElement('article'); row.className = 'file-row';
      const isImage = f.category === 'images';
      row.innerHTML = `<div class="file-name-cell"><span class="file-type-icon ${isImage?'picture':f.type==='MD'?'markdown':'text'}">${isImage?'<img loading="lazy" alt="" src="'+f.path+'">':icon('file')}</span><div class="file-name-wrap"><button class="file-name" data-preview="${f.id}" title="预览 ${f.name}"></button><span class="file-subtitle"></span></div></div><span class="file-size">${size(f.bytes)}</span><time class="file-date" datetime="${f.updated}">${f.updated}</time><div class="file-actions"><button class="icon-button" data-preview="${f.id}" aria-label="预览 ${f.name}">${icon('eye')}</button><a class="download-link" href="${f.path}" download="${f.name}" aria-label="下载 ${f.name}">${icon('download')}<span>下载</span></a></div>`;
      row.querySelector('.file-name').textContent = f.name;
      row.querySelector('.file-subtitle').textContent = `${f.type} · ${f.description}`;
      list.append(row);
    }
    $('empty-state').hidden = visible.length > 0;
  }
  function category(value) {state.category = value; render();}
  document.querySelectorAll('[data-category]').forEach(el => el.addEventListener('click', () => category(el.dataset.category)));
  $('root-crumb').addEventListener('click', reset);
  $('reset-search').addEventListener('click', reset);
  function reset() {state.query = '';state.category = 'all';state.sort='default';$('search').value='';$('sort').value='default';render();}
  $('search').addEventListener('input', e => {state.query = e.target.value;render();});
  document.querySelector('.search').addEventListener('submit',e => e.preventDefault());
  $('sort').addEventListener('change',e => {state.sort = e.target.value;render();});
  for (const view of ['list','grid']) $(view+'-view').addEventListener('click', () => {
    state.view = view;
    for (const name of ['list','grid']) {$(name+'-view').classList.toggle('selected',name===view);$(name+'-view').setAttribute('aria-pressed',String(name===view));}
    render();
  });
  document.addEventListener('keydown',e => {
    if (e.key==='/' && !dialog.open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {e.preventDefault();$('search').focus();}
  });
  function showDialog() {if (!dialog.open) dialog.showModal();}
  function closeDialog() {previewToken++;dialog.close();}
  dialog.querySelector('.close-dialog').addEventListener('click',closeDialog);
  dialog.addEventListener('cancel',()=>{previewToken++;});
  dialog.addEventListener('click',e => {if (e.target===dialog) {const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
  list.addEventListener('click',e => {const button = e.target.closest('[data-preview]');if(button) preview(files.find(f => f.id===button.dataset.preview));});
  async function preview(file) {
    if (!file) return;
    const token = ++previewToken;
    $('dialog-eyebrow').textContent='文件预览';
    $('preview-title').textContent=file.name;
    $('preview-meta').textContent=`${file.type} · ${size(file.bytes)} · ${file.updated}`;
    const download = $('preview-download');download.hidden=false;download.href=file.path;download.download=file.name;
    const content=$('preview-content');content.className='preview-content';content.textContent='正在载入预览…';showDialog();
    if (file.category==='images') {
      const img = new Image();img.alt=file.description;img.src=file.path;img.onerror=()=>{if(token===previewToken)content.textContent='图片预览暂时不可用，请尝试下载文件。';};content.replaceChildren(img);
    } else {
      try {const response=await fetch(file.path);if(!response.ok)throw new Error('Load failed');const text=await response.text();if(token!==previewToken)return;const pre=document.createElement('pre');pre.textContent=text;content.replaceChildren(pre);}
      catch {if(token===previewToken)content.textContent='预览暂时不可用，请尝试下载文件。';}
    }
  }
  document.querySelectorAll('[data-help]').forEach(el => el.addEventListener('click',()=>{
    previewToken++;
    $('dialog-eyebrow').textContent='关于时光云盘';$('preview-title').textContent='分享，让好东西流动起来。';
    $('preview-content').className='preview-content help-content';
    $('preview-content').innerHTML='<h3>这里可以做什么？</h3><p>浏览公开文档、原创壁纸和实用清单。点击文件名称或预览图标查看内容，点击“下载”将文件保存到设备，也可以下载首页的完整资源包。</p><h3>怎么找到需要的文件？</h3><p>通过左侧分类或分类卡片筛选内容，在搜索框输入名称、类型或关键词。右上角可切换列表与网格视图，并按名称、时间或大小排序。</p><h3>下载需要登录吗？</h3><p>不需要。这里是公开分享空间，文件均可直接下载。目前提供的文档与插画壁纸由本站整理或原创，可供个人学习与使用。</p><h3>关于壁纸格式</h3><p>壁纸为 SVG 矢量图片，可在浏览器里打开并无损缩放；如设备不支持直接设置 SVG 壁纸，可先导出为 PNG 或截取所需尺寸。</p>';
    $('preview-meta').textContent='时光云盘 · 4448666.xyz';$('preview-download').hidden=true;showDialog();
  }));
  render();
})();
