// Gemini Title Summarizer - content.js v1.7 (ポーリング最適化＆先頭配置版)

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
    e.preventDefault();
    e.stopPropagation();

    console.log('Gemini Title Summarizer: 「要約を追加」クリック');
    
    // 1. 本物の「名前を変更」ボタンをクリックしてダイアログを開く
    renameBtn.click();

    // 2. ダイアログと入力欄をポーリングで待つ (100ms間隔 x 最大10回 = 1秒)
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      const dialogs = document.querySelectorAll('[role="dialog"], .mat-mdc-dialog-container, .cdk-overlay-container');
      let inputEl = null;
      let activeDialog = null;

      for (const d of dialogs) {
        inputEl = d.querySelector('input[type="text"], input:not([type]), [contenteditable="true"]');
        if (inputEl && inputEl.getBoundingClientRect().width > 0) {
          activeDialog = d;
          break;
        }
      }

      // 入力欄が見つかった場合
      if (inputEl) {
        clearInterval(checkInterval);
        console.log(`Gemini Title Summarizer: 入力欄発見 (${attempts}回目)`, inputEl);
        
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
          
          // 4. 保存ボタンのポーリング待機 (Angularが入力変更を検知してボタンを有効化するのを待つ)
          let saveAttempts = 0;
          const saveInterval = setInterval(() => {
            saveAttempts++;
            if (!activeDialog) {
              clearInterval(saveInterval);
              return;
            }

            const buttons = activeDialog.querySelectorAll('button');
            for (const btn of buttons) {
              if (btn.textContent.includes('名前を変更') && !btn.classList.contains('summarize-added') && !btn.disabled) {
                console.log(`Gemini Title Summarizer: 保存ボタンを自動クリック (${saveAttempts}回目)`);
                btn.click();
                clearInterval(saveInterval);
                return;
              }
            }

            if (saveAttempts >= 10) {
              clearInterval(saveInterval);
              console.error('Gemini Title Summarizer: タイムアウト。保存ボタンが押せません。');
            }
          }, 50);

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
      } else if (attempts >= 10) {
        clearInterval(checkInterval);
        console.error('Gemini Title Summarizer: タイムアウト。入力欄が見つかりません。');
      }
    }, 100);
  });

  // メニューの先頭（一番上）に追加する
  renameBtn.parentNode.prepend(summarizeBtn);
}

let isInjecting = false;
const observer = new MutationObserver(() => {
  if (isInjecting) return;
  
  const menus = document.querySelectorAll('[role="menu"], .mat-mdc-menu-panel');
  for (const menu of menus) {
    if (menu && menu.textContent.includes('名前を変更') && !menu.querySelector('.summarize-added')) {
      isInjecting = true;
      try {
        injectSummarizeButton(menu);
      } catch(e) {
        console.error(e);
      } finally {
        isInjecting = false;
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log('Gemini Title Summarizer: 監視開始 (v1.7 - ポーリング最適化＆先頭配置版)');
