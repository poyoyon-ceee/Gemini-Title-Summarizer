// Gemini Title Summarizer - content.js v1.2
// 修正内容: ダイアログ内入力欄の検知精度向上 & 保存ボタンの直接クリック対応

function findRenameButton(container) {
  const elements = container.querySelectorAll('*');
  for (const el of elements) {
    if (el.textContent && el.textContent.trim() === '名前を変更' && el.children.length === 0) {
      return el.closest('button') || el.closest('[role="menuitem"]') || el;
    }
  }
  return null;
}

function setInputValue(input, newValue) {
  const isContentEditable = input.getAttribute('contenteditable') === 'true';
  
  if (isContentEditable) {
    input.textContent = newValue;
  } else {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                                   Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, newValue);
    } else {
      input.value = newValue;
    }
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function triggerSave(input) {
  // 方法1: Enterキーのシミュレート
  const eventOptions = { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 };
  input.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
  input.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
  input.dispatchEvent(new KeyboardEvent('keyup', eventOptions));

  // 方法2: ダイアログ内の「名前を変更」ボタンを探してクリック
  setTimeout(() => {
    const dialog = input.closest('[role="dialog"]');
    if (dialog) {
      const buttons = dialog.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('名前を変更') && !btn.classList.contains('summarize-added')) {
          console.log('Gemini Title Summarizer: 保存ボタンをクリック');
          btn.click();
          return;
        }
      }
    }
  }, 300);
}

function waitForInput() {
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      // 1. ダイアログ内を優先
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const input = dialog.querySelector('input[type="text"], textarea, [contenteditable="true"]');
        if (input && input.offsetParent !== null) {
          clearInterval(interval);
          console.log('Gemini Title Summarizer: ダイアログ内の入力欄を特定', input);
          resolve(input);
          return;
        }
      }

      // 2. フォールバック: 可視状態の入力欄
      const allInputs = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
      for (const input of allInputs) {
        const isVisible = input.offsetParent !== null;
        const isMainInput = input.closest('.input-area-container') || 
                           input.getAttribute('aria-label')?.includes('プロンプト') ||
                           input.placeholder?.includes('プロンプト');
        
        if (isVisible && !isMainInput) {
          clearInterval(interval);
          console.log('Gemini Title Summarizer: 入力欄を特定', input);
          resolve(input);
          return;
        }
      }

      if (++attempts > 50) {
        clearInterval(interval);
        console.error('Gemini Title Summarizer: 入力欄が見つかりませんでした');
        resolve(null);
      }
    }, 100);
  });
}

function injectSummarizeButton(menu) {
  if (menu.querySelector('.summarize-added')) return;

  const renameBtn = findRenameButton(menu);
  if (!renameBtn) return;

  const summarizeBtn = renameBtn.cloneNode(true);
  summarizeBtn.classList.add('summarize-added');
  
  const walker = document.createTreeWalker(summarizeBtn, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim() === '名前を変更') {
      node.textContent = '要約を追加';
    }
  }

  summarizeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Gemini Title Summarizer: 「要約を追加」クリック');
    renameBtn.click();

    waitForInput().then(input => {
      if (!input) return;

      input.focus();
      
      setTimeout(() => {
        const isContentEditable = input.getAttribute('contenteditable') === 'true';
        let val = isContentEditable ? input.textContent : input.value;
        val = (val || '').trim();

        if (!val.startsWith('要約：')) {
          const newVal = '要約：' + val;
          console.log('Gemini Title Summarizer: 値を変更 ->', newVal);
          setInputValue(input, newVal);
          
          setTimeout(() => {
            triggerSave(input);
          }, 300);
        } else {
          console.log('Gemini Title Summarizer: すでに「要約：」が付与されています');
        }
      }, 200);
    });
  });

  renameBtn.parentNode.insertBefore(summarizeBtn, renameBtn.nextSibling);
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const menu = node.querySelector('[role="menu"]') || (node.getAttribute('role') === 'menu' ? node : null);
      if (menu) injectSummarizeButton(menu);
      const possibleMenu = node.closest('[role="menu"]');
      if (possibleMenu) injectSummarizeButton(possibleMenu);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log('Gemini Title Summarizer: 監視開始 (v1.2 - ダイアログ検知強化版)');
