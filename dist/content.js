// Gemini Title Summarizer - content.js v1.15 (要約自動保存 v1.6準拠 ＋ ゴミ箱アーカイブ)

// --- 1. 要約を追加するロジック (v1.6準拠・安定版) ---
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
    
    // 1. 本物の「名前を変更」ボタンをクリックしてダイアログを開く
    renameBtn.click();

    // 2. ダイアログと入力欄を待つ
    setTimeout(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], .mat-mdc-dialog-container, .cdk-overlay-container');
      let inputEl = null;
      let activeDialog = null;

      for(const d of dialogs) {
        inputEl = d.querySelector('input[type="text"], input:not([type]), [contenteditable="true"]');
        if(inputEl && (inputEl.offsetWidth > 0 || inputEl.offsetHeight > 0)) {
          activeDialog = d;
          break;
        }
      }

      if (!inputEl) {
        console.error('Gemini Title Summarizer: タイムアウト。入力欄が見つかりません。');
        return;
      }

      console.log('Gemini Title Summarizer: 入力欄発見', inputEl);
      
      // 3. 値の書き換え
      let val = inputEl.value || inputEl.textContent || '';
      val = val.trim();

      if (!val.startsWith('要約：')) {
        const newVal = '要約：' + val;
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(inputEl, newVal);
        } else {
          inputEl.value = newVal;
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        
        // 4. 保存ボタンをクリック
        setTimeout(() => {
          if (activeDialog) {
            const buttons = activeDialog.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('名前を変更') && !btn.classList.contains('summarize-added')) {
                console.log('Gemini Title Summarizer: 保存ボタンを自動クリック');
                btn.click();
                break;
              }
            }
          }
        }, 150);
      } else {
        if (activeDialog) {
          const buttons = activeDialog.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.includes('キャンセル')) {
              btn.click();
              break;
            }
          }
        }
      }
    }, 300);
  });

  renameBtn.parentNode.insertBefore(summarizeBtn, renameBtn.nextSibling);
}

// --- 2. ゴミ箱（ノートブック）へ移動するロジック (v1.12準拠) ---
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
    notebookBtn.click(); // ダイアログを開く

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
        console.log('Gemini Title Summarizer: ゴミ箱を発見', trashItem);
        trashItem.click(); 
        
        let addAttempts = 0;
        const clickAddInterval = setInterval(() => {
          addAttempts++;
          const overlays = document.querySelectorAll('.cdk-overlay-container, [role="dialog"], mat-dialog-container');
          for (const overlay of overlays) {
            const buttons = overlay.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('追加') && !btn.disabled && (btn.offsetWidth > 0 || btn.offsetHeight > 0)) {
                console.log('Gemini Title Summarizer: 追加ボタンをクリック');
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
        console.error('Gemini Title Summarizer: タイムアウト。「ゴミ箱」が見つかりません。');
      }
    }, 100);
  });
  
  notebookBtn.parentNode.prepend(archiveBtn);
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
console.log('Gemini Title Summarizer: 監視開始 (v1.15 - 統合安定版)');
