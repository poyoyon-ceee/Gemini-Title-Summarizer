// Gemini Title Summarizer - content.js v1.16 (ボタン配置最適化版)

// --- 1. 要約を追加するロジック (配置をトップに変更) ---
function injectSummarizeButton(menu) {
  if (menu.querySelector('.summarize-added')) return;

  const walker = document.createTreeWalker(menu, NodeFilter.SHOW_TEXT, null, false);
  let renameTextNode = null;
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim() === '名前を変更') {
      renameTextNode = node;
      break;
    }
  }

  if (!renameTextNode) return;
  const renameBtn = renameTextNode.parentElement.closest('[role="menuitem"], button');
  if (!renameBtn) return;

  const summarizeBtn = renameBtn.cloneNode(true);
  summarizeBtn.classList.add('summarize-added');
  
  const walker2 = document.createTreeWalker(summarizeBtn, NodeFilter.SHOW_TEXT, null, false);
  while (node = walker2.nextNode()) {
    if (node.textContent.trim() === '名前を変更') {
      node.textContent = '要約を追加';
    }
  }

  summarizeBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    console.log('Gemini Title Summarizer: 「要約を追加」クリック');
    renameBtn.click();
    setTimeout(() => {
      const dialogs = document.querySelectorAll('.cdk-overlay-container, [role="dialog"], mat-dialog-container');
      let inputEl = null;
      let activeDialog = null;
      for(const d of dialogs) {
        inputEl = d.querySelector('input[type="text"], input:not([type]), [contenteditable="true"]');
        if(inputEl && (inputEl.offsetWidth > 0 || inputEl.offsetHeight > 0)) {
          activeDialog = d;
          break;
        }
      }
      if (!inputEl) return;
      let val = (inputEl.value || inputEl.textContent || '').trim();
      if (!val.startsWith('要約：')) {
        const newVal = '要約：' + val;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeSetter ? nativeSetter.call(inputEl, newVal) : (inputEl.value = newVal);
        inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        setTimeout(() => {
          if (activeDialog) {
            const buttons = activeDialog.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('名前を変更') && !btn.classList.contains('summarize-added')) {
                btn.click();
                break;
              }
            }
          }
        }, 150);
      }
    }, 300);
  });

  // 配置ロジック: 「ゴミ箱へポイ」があればその直後に、なければ先頭に
  const archiveBtn = menu.querySelector('.archive-added');
  if (archiveBtn) {
    archiveBtn.insertAdjacentElement('afterend', summarizeBtn);
  } else {
    menu.prepend(summarizeBtn);
  }
}

// --- 2. ゴミ箱（ノートブック）へ移動するロジック (配置をトップに変更) ---
function injectArchiveButton(menu) {
  if (menu.querySelector('.archive-added')) return;
  const notebookBtn = Array.from(menu.querySelectorAll('[role="menuitem"], button')).find(el => el.textContent.includes('ノートブックに追加'));
  if (!notebookBtn) return;

  const archiveBtn = notebookBtn.cloneNode(true);
  archiveBtn.classList.add('archive-added');
  archiveBtn.style.color = '#ff8a80'; 
  
  const label = archiveBtn.querySelector('.gds-label-l');
  if (label) label.textContent = 'ゴミ箱へポイ';
  else archiveBtn.textContent = 'ゴミ箱へポイ';

  archiveBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    console.log('Gemini Title Summarizer: アーカイブ開始');
    notebookBtn.click();
    let trashItem = null;
    let attempts = 0;
    const findTrashInterval = setInterval(() => {
      attempts++;
      const overlays = document.querySelectorAll('.cdk-overlay-container, [role="dialog"], mat-dialog-container');
      for (const overlay of overlays) {
        const elements = overlay.querySelectorAll('*');
        for (const el of elements) {
          if (el.textContent.trim() === 'ゴミ箱' && el.children.length === 0 && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
            trashItem = el.closest('mat-list-item, [role="option"], button, li') || el;
            break;
          }
        }
        if (trashItem) break;
      }
      if (trashItem) {
        clearInterval(findTrashInterval);
        trashItem.click(); 
        let addAttempts = 0;
        const clickAddInterval = setInterval(() => {
          addAttempts++;
          const overlays = document.querySelectorAll('.cdk-overlay-container, [role="dialog"], mat-dialog-container');
          for (const overlay of overlays) {
            const buttons = overlay.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('追加') && !btn.disabled && (btn.offsetWidth > 0 || btn.offsetHeight > 0)) {
                btn.click();
                clearInterval(clickAddInterval);
                return;
              }
            }
          }
          if (addAttempts > 20) clearInterval(clickAddInterval);
        }, 100);
      } else if (attempts > 30) { 
        clearInterval(findTrashInterval);
      }
    }, 100);
  });
  
  // 先頭に配置
  menu.prepend(archiveBtn);
  // もし「要約を追加」が既に先頭にあったら、Archiveの後ろに移動させる
  const summarizeBtn = menu.querySelector('.summarize-added');
  if (summarizeBtn) {
    archiveBtn.insertAdjacentElement('afterend', summarizeBtn);
  }
}

// --- 3. 監視ロジック ---
let isInjecting = false;
const observer = new MutationObserver(() => {
  if (isInjecting) return;
  const menus = document.querySelectorAll('[role="menu"], .mat-mdc-menu-panel');
  for (const menu of menus) {
    if (menu && (menu.offsetWidth > 0 || menu.offsetHeight > 0) && !menu.querySelector('.summarize-added')) {
      isInjecting = true;
      try {
        if (menu.textContent.includes('名前を変更')) injectSummarizeButton(menu);
        if (menu.textContent.includes('ノートブックに追加')) injectArchiveButton(menu);
      } finally {
        isInjecting = false;
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log('Gemini Title Summarizer: 監視開始 (v1.16 - ボタン配置最適化版)');
