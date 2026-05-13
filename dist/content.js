// Gemini Title Summarizer - content.js v1.17 (究極最適化版)

// --- 共通：条件を満たす要素が現れるまで待機する堅牢な関数 ---
function waitForElementCondition(selector, conditionFn, timeout = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (conditionFn(el)) {
          clearInterval(interval);
          resolve(el);
          return;
        }
      }
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 50); // 50ms間隔で高速検知
  });
}

// --- 1. 要約を追加するロジック ---
function injectSummarizeButton(menu) {
  if (menu.dataset.summarizeAdded) return;
  menu.dataset.summarizeAdded = 'true';

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
  summarizeBtn.style.color = '#00b0ff'; // 水色に変更
  
  const walker2 = document.createTreeWalker(summarizeBtn, NodeFilter.SHOW_TEXT, null, false);
  while (node = walker2.nextNode()) {
    if (node.textContent.trim() === '名前を変更') node.textContent = '動画要約に分類';
  }

  summarizeBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    console.log('Gemini Title Summarizer: 「動画要約に分類」クリック');
    renameBtn.click();

    // 入力欄をポーリング待機
    const inputEl = await waitForElementCondition(
      '[role="dialog"] input, .cdk-overlay-container input, [role="dialog"] [contenteditable="true"], .cdk-overlay-container [contenteditable="true"]',
      (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      3000
    );

    if (!inputEl) return console.error('Gemini Title Summarizer: 入力欄が見つかりません');

    let val = (inputEl.value || inputEl.textContent || '').trim();
    const activeDialog = inputEl.closest('[role="dialog"], .mat-mdc-dialog-container, .cdk-overlay-container');

    if (!val.startsWith('要約：')) {
      const newVal = '要約：' + val;
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeSetter ? nativeSetter.call(inputEl, newVal) : (inputEl.value = newVal);
      inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      
      // 保存ボタンをポーリング待機
      const saveBtn = await waitForElementCondition(
        'button',
        (btn) => activeDialog && activeDialog.contains(btn) && btn.textContent.includes('名前を変更') && !btn.classList.contains('summarize-added') && !btn.disabled,
        2000
      );
      if (saveBtn) saveBtn.click();

    } else {
      // キャンセルボタンをポーリング待機
      const cancelBtn = await waitForElementCondition(
        'button',
        (btn) => activeDialog && activeDialog.contains(btn) && btn.textContent.includes('キャンセル'),
        1000
      );
      if (cancelBtn) cancelBtn.click();
    }
  });

  const archiveBtn = menu.querySelector('.archive-added');
  if (archiveBtn) archiveBtn.insertAdjacentElement('afterend', summarizeBtn);
  else menu.prepend(summarizeBtn);
}

// --- 2. ゴミ箱（ノートブック）へ移動するロジック ---
function injectArchiveButton(menu) {
  if (menu.dataset.archiveAdded) return;
  menu.dataset.archiveAdded = 'true';

  const notebookBtn = Array.from(menu.querySelectorAll('[role="menuitem"], button')).find(el => el.textContent.includes('ノートブックに追加'));
  if (!notebookBtn) return;

  const archiveBtn = notebookBtn.cloneNode(true);
  archiveBtn.classList.add('archive-added');
  archiveBtn.style.color = '#ff8a80'; 
  
  const label = archiveBtn.querySelector('.gds-label-l');
  if (label) label.textContent = 'ゴミ箱へポイ';
  else archiveBtn.textContent = 'ゴミ箱へポイ';

  archiveBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    console.log('Gemini Title Summarizer: アーカイブ開始');
    notebookBtn.click();

    // ゴミ箱の要素をポーリング待機
    const trashItem = await waitForElementCondition(
      '.cdk-overlay-container span, .cdk-overlay-container div, [role="dialog"] span, [role="dialog"] div',
      (el) => el.textContent.trim() === 'ゴミ箱' && el.children.length === 0 && (el.offsetWidth > 0 || el.offsetHeight > 0),
      3000
    );

    if (trashItem) {
      console.log('Gemini Title Summarizer: ダイアログ内のゴミ箱を発見', trashItem);
      const clickableTarget = trashItem.closest('mat-list-item, [role="option"], button, li') || trashItem;
      clickableTarget.click(); 
      
      // 追加ボタンをポーリング待機
      const addBtn = await waitForElementCondition(
        '.cdk-overlay-container button, [role="dialog"] button',
        (btn) => btn.textContent.includes('追加') && !btn.disabled && (btn.offsetWidth > 0 || btn.offsetHeight > 0),
        2000
      );
      
      if (addBtn) {
        console.log('Gemini Title Summarizer: 追加ボタンをクリックして完了');
        addBtn.click();
      }
    } else {
      console.error('Gemini Title Summarizer: タイムアウト。「ゴミ箱」が見つかりません。');
    }
  });
  
  menu.prepend(archiveBtn);
  const summarizeBtn = menu.querySelector('.summarize-added');
  if (summarizeBtn) archiveBtn.insertAdjacentElement('afterend', summarizeBtn);
}

// --- 3. 監視ロジック ---
let isInjecting = false;
const observer = new MutationObserver(() => {
  if (isInjecting) return;
  const menus = document.querySelectorAll('[role="menu"], .mat-mdc-menu-panel');
  for (const menu of menus) {
    if (menu && (menu.offsetWidth > 0 || menu.offsetHeight > 0) && !menu.dataset.gtsProcessed) {
      isInjecting = true;
      try {
        menu.dataset.gtsProcessed = 'true';
        if (menu.textContent.includes('名前を変更')) injectSummarizeButton(menu);
        if (menu.textContent.includes('ノートブックに追加')) injectArchiveButton(menu);
      } finally {
        isInjecting = false;
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log('Gemini Title Summarizer: 監視開始 (v1.17 - 究極最適化版)');
