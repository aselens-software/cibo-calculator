const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  let clipboardStore = '';

  ipcMain.handle('settings:load', () => ({ theme: 'default', colorScheme: 'dark', calculatorMode: 'standard', language: 'auto' }));
  ipcMain.handle('settings:save', () => true);
  ipcMain.handle('history:load', () => []);
  ipcMain.handle('history:save', () => true);
  ipcMain.handle('history:clear', () => true);
  ipcMain.handle('window:minimize', () => {});
  ipcMain.handle('window:maximize-toggle', () => false);
  ipcMain.handle('window:close', () => {});
  ipcMain.handle('clipboard:write', (e, text) => { clipboardStore = text; return true; });
  ipcMain.handle('clipboard:read', () => clipboardStore || '');
  ipcMain.handle('system:get-locale', () => 'tr-TR');
  ipcMain.handle('system:open-external', (e, url) => true);

  const win = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 360,
    minHeight: 500,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.webContents.on('console-message', (event, level, message) => console.log('RENDERER:', message));

  await win.loadFile(path.join(__dirname, '..', 'index.html'));

  // Run in-page evaluation
  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const tests = [];
      const assert = (name, cond, info = '') => {
        tests.push({ name, passed: !!cond, info });
      };

      try {
        // Test 1: DOM Elements exist & removed items are verified
        assert('Document title is localized CIBO title', document.title === 'CIBO Hesap Makinesi' || document.title === 'CIBO Calculator', 'Got: ' + document.title);
        assert('Standard keypad removed 1/x', !document.querySelector('#standard-keypad [data-action="reciprocal"]'));
        assert('Standard keypad removed x2', !document.querySelector('#standard-keypad [data-action="square"]'));
        assert('Standard keypad removed sqrt', !document.querySelector('#standard-keypad [data-action="sqrt"]'));
        assert('Standard keypad has 20 buttons', document.querySelectorAll('#standard-keypad button').length === 20, 'Count: ' + document.querySelectorAll('#standard-keypad button').length);
        assert('Scientific keypad has 1/x', !!document.querySelector('#scientific-keypad [data-fn="reciprocal"]'));
        assert('Scientific keypad has x2', !!document.querySelector('#scientific-keypad [data-fn="square"]'));
        assert('Scientific keypad has sqrt', !!document.querySelector('#scientific-keypad [data-fn="sqrt"]'));
        assert('Sidebar nav button exists', !!document.getElementById('btn-open-nav'));
        assert('Nav drawer exists', !!document.getElementById('nav-drawer'));
        assert('Always on Top button removed from UI', !document.getElementById('btn-always-on-top'));
        assert('Screen copy button removed from UI', !document.getElementById('btn-copy-result'));
        assert('Screen paste button removed from UI', !document.getElementById('btn-paste-expr'));
        assert('Memory bar exists in UI', !!document.getElementById('memory-bar'));
        assert('Memory tab exists in side panel', !!document.getElementById('tab-memory'));
        assert('Memory badge exists in status bar', !!document.getElementById('badge-memory'));
        assert('Custom context menu exists', !!document.getElementById('custom-context-menu'));
        assert('Themed language dropdown exists', !!document.getElementById('themed-lang-dropdown'));
        assert('Button transparency row exists in settings', !!document.getElementById('row-btn-transparency'));
        assert('Button transparency checkbox exists', !!document.getElementById('chk-btn-transparency'));
        assert('About modal exists', !!document.getElementById('about-modal'));
        assert('Shortcuts modal exists', !!document.getElementById('shortcuts-modal'));
        assert('App branding logo exists', !!document.querySelector('.app-branding .app-icon'));
        assert('About button exists in nav drawer footer', !!document.getElementById('btn-open-about'));
        assert('Shortcuts button exists in nav drawer footer', !!document.getElementById('btn-open-shortcuts'));

        // Test 2: Sidebar opens when clicking btn-open-nav
        const navBtn = document.getElementById('btn-open-nav');
        navBtn.click();
        const navDrawer = document.getElementById('nav-drawer');
        assert('Sidebar opens on click', navDrawer.classList.contains('open'));

        // Close sidebar
        document.getElementById('btn-close-nav').click();
        assert('Sidebar closes on close button', !navDrawer.classList.contains('open'));

        // Test 3: Standard Calculation
        document.querySelector('.key-btn[data-action="c"]').click();
        document.querySelector('.key-num[data-num="5"]').click();
        document.querySelector('.key-op[data-op="+"]').click();
        document.querySelector('.key-num[data-num="3"]').click();
        document.querySelector('.key-equals').click();
        let val = document.getElementById('value-display').textContent.trim();
        assert('Simple addition 5 + 3 = 8', val === '8', 'Got: ' + val);

        // Test 4: Clipboard Paste (Ctrl+V) & Expression Evaluation: 100*(10-7)/6 = 50
        await window.electronAPI.copyToClipboard('100*(10-7)/6');
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true }));
        await new Promise(r => setTimeout(r, 100));
        val = document.getElementById('value-display').textContent.trim();
        assert('Ctrl+V expression evaluation 100*(10-7)/6 = 50', val === '50', 'Got: ' + val);

        // Test 5: Clipboard Copy (Ctrl+C) of current result
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true }));
        await new Promise(r => setTimeout(r, 100));
        let copiedVal = await window.electronAPI.readFromClipboard();
        assert('Ctrl+C copies result to clipboard', copiedVal === '50', 'Clipboard has: ' + copiedVal);

        // Left click on display does NOT copy to clipboard
        await window.electronAPI.copyToClipboard('');
        document.getElementById('value-display').click();
        await new Promise(r => setTimeout(r, 100));
        copiedVal = await window.electronAPI.readFromClipboard();
        assert('Left click on display does NOT copy to clipboard', copiedVal === '', 'Clipboard has: ' + copiedVal);

        // Test 6: Right-Click Custom Context Menu
        const ctxMenu = document.getElementById('custom-context-menu');
        window.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 150, bubbles: true }));
        assert('Context menu opens on right click', ctxMenu.style.display === 'block');
        assert('Context menu positioned correctly', parseInt(ctxMenu.style.left) >= 0 && parseInt(ctxMenu.style.top) >= 0);

        // Click outside closes context menu
        document.body.dispatchEvent(new PointerEvent('pointerdown', { clientX: 10, clientY: 10, bubbles: true }));
        assert('Context menu closes on click outside', ctxMenu.style.display === 'none');

        // Test 7: Context Menu Paste Action
        await window.electronAPI.copyToClipboard('25*4');
        window.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 150, bubbles: true }));
        ctxMenu.querySelector('.context-item[data-action="paste"]').click();
        await new Promise(r => setTimeout(r, 100));
        val = document.getElementById('value-display').textContent.trim();
        assert('Context menu Paste calculates 25*4 = 100', val === '100', 'Got: ' + val);

        // Test 8: Themed Language Dropdown
        const themedDropdown = document.getElementById('themed-lang-dropdown');
        const btnLangDropdown = document.getElementById('btn-lang-dropdown');
        const menuLangDropdown = document.getElementById('menu-lang-dropdown');
        btnLangDropdown.click();
        assert('Language dropdown opens on click', menuLangDropdown.style.display === 'block');

        // Select English from dropdown
        const enItem = menuLangDropdown.querySelector('.themed-dropdown-item[data-lang="en"]');
        enItem.click();
        assert('Language dropdown closes after selection', menuLangDropdown.style.display === 'none');
        let title = document.getElementById('current-mode-title').textContent.trim();
        assert('Language dropdown switched to English (Standard)', title === 'Standard', 'Got: ' + title);
        assert('Document title switched to English (CIBO Calculator)', document.title === 'CIBO Calculator', 'Got: ' + document.title);

        // Select Turkish back from dropdown
        btnLangDropdown.click();
        const trItem = menuLangDropdown.querySelector('.themed-dropdown-item[data-lang="tr"]');
        trItem.click();
        title = document.getElementById('current-mode-title').textContent.trim();
        assert('Language dropdown restored to Turkish (Standart)', title === 'Standart', 'Got: ' + title);
        assert('Document title restored to Turkish (CIBO Hesap Makinesi)', document.title === 'CIBO Hesap Makinesi', 'Got: ' + document.title);

        // Test 9: About Modal
        const aboutModal = document.getElementById('about-modal');
        const btnOpenAbout = document.getElementById('btn-open-about');
        btnOpenAbout.click();
        assert('About modal opens when clicking Hakkında', aboutModal.style.display === 'flex');
        const aboutName = aboutModal.querySelector('.about-app-name').textContent.trim();
        const aboutVer = aboutModal.querySelector('.about-version-badge').textContent.trim();
        const aboutBy = aboutModal.querySelector('.about-by').textContent.trim();
        const aboutLink = document.getElementById('link-aselens-website');
        assert('About modal has correct title', aboutName === 'CIBO Calculator', 'Got: ' + aboutName);
        assert('About modal has v1.3.3', aboutVer === 'v1.3.3', 'Got: ' + aboutVer);
        assert('About modal mentions Aselens Software', aboutBy.includes('Aselens Software'), 'Got: ' + aboutBy);
        assert('About link points to aselens.com', aboutLink.href.includes('aselens.com'));
        assert('About comment removed', !aboutModal.querySelector('.about-comment'));
        assert('About formula feature removed', !document.getElementById('about-feat-4'));
        const feat2 = document.getElementById('about-feat-2').textContent;
        assert('About feat 2 mentions 30+ themes and variations', feat2.includes('30+') && feat2.includes('60'), 'Got: ' + feat2);
        const feat6 = document.getElementById('about-feat-6').textContent;
        assert('About feat 6 does not mention Web Audio API', !feat6.includes('Web Audio API') && feat6.includes('ses'), 'Got: ' + feat6);

        // Close about modal
        document.getElementById('btn-about-ok').click();
        assert('About modal closes on OK button', aboutModal.style.display === 'none');

        // Test 10: Customizable Shortcuts Modal & Rebinding
        const shortcutsModal = document.getElementById('shortcuts-modal');
        const btnOpenShortcuts = document.getElementById('btn-open-shortcuts');
        btnOpenShortcuts.click();
        assert('Shortcuts modal opens', shortcutsModal.style.display === 'flex');
        assert('Reset shortcuts button has custom class', document.getElementById('btn-reset-shortcuts').classList.contains('shortcuts-reset-btn'));
        assert('Done shortcuts button has custom class', document.getElementById('btn-done-shortcuts').classList.contains('shortcuts-done-btn'));

        const rows = document.querySelectorAll('.shortcut-item-row');
        assert('All 18 modes listed in shortcuts list', rows.length === 18, 'Found: ' + rows.length);

        // Rebind "scientific" mode to Alt+S
        const sciBadge = document.querySelector('.shortcut-key-badge[data-mode="scientific"]');
        sciBadge.click();
        assert('Badge enters recording mode', sciBadge.classList.contains('is-recording'));

        // Dispatch key combination Alt + S
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', altKey: true, bubbles: true }));
        assert('Badge exited recording mode', !sciBadge.classList.contains('is-recording'));
        assert('Badge updated to Alt + S', sciBadge.textContent.includes('Alt') && sciBadge.textContent.includes('S'));

        // Close shortcuts modal
        document.getElementById('btn-done-shortcuts').click();
        assert('Shortcuts modal closed', shortcutsModal.style.display === 'none');

        // Test triggering the new shortcut Alt + S
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', altKey: true, bubbles: true }));
        title = document.getElementById('current-mode-title').textContent.trim();
        assert('New custom shortcut Alt + S switched to Scientific', title === 'Bilimsel', 'Got: ' + title);

        // Reset shortcuts to default
        btnOpenShortcuts.click();
        document.getElementById('btn-reset-shortcuts').click();
        document.getElementById('btn-done-shortcuts').click();

        // Test default shortcut Alt + 1 switches back to Standard
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', code: 'Digit1', altKey: true, bubbles: true }));
        title = document.getElementById('current-mode-title').textContent.trim();
        assert('Reset restored default Alt + 1 for Standard', title === 'Standart', 'Got: ' + title);

        // Test 11: Ignore Right-Alt (AltGr)
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', code: 'Digit2', altKey: true, code: 'AltRight', bubbles: true }));
        title = document.getElementById('current-mode-title').textContent.trim();
        assert('Right Alt / AltGr does NOT trigger shortcut', title === 'Standart', 'Got: ' + title);

        // Test 12: All 30 Themes Available & Light/Dark Support
        const themeCards = document.querySelectorAll('.theme-card');
        assert('All 30 themes present', themeCards.length === 30, 'Found: ' + themeCards.length);

        // Test AMOLED Theme Light Mode fix
        const amoledCard = document.querySelector('.theme-card[data-theme="amoled"]');
        assert('AMOLED theme card exists', !!amoledCard);
        amoledCard.click();
        assert('Body has theme-amoled class', document.body.classList.contains('theme-amoled'));

        // Toggle to Light mode
        document.getElementById('seg-mode-light').click();
        assert('Body has mode-light class in AMOLED theme', document.body.classList.contains('mode-light'));

        // Toggle back to Dark mode
        document.getElementById('seg-mode-dark').click();
        assert('Body has mode-dark class in AMOLED theme', document.body.classList.contains('mode-dark'));

        // Test 13: Universal Acrylic Transparency & Button Transparency
        const btnTrans = document.getElementById('btn-toggle-transparency');
        const rowBtnTrans = document.getElementById('row-btn-transparency');
        const chkBtnTrans = document.getElementById('chk-btn-transparency');

        // Turn transparency ON
        if (!document.body.classList.contains('has-transparency')) {
          btnTrans.click();
        }
        assert('Body has has-transparency', document.body.classList.contains('has-transparency'));
        assert('Button transparency row is visible when transparency is ON', rowBtnTrans.style.display !== 'none');
        assert('Default button transparency is solid (has-btn-solid)', document.body.classList.contains('has-btn-solid'));

        // Toggle button transparency ON
        chkBtnTrans.click();
        assert('Body has has-btn-transparency when button transparency is checked', document.body.classList.contains('has-btn-transparency'));

        // Toggle button transparency OFF
        chkBtnTrans.click();
        assert('Body has has-btn-solid when button transparency is unchecked', document.body.classList.contains('has-btn-solid'));

        // Turn transparency OFF
        btnTrans.click();
        assert('Body has no-transparency', document.body.classList.contains('no-transparency'));
        assert('Button transparency row is hidden when transparency is OFF', rowBtnTrans.style.display === 'none');

        // Test 14: Memory System Operations (MS, MR, M+, MC)
        document.querySelector('.key-btn[data-action="c"]').click();
        document.querySelector('.key-num[data-num="4"]').click();
        document.querySelector('.key-num[data-num="2"]').click();
        // Click MS
        document.getElementById('btn-ms').click();
        const badgeMem = document.getElementById('badge-memory');
        assert('Memory badge visible after MS', badgeMem.style.display !== 'none');
        assert('MC button is enabled', !document.getElementById('btn-mc').classList.contains('disabled'));
        assert('MR button is enabled', !document.getElementById('btn-mr').classList.contains('disabled'));

        // Clear display and recall
        document.querySelector('.key-btn[data-action="c"]').click();
        assert('Display cleared to 0', document.getElementById('value-display').textContent.trim() === '0');
        document.getElementById('btn-mr').click();
        assert('MR recalls 42', document.getElementById('value-display').textContent.trim() === '42');

        // Add 8 via M+
        document.querySelector('.key-btn[data-action="c"]').click();
        document.querySelector('.key-num[data-num="8"]').click();
        document.getElementById('btn-mplus').click();

        // Clear and recall: 42 + 8 = 50
        document.querySelector('.key-btn[data-action="c"]').click();
        document.getElementById('btn-mr').click();
        assert('M+ added 8, MR now recalls 50', document.getElementById('value-display').textContent.trim() === '50');

        // Clear Memory (MC)
        document.getElementById('btn-mc').click();
        assert('Memory badge hidden after MC', badgeMem.style.display === 'none');
        assert('MC button is disabled after clear', document.getElementById('btn-mc').classList.contains('disabled'));
        assert('MR button is disabled after clear', document.getElementById('btn-mr').classList.contains('disabled'));

      } catch (err) {
        tests.push({ name: 'Exception in tests', passed: false, info: err.stack || err.message });
      }

      return tests;
    })();
  `);

  console.log('=== TEST RESULTS ===');
  let allPassed = true;
  for (const t of results) {
    const status = t.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] ${t.name} ${t.info ? '(' + t.info + ')' : ''}`);
    if (!t.passed) allPassed = false;
  }
  console.log('====================');
  console.log(allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED!');

  app.exit(allPassed ? 0 : 1);
});
