/**
 * HESAP MAKİNESİ - RENDERER PROCESS
 * Features:
 * - 17 Comprehensive Calculator & Converter Modes:
 *   1. Standart (Standard) [Alt + 1]
 *   2. Bilimsel (Scientific) [Alt + 2]
 *   3. Grafik Çizici (Graphing) [Alt + 3]
 *   4. Programcı (Programmer) [Alt + 4]
 *   5. Tarih Hesaplama (Date Calculation) [Alt + 5]
 *   6. Para Birimi (Currency) [Alt + 6]
 *   7. Hacim / Sıvı (Volume) [Alt + 7]
 *   8. Uzunluk (Length) [Alt + 8]
 *   9. Ağırlık ve Kütle (Weight) [Alt + 9]
 *   10. Sıcaklık (Temperature) [Alt + 0]
 *   11. Enerji (Energy)
 *   12. Alan (Area)
 *   13. Hız (Speed)
 *   14. Zaman (Time)
 *   15. Güç (Power)
 *   16. Veri (Data Storage)
 *   17. Basınç (Pressure)
 *   18. Açı (Angle)
 * - Left-Alt (Sol Alt) mode switcher (strictly ignores Right-Alt / AltGr)
 * - Always on Top toggle
 * - Transparency (Saydamlık / Akrilik) toggle for all 12 themes
 * - Global persistent history & memory
 * - 12 specialized themes with light/dark modes
 * - Web Audio API synthesized tactile sounds
 */

(() => {
  'use strict';

  // --- DEFAULT MODE SHORTCUTS ---
  const DEFAULT_SHORTCUTS = {
    'standard': 'Alt+1',
    'scientific': 'Alt+2',
    'graphing': 'Alt+3',
    'programmer': 'Alt+4',
    'date': 'Alt+5',
    'converter-currency': 'Alt+6',
    'converter-volume': 'Alt+7',
    'converter-length': 'Alt+8',
    'converter-weight': 'Alt+9',
    'converter-temperature': 'Alt+0',
    'converter-energy': 'Alt+-',
    'converter-area': 'Alt+=',
    'converter-speed': 'Alt+Q',
    'converter-time': 'Alt+W',
    'converter-power': 'Alt+E',
    'converter-data': 'Alt+R',
    'converter-pressure': 'Alt+T',
    'converter-angle': 'Alt+Y'
  };

  // --- APPLICATION STATE ---
  const state = {
    // Current Mode
    mode: 'standard', // 'standard' | 'scientific' | 'graphing' | 'programmer' | 'date' | 'converter-*'

    // Standard / Scientific Calculator State
    currentInput: '0',
    previousValue: null,
    pendingOperation: null,
    expressionLine: '',
    overwrite: false,
    lastEqualsOperation: null,
    angleMode: 'DEG',
    is2ndActive: false,
    memory: [],
    parenCount: 0,
    parenStack: [],

    // Programmer Calculator State
    progValue: 0n,
    progBase: 'DEC', // 'HEX' | 'DEC' | 'OCT' | 'BIN'
    progWordSize: 'QWORD', // 'QWORD'(64) | 'DWORD'(32) | 'WORD'(16) | 'BYTE'(8)
    progPendingOp: null,
    progPrevValue: null,
    progOverwrite: false,

    // Graphing Calculator State
    graphExpr: 'sin(x)',
    graphScale: 40, // pixels per unit
    graphOffsetX: 0,
    graphOffsetY: 0,
    graphIsDragging: false,
    graphDragStart: { x: 0, y: 0 },

    // Date Calculator State
    dateDiffFrom: new Date().toISOString().split('T')[0],
    dateDiffTo: new Date().toISOString().split('T')[0],
    dateAddStart: new Date().toISOString().split('T')[0],
    dateAddOp: 'add',
    dateAddYears: 0,
    dateAddMonths: 0,
    dateAddDays: 0,

    // Unit Converters State
    convCategory: 'converter-length',
    convFromUnit: '',
    convToUnit: '',
    convFromValue: '1',
    convActiveTarget: 'from', // 'from' | 'to'

    // Appearance, Window & Locale Settings
    theme: 'default',
    colorScheme: 'dark',
    transparencyEnabled: false,
    buttonTransparency: false,
    soundEnabled: true,
    language: 'auto',
    resolvedLanguage: 'tr',
    systemLocale: 'tr',

    // Customizable Shortcuts Map
    shortcuts: { ...DEFAULT_SHORTCUTS },

    // Persistent History
    history: []
  };

  // --- UNIT CONVERSION DEFINITIONS ---
  const CONVERTER_DATA = {
    'converter-currency': {
      title: 'Para Birimi (Kur)',
      base: 'USD',
      units: {
        'TRY': { name: 'Türk Lirası (₺)', rate: 0.029 },
        'USD': { name: 'Amerikan Doları ($)', rate: 1.0 },
        'EUR': { name: 'Euro (€)', rate: 1.08 },
        'GBP': { name: 'İngiliz Sterlini (£)', rate: 1.29 },
        'JPY': { name: 'Japon Yeni (¥)', rate: 0.0067 },
        'CHF': { name: 'İsviçre Frangı (CHF)', rate: 1.13 },
        'CAD': { name: 'Kanada Doları (C$)', rate: 0.73 },
        'AUD': { name: 'Avustralya Doları (A$)', rate: 0.66 },
        'SAR': { name: 'Suudi Riyali (SAR)', rate: 0.27 },
        'BTC': { name: 'Bitcoin (₿)', rate: 65000.0 },
        'ETH': { name: 'Ethereum (Ξ)', rate: 3200.0 }
      },
      defaultFrom: 'USD',
      defaultTo: 'TRY'
    },
    'converter-volume': {
      title: 'Hacim / Sıvı',
      base: 'L',
      units: {
        'ml': { name: 'Mililitre (mL)', rate: 0.001 },
        'L': { name: 'Litre (L)', rate: 1.0 },
        'm3': { name: 'Metreküp (m³)', rate: 1000.0 },
        'cm3': { name: 'Santimetreküp (cm³)', rate: 0.001 },
        'floz': { name: 'Sıvı ons (US fl oz)', rate: 0.0295735 },
        'cup': { name: 'Bardak (US Cup)', rate: 0.236588 },
        'pt': { name: 'Pint (US)', rate: 0.473176 },
        'qt': { name: 'Kuart (US)', rate: 0.946353 },
        'gal': { name: 'Galon (US gal)', rate: 3.78541 },
        'uk_gal': { name: 'Galon (UK gal)', rate: 4.54609 },
        'tsp': { name: 'Çay kaşığı (tsp)', rate: 0.00492892 },
        'tbsp': { name: 'Yemek kaşığı (tbsp)', rate: 0.0147868 }
      },
      defaultFrom: 'L',
      defaultTo: 'ml'
    },
    'converter-length': {
      title: 'Uzunluk',
      base: 'm',
      units: {
        'mm': { name: 'Milimetre (mm)', rate: 0.001 },
        'cm': { name: 'Santimetre (cm)', rate: 0.01 },
        'm': { name: 'Metre (m)', rate: 1.0 },
        'km': { name: 'Kilometre (km)', rate: 1000.0 },
        'in': { name: 'İnç (in)', rate: 0.0254 },
        'ft': { name: 'Fit (ft)', rate: 0.3048 },
        'yd': { name: 'Yard (yd)', rate: 0.9144 },
        'mi': { name: 'Mil (mi)', rate: 1609.344 },
        'nmi': { name: 'Deniz mili (nmi)', rate: 1852.0 },
        'um': { name: 'Mikrometre (µm)', rate: 0.000001 },
        'nm': { name: 'Nanometre (nm)', rate: 1e-9 }
      },
      defaultFrom: 'm',
      defaultTo: 'cm'
    },
    'converter-weight': {
      title: 'Ağırlık ve Kütle',
      base: 'kg',
      units: {
        'mg': { name: 'Miligram (mg)', rate: 0.000001 },
        'g': { name: 'Gram (g)', rate: 0.001 },
        'kg': { name: 'Kilogram (kg)', rate: 1.0 },
        't': { name: 'Metrik Ton (t)', rate: 1000.0 },
        'oz': { name: 'Ons (oz)', rate: 0.0283495 },
        'lb': { name: 'Libre / Pound (lb)', rate: 0.453592 },
        'st': { name: 'Taş / Stone (st)', rate: 6.35029 },
        'ct': { name: 'Karat (ct)', rate: 0.0002 }
      },
      defaultFrom: 'kg',
      defaultTo: 'g'
    },
    'converter-temperature': {
      title: 'Sıcaklık',
      isTemp: true,
      units: {
        'C': { name: 'Celsius (°C)' },
        'F': { name: 'Fahrenheit (°F)' },
        'K': { name: 'Kelvin (K)' }
      },
      defaultFrom: 'C',
      defaultTo: 'F'
    },
    'converter-energy': {
      title: 'Enerji',
      base: 'J',
      units: {
        'J': { name: 'Joule (J)', rate: 1.0 },
        'kJ': { name: 'Kilojoule (kJ)', rate: 1000.0 },
        'cal': { name: 'Termal kalori (cal)', rate: 4.184 },
        'kcal': { name: 'Kilokalori (kcal)', rate: 4184.0 },
        'kWh': { name: 'Kilovat-saat (kWh)', rate: 3600000.0 },
        'eV': { name: 'Elektronvolt (eV)', rate: 1.60218e-19 },
        'BTU': { name: 'İngiliz Isı Birimi (BTU)', rate: 1055.06 },
        'ftlb': { name: 'Fit-libre (ft⋅lb)', rate: 1.35582 }
      },
      defaultFrom: 'kcal',
      defaultTo: 'kJ'
    },
    'converter-area': {
      title: 'Alan',
      base: 'm2',
      units: {
        'cm2': { name: 'Santimetrekare (cm²)', rate: 0.0001 },
        'm2': { name: 'Metrekare (m²)', rate: 1.0 },
        'ha': { name: 'Hektar (ha)', rate: 10000.0 },
        'dekar': { name: 'Dekar / Dönüm', rate: 1000.0 },
        'km2': { name: 'Kilometrekare (km²)', rate: 1000000.0 },
        'sqin': { name: 'İnçkare (sq in)', rate: 0.00064516 },
        'sqft': { name: 'Fitkare (sq ft)', rate: 0.092903 },
        'sqyd': { name: 'Yardkare (sq yd)', rate: 0.836127 },
        'acre': { name: 'Akre (ac)', rate: 4046.86 },
        'sqmi': { name: 'Milkare (sq mi)', rate: 2589988.0 }
      },
      defaultFrom: 'm2',
      defaultTo: 'dekar'
    },
    'converter-speed': {
      title: 'Hız',
      base: 'mps',
      units: {
        'mps': { name: 'Metre/saniye (m/s)', rate: 1.0 },
        'kmh': { name: 'Kilometre/saat (km/h)', rate: 0.277778 },
        'mph': { name: 'Mil/saat (mph)', rate: 0.44704 },
        'knot': { name: 'Knot (kn)', rate: 0.514444 },
        'fps': { name: 'Fit/saniye (ft/s)', rate: 0.3048 },
        'mach': { name: 'Mach', rate: 340.29 }
      },
      defaultFrom: 'kmh',
      defaultTo: 'mph'
    },
    'converter-time': {
      title: 'Zaman',
      base: 's',
      units: {
        'ms': { name: 'Milisaniye (ms)', rate: 0.001 },
        's': { name: 'Saniye (s)', rate: 1.0 },
        'min': { name: 'Dakika (dk)', rate: 60.0 },
        'h': { name: 'Saat (sa)', rate: 3600.0 },
        'd': { name: 'Gün (g)', rate: 86400.0 },
        'wk': { name: 'Hafta (hf)', rate: 604800.0 },
        'mo': { name: 'Ay (ortalama)', rate: 2629800.0 },
        'yr': { name: 'Yıl (365 gün)', rate: 31536000.0 }
      },
      defaultFrom: 'h',
      defaultTo: 'min'
    },
    'converter-power': {
      title: 'Güç',
      base: 'W',
      units: {
        'W': { name: 'Watt (W)', rate: 1.0 },
        'kW': { name: 'Kilovat (kW)', rate: 1000.0 },
        'MW': { name: 'Megavat (MW)', rate: 1000000.0 },
        'hp': { name: 'Mekanik Beygir (HP)', rate: 745.7 },
        'ps': { name: 'Metrik Beygir (PS)', rate: 735.499 },
        'ftlb_min': { name: 'Fit-libre/dakika', rate: 0.022597 }
      },
      defaultFrom: 'kW',
      defaultTo: 'hp'
    },
    'converter-data': {
      title: 'Veri Depolama',
      base: 'B',
      units: {
        'b': { name: 'Bit (b)', rate: 0.125 },
        'B': { name: 'Bayt (B)', rate: 1.0 },
        'KB': { name: 'Kilobayt (KB)', rate: 1024.0 },
        'MB': { name: 'Megabayt (MB)', rate: 1048576.0 },
        'GB': { name: 'Gigabayt (GB)', rate: 1073741824.0 },
        'TB': { name: 'Terabayt (TB)', rate: 1099511627776.0 },
        'PB': { name: 'Petabayt (PB)', rate: 1125899906842624.0 },
        'Kb': { name: 'Kilobit (Kb)', rate: 128.0 },
        'Mb': { name: 'Megabit (Mb)', rate: 131072.0 },
        'Gb': { name: 'Gigabit (Gb)', rate: 134217728.0 }
      },
      defaultFrom: 'GB',
      defaultTo: 'MB'
    },
    'converter-pressure': {
      title: 'Basınç',
      base: 'Pa',
      units: {
        'Pa': { name: 'Paskal (Pa)', rate: 1.0 },
        'kPa': { name: 'Kilopaskal (kPa)', rate: 1000.0 },
        'bar': { name: 'Bar', rate: 100000.0 },
        'psi': { name: 'Pound/inç² (PSI)', rate: 6894.76 },
        'atm': { name: 'Standart Atmosfer (atm)', rate: 101325.0 },
        'torr': { name: 'Torr / mmHg', rate: 133.322 }
      },
      defaultFrom: 'bar',
      defaultTo: 'psi'
    },
    'converter-angle': {
      title: 'Açı',
      base: 'deg',
      units: {
        'deg': { name: 'Derece (°)', rate: 1.0 },
        'rad': { name: 'Radyan (rad)', rate: 57.2957795 },
        'grad': { name: 'Gradyan (grad)', rate: 0.9 },
        'arcmin': { name: 'Yay dakikası (\')', rate: 1 / 60 },
        'arcsec': { name: 'Yay saniyesi (")', rate: 1 / 3600 },
        'turn': { name: 'Tam Devir (turn)', rate: 360.0 }
      },
      defaultFrom: 'deg',
      defaultTo: 'rad'
    }
  };

  // --- DOM ELEMENTS ---
  const el = {
    body: document.body,
    currentModeTitle: document.getElementById('current-mode-title'),
    btnOpenNav: document.getElementById('btn-open-nav'),
    navDrawer: document.getElementById('nav-drawer'),
    navDrawerOverlay: document.getElementById('nav-drawer-overlay'),
    btnCloseNav: document.getElementById('btn-close-nav'),

    // Titlebar Actions
    btnToggleTransparency: document.getElementById('btn-toggle-transparency'),
    btnOpenThemes: document.getElementById('btn-open-themes'),
    btnToggleColorScheme: document.getElementById('btn-toggle-color-scheme'),
    btnToggleHistory: document.getElementById('btn-toggle-history'),

    // Window Controls
    btnWindowMin: document.getElementById('btn-window-min'),
    btnWindowMax: document.getElementById('btn-window-max'),
    btnWindowClose: document.getElementById('btn-window-close'),

    // Views
    viewStandardScientific: document.getElementById('view-standard-scientific'),
    viewGraphing: document.getElementById('view-graphing'),
    viewProgrammer: document.getElementById('view-programmer'),
    viewDate: document.getElementById('view-date'),
    viewConverter: document.getElementById('view-converter'),

    // Standard / Scientific Display
    expressionDisplay: document.getElementById('expression-display'),
    valueDisplay: document.getElementById('value-display'),
    toastNotify: document.getElementById('toast-notify'),
    badgeAngle: document.getElementById('badge-angle'),
    badgeMemory: document.getElementById('badge-memory'),
    badge2nd: document.getElementById('badge-2nd'),
    badgeParen: document.getElementById('badge-paren'),
    parenBar: document.getElementById('paren-bar'),
    parenInfo: document.getElementById('paren-info'),
    scientificKeypad: document.getElementById('scientific-keypad'),
    standardKeypad: document.getElementById('standard-keypad'),
    btnAngleToggle: document.getElementById('btn-angle-toggle'),
    btn2nd: document.getElementById('btn-2nd'),

    // Memory bar
    memoryBar: document.getElementById('memory-bar'),
    btnMc: document.getElementById('btn-mc'),
    btnMr: document.getElementById('btn-mr'),
    btnMplus: document.getElementById('btn-mplus'),
    btnMminus: document.getElementById('btn-mminus'),
    btnMs: document.getElementById('btn-ms'),
    btnMflyout: document.getElementById('btn-mflyout'),

    // Side panel (Global History & Memory Drawer)
    sidePanel: document.getElementById('side-panel'),
    tabHistory: document.getElementById('tab-history'),
    tabMemory: document.getElementById('tab-memory'),
    contentHistory: document.getElementById('content-history'),
    contentMemory: document.getElementById('content-memory'),
    historyList: document.getElementById('history-list'),
    memoryList: document.getElementById('memory-list'),
    btnCloseSidePanel: document.getElementById('btn-close-side-panel'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    btnClearMemory: document.getElementById('btn-clear-memory'),

    // Graphing Elements
    graphExprInput: document.getElementById('graph-expr-input'),
    btnPlotGraph: document.getElementById('btn-plot-graph'),
    btnClearGraph: document.getElementById('btn-clear-graph'),
    graphCanvas: document.getElementById('graph-canvas'),
    graphCanvasContainer: document.getElementById('graph-canvas-container'),
    btnGraphZoomIn: document.getElementById('btn-graph-zoom-in'),
    btnGraphZoomOut: document.getElementById('btn-graph-zoom-out'),
    btnGraphReset: document.getElementById('btn-graph-reset'),
    graphCursorReadout: document.getElementById('graph-cursor-readout'),

    // Programmer Elements
    progBaseHex: document.getElementById('prog-base-hex'),
    progBaseDec: document.getElementById('prog-base-dec'),
    progBaseOct: document.getElementById('prog-base-oct'),
    progBaseBin: document.getElementById('prog-base-bin'),
    progValHex: document.getElementById('prog-val-hex'),
    progValDec: document.getElementById('prog-val-dec'),
    progValOct: document.getElementById('prog-val-oct'),
    progValBin: document.getElementById('prog-val-bin'),
    progBitGrid: document.getElementById('prog-bit-grid'),
    progBitCount: document.getElementById('prog-bit-count'),
    programmerKeypad: document.getElementById('programmer-keypad'),

    // Date Calculator Elements
    tabDateDiff: document.getElementById('tab-date-diff'),
    tabDateAdd: document.getElementById('tab-date-add'),
    dateSubviewDiff: document.getElementById('date-subview-diff'),
    dateSubviewAdd: document.getElementById('date-subview-add'),
    dateDiffFrom: document.getElementById('date-diff-from'),
    dateDiffTo: document.getElementById('date-diff-to'),
    dateDiffMain: document.getElementById('date-diff-main'),
    dateDiffSub: document.getElementById('date-diff-sub'),
    dateAddStart: document.getElementById('date-add-start'),
    dateAddYears: document.getElementById('date-add-years'),
    dateAddMonths: document.getElementById('date-add-months'),
    dateAddDays: document.getElementById('date-add-days'),
    dateAddMain: document.getElementById('date-add-main'),
    dateAddSub: document.getElementById('date-add-sub'),

    // Converter Elements
    convInputFrom: document.getElementById('conv-input-from'),
    convInputTo: document.getElementById('conv-input-to'),
    convSelectFrom: document.getElementById('conv-select-from'),
    convSelectTo: document.getElementById('conv-select-to'),
    btnConverterSwap: document.getElementById('btn-converter-swap'),
    convRateText: document.getElementById('conv-rate-text'),
    convExtraText: document.getElementById('conv-extra-text'),
    converterKeypad: document.getElementById('converter-keypad'),

    // Themes modal
    themeModal: document.getElementById('theme-modal'),
    btnCloseThemes: document.getElementById('btn-close-themes'),
    segModeDark: document.getElementById('seg-mode-dark'),
    segModeLight: document.getElementById('seg-mode-light'),
    chkSoundEnabled: document.getElementById('chk-sound-enabled'),
    chkTransparencyModal: document.getElementById('chk-transparency-modal'),
    lblTransparencyStatus: document.getElementById('lbl-transparency-status'),
    rowBtnTransparency: document.getElementById('row-btn-transparency'),
    chkBtnTransparency: document.getElementById('chk-btn-transparency'),
    lblBtnTransparencyStatus: document.getElementById('lbl-btn-transparency-status'),
    lblSettingBtnTransparency: document.getElementById('lbl-setting-btn-transparency'),
    selectAppLanguage: document.getElementById('select-app-language'),

    // Themed Language Custom Dropdown
    themedLangDropdown: document.getElementById('themed-lang-dropdown'),
    btnLangDropdown: document.getElementById('btn-lang-dropdown'),
    lblSelectedLang: document.getElementById('lbl-selected-lang'),
    menuLangDropdown: document.getElementById('menu-lang-dropdown'),

    // Navigation Drawer Footer
    btnOpenShortcuts: document.getElementById('btn-open-shortcuts'),
    btnOpenAbout: document.getElementById('btn-open-about'),

    // About Modal
    aboutModal: document.getElementById('about-modal'),
    btnCloseAbout: document.getElementById('btn-close-about'),
    btnAboutOk: document.getElementById('btn-about-ok'),
    linkAselensWebsite: document.getElementById('link-aselens-website'),

    // Shortcuts Modal
    shortcutsModal: document.getElementById('shortcuts-modal'),
    btnCloseShortcuts: document.getElementById('btn-close-shortcuts'),
    btnResetShortcuts: document.getElementById('btn-reset-shortcuts'),
    btnDoneShortcuts: document.getElementById('btn-done-shortcuts'),
    shortcutsList: document.getElementById('shortcuts-list'),

    // Custom Context Menu
    customContextMenu: document.getElementById('custom-context-menu')
  };

  // --- AUDIO SYNTHESIS (Synthesizer via Web Audio API) ---
  let audioCtx = null;
  function playClickSound() {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (state.theme === 'pixelart' || state.theme === 'matrix') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (state.theme === 'cyberpunk' || state.theme === 'cybercore' || state.theme === 'synthwave' || state.theme === 'vaporwave') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (state.theme === 'scrapbook' || state.theme === 'neobrutalism' || state.theme === 'gruvbox' || state.theme === 'coffee') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.03);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (state.theme === 'catppuccin' || state.theme === 'tokyo-night' || state.theme === 'rose-pine' || state.theme === 'one-dark' || state.theme === 'emerald') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.025);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        osc.start(now);
        osc.stop(now + 0.025);
      } else if (state.theme === 'amoled') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.02);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.start(now);
        osc.stop(now + 0.02);
      } else if (state.theme === 'pastel' || state.theme === 'sunset') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.03);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  // --- MODE SWITCHING LOGIC ---
  const MODE_TITLES = {
    'standard': 'Standart',
    'scientific': 'Bilimsel',
    'graphing': 'Grafik Çizici',
    'programmer': 'Programcı',
    'date': 'Tarih Hesaplama',
    'converter-currency': 'Para Birimi (Kur)',
    'converter-volume': 'Hacim / Sıvı',
    'converter-length': 'Uzunluk',
    'converter-weight': 'Ağırlık ve Kütle',
    'converter-temperature': 'Sıcaklık',
    'converter-energy': 'Enerji',
    'converter-area': 'Alan',
    'converter-speed': 'Hız',
    'converter-time': 'Zaman',
    'converter-power': 'Güç',
    'converter-data': 'Veri',
    'converter-pressure': 'Basınç',
    'converter-angle': 'Açı'
  };

  function switchMode(targetMode) {
    playClickSound();
    state.mode = targetMode;

    // Hide all views
    el.viewStandardScientific.style.display = 'none';
    el.viewGraphing.style.display = 'none';
    el.viewProgrammer.style.display = 'none';
    el.viewDate.style.display = 'none';
    el.viewConverter.style.display = 'none';

    // Update active state in navigation drawer
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.mode === targetMode);
    });

    // Update header mode title
    const title = MODE_TITLES[targetMode] || 'Hesap Makinesi';
    el.currentModeTitle.textContent = title;

    // Show appropriate view
    if (targetMode === 'standard') {
      el.viewStandardScientific.style.display = 'flex';
      el.scientificKeypad.style.display = 'none';
      updateDisplay();
    } else if (targetMode === 'scientific') {
      el.viewStandardScientific.style.display = 'flex';
      el.scientificKeypad.style.display = 'grid';
      updateDisplay();
    } else if (targetMode === 'graphing') {
      el.viewGraphing.style.display = 'flex';
      setupGraphCanvas();
      drawGraph();
    } else if (targetMode === 'programmer') {
      el.viewProgrammer.style.display = 'flex';
      updateProgrammerDisplay();
    } else if (targetMode === 'date') {
      el.viewDate.style.display = 'flex';
      updateDateCalculations();
    } else if (targetMode.startsWith('converter-')) {
      el.viewConverter.style.display = 'flex';
      setupConverterCategory(targetMode);
    }

    // Close navigation drawer
    closeNavDrawer();

    // Save mode preference
    saveSettings();
  }

  function openNavDrawer() {
    playClickSound();
    el.navDrawer.classList.add('open');
    el.navDrawerOverlay.classList.add('open');
  }

  function closeNavDrawer() {
    el.navDrawer.classList.remove('open');
    el.navDrawerOverlay.classList.remove('open');
  }

  // --- CUSTOM CONTEXT MENU (SAĞ TIK MENÜSÜ) ---
  function initContextMenu() {
    const menu = el.customContextMenu;
    if (!menu) return;

    window.addEventListener('contextmenu', (e) => {
      // Don't override contextmenu if inside text input where user might want native edit actions
      if (e.target.tagName === 'INPUT' && !e.target.readOnly) {
        return;
      }
      e.preventDefault();
      menu.style.display = 'block';
      const menuWidth = menu.offsetWidth || 180;
      const menuHeight = menu.offsetHeight || 240;
      let x = e.clientX;
      let y = e.clientY;
      if (x + menuWidth > window.innerWidth) x = Math.max(8, window.innerWidth - menuWidth - 8);
      if (y + menuHeight > window.innerHeight) y = Math.max(8, window.innerHeight - menuHeight - 8);
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    });

    window.addEventListener('pointerdown', (e) => {
      if (!e.target || !(e.target instanceof Node) || !menu.contains(e.target)) {
        menu.style.display = 'none';
      }
    });

    menu.querySelectorAll('.context-item[data-action]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        menu.style.display = 'none';
        switch (action) {
          case 'copy':
            copyCurrentResult();
            break;
          case 'paste':
            pasteExpressionFromClipboard();
            break;
          case 'clear':
            playClickSound();
            if (state.mode === 'programmer') {
              setProgrammerValue(0n);
            } else if (state.mode.startsWith('converter-')) {
              if (el.convInputFrom) {
                el.convInputFrom.value = '0';
                calculateConversion();
              }
            } else {
              clearAll();
            }
            break;
          case 'history':
            toggleHistorySidePanel();
            break;
          case 'shortcuts':
            openShortcutsModal();
            break;
          case 'themes':
            playClickSound();
            if (el.themeModal) el.themeModal.style.display = 'flex';
            break;
          case 'about':
            openAboutModal();
            break;
        }
      });
    });
  }

  function toggleHistorySidePanel() {
    playClickSound();
    if (!el.sidePanel) return;
    const isOpen = el.sidePanel.classList.contains('open');
    if (isOpen) {
      el.sidePanel.classList.remove('open');
      if (el.btnToggleHistory) el.btnToggleHistory.classList.remove('active');
    } else {
      el.sidePanel.classList.add('open');
      if (el.btnToggleHistory) el.btnToggleHistory.classList.add('active');
      switchSidePanelTab('history');
      renderHistoryList();
    }
  }

  // --- THEMED LANGUAGE DROPDOWN ---
  function initThemedLanguageDropdown() {
    if (!el.themedLangDropdown || !el.btnLangDropdown || !el.menuLangDropdown) return;

    el.btnLangDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      playClickSound();
      const isHidden = el.menuLangDropdown.style.display === 'none' || !el.menuLangDropdown.style.display;
      el.menuLangDropdown.style.display = isHidden ? 'block' : 'none';
      el.themedLangDropdown.classList.toggle('open', isHidden);
    });

    el.menuLangDropdown.querySelectorAll('.themed-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        const lang = item.dataset.lang || 'auto';
        if (el.selectAppLanguage) {
          el.selectAppLanguage.value = lang;
        }
        applyLanguage(lang);
        el.menuLangDropdown.style.display = 'none';
        el.themedLangDropdown.classList.remove('open');
      });
    });

    window.addEventListener('pointerdown', (e) => {
      if (!e.target || !(e.target instanceof Node) || !el.themedLangDropdown.contains(e.target)) {
        el.menuLangDropdown.style.display = 'none';
        el.themedLangDropdown.classList.remove('open');
      }
    });
  }

  // --- ABOUT MODAL ---
  function openAboutModal() {
    playClickSound();
    if (el.aboutModal) el.aboutModal.style.display = 'flex';
    if (el.navDrawer) closeNavDrawer();
  }

  function closeAboutModal() {
    playClickSound();
    if (el.aboutModal) el.aboutModal.style.display = 'none';
  }

  function initAboutModal() {
    if (!el.aboutModal) return;
    if (el.btnOpenAbout) el.btnOpenAbout.addEventListener('click', openAboutModal);
    if (el.btnCloseAbout) el.btnCloseAbout.addEventListener('click', closeAboutModal);
    if (el.btnAboutOk) el.btnAboutOk.addEventListener('click', closeAboutModal);

    el.aboutModal.addEventListener('click', (e) => {
      if (e.target === el.aboutModal) closeAboutModal();
    });

    if (el.linkAselensWebsite) {
      el.linkAselensWebsite.addEventListener('click', (e) => {
        e.preventDefault();
        const url = 'https://aselens.com';
        if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
          window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      });
    }
  }

  // --- CUSTOMIZABLE SHORTCUTS ---
  let recordingShortcutMode = null;

  function formatShortcutForDisplay(shortcutStr) {
    if (!shortcutStr) return '';
    return shortcutStr.split('+').map(p => p.trim()).join(' + ');
  }

  function updateNavDrawerShortcuts() {
    if (!state.shortcuts) return;
    for (const [mode, combo] of Object.entries(state.shortcuts)) {
      const navItem = document.querySelector(`.nav-item[data-mode="${mode}"] .nav-item-shortcut`);
      if (navItem) {
        navItem.textContent = formatShortcutForDisplay(combo);
      }
    }
  }

  function updateShortcutsUI() {
    if (!el.shortcutsList) return;
    el.shortcutsList.querySelectorAll('.shortcut-key-badge').forEach(badge => {
      const mode = badge.dataset.mode;
      const currentKey = state.shortcuts[mode] || '';
      if (recordingShortcutMode === mode) {
        badge.classList.add('is-recording');
        badge.textContent = t('pressKeyCombo') || 'Tuşa basın...';
      } else {
        badge.classList.remove('is-recording');
        badge.textContent = currentKey ? formatShortcutForDisplay(currentKey) : '—';
      }
    });
  }

  function renderShortcutsList() {
    if (!el.shortcutsList) return;
    el.shortcutsList.innerHTML = '';

    const allModes = [
      'standard', 'scientific', 'graphing', 'programmer', 'date',
      'converter-currency', 'converter-volume', 'converter-length',
      'converter-weight', 'converter-temperature', 'converter-energy',
      'converter-area', 'converter-speed', 'converter-time',
      'converter-power', 'converter-data', 'converter-pressure', 'converter-angle'
    ];

    allModes.forEach(mode => {
      const row = document.createElement('div');
      row.className = 'shortcut-item-row';

      const label = document.createElement('span');
      label.className = 'shortcut-mode-name';
      label.textContent = MODE_TITLES[mode] || mode;

      const btnBadge = document.createElement('button');
      btnBadge.type = 'button';
      btnBadge.className = 'shortcut-key-badge';
      btnBadge.dataset.mode = mode;

      btnBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        playClickSound();
        if (recordingShortcutMode === mode) {
          recordingShortcutMode = null;
        } else {
          recordingShortcutMode = mode;
        }
        updateShortcutsUI();
      });

      row.appendChild(label);
      row.appendChild(btnBadge);
      el.shortcutsList.appendChild(row);
    });

    updateShortcutsUI();
  }

  function openShortcutsModal() {
    playClickSound();
    recordingShortcutMode = null;
    renderShortcutsList();
    if (el.shortcutsModal) el.shortcutsModal.style.display = 'flex';
    if (el.navDrawer) closeNavDrawer();
  }

  function closeShortcutsModal() {
    playClickSound();
    recordingShortcutMode = null;
    if (el.shortcutsModal) el.shortcutsModal.style.display = 'none';
  }

  function initShortcutsModal() {
    if (!el.shortcutsModal) return;
    if (el.btnOpenShortcuts) el.btnOpenShortcuts.addEventListener('click', openShortcutsModal);
    if (el.btnCloseShortcuts) el.btnCloseShortcuts.addEventListener('click', closeShortcutsModal);
    if (el.btnDoneShortcuts) el.btnDoneShortcuts.addEventListener('click', closeShortcutsModal);

    el.shortcutsModal.addEventListener('click', (e) => {
      if (e.target === el.shortcutsModal) closeShortcutsModal();
    });

    if (el.btnResetShortcuts) {
      el.btnResetShortcuts.addEventListener('click', () => {
        playClickSound();
        state.shortcuts = { ...DEFAULT_SHORTCUTS };
        saveSettings();
        updateNavDrawerShortcuts();
        updateShortcutsUI();
        showToast(t('resetShortcuts') || 'Kısayollar sıfırlandı');
      });
    }
  }

  function getComboFromEvent(e) {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if ((e.altKey && e.code !== 'AltRight') || isLeftAltPressed) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    let key = e.key;
    if (key.length === 1) {
      key = key.toUpperCase();
    } else if (e.code.startsWith('Digit')) {
      key = e.code.replace('Digit', '');
    } else if (e.code.startsWith('Key')) {
      key = e.code.replace('Key', '');
    }

    parts.push(key);
    return parts.join('+');
  }

  function matchesShortcut(e, shortcutStr) {
    if (!shortcutStr) return false;
    if (e.code === 'AltRight') return false; // Strictly ignore AltRight / AltGr

    const parts = shortcutStr.split('+').map(p => p.trim().toUpperCase());
    const keyPart = parts[parts.length - 1];
    const wantsAlt = parts.includes('ALT');
    const wantsCtrl = parts.includes('CTRL');
    const wantsShift = parts.includes('SHIFT');

    const hasAlt = (e.altKey && e.code !== 'AltRight') || isLeftAltPressed;
    const hasCtrl = !!e.ctrlKey;
    const hasShift = !!e.shiftKey;

    if (wantsAlt !== hasAlt) return false;
    if (wantsCtrl !== hasCtrl) return false;
    if (wantsShift !== hasShift) return false;

    const eventKey = e.key.toUpperCase();
    if (eventKey === keyPart) return true;
    if (/^[0-9]$/.test(keyPart)) {
      if (e.code === `Digit${keyPart}` || e.code === `Numpad${keyPart}`) return true;
    }
    if (e.code === `Key${keyPart}`) return true;
    return false;
  }

  // --- TRANSPARENCY / SOLID SURFACE FEATURE ---
  function setTransparency(enable) {
    state.transparencyEnabled = !!enable;
    const langData = I18N_DATA[state.resolvedLanguage] || I18N_DATA['tr'];
    if (state.transparencyEnabled) {
      el.body.classList.remove('no-transparency');
      el.body.classList.add('has-transparency');
      el.btnToggleTransparency.classList.add('active');
      if (el.chkTransparencyModal) el.chkTransparencyModal.checked = true;
      if (el.lblTransparencyStatus && langData.ui) {
        el.lblTransparencyStatus.textContent = langData.ui.transOn || 'Açık (Akrilik)';
      }
      if (el.rowBtnTransparency) el.rowBtnTransparency.style.display = 'flex';
    } else {
      el.body.classList.remove('has-transparency');
      el.body.classList.add('no-transparency');
      el.btnToggleTransparency.classList.remove('active');
      if (el.chkTransparencyModal) el.chkTransparencyModal.checked = false;
      if (el.lblTransparencyStatus && langData.ui) {
        el.lblTransparencyStatus.textContent = langData.ui.transOff || 'Kapalı (Opak)';
      }
      if (el.rowBtnTransparency) el.rowBtnTransparency.style.display = 'none';
    }
    applyButtonTransparency(state.buttonTransparency);
    saveSettings();
  }

  function toggleTransparency() {
    playClickSound();
    setTransparency(!state.transparencyEnabled);
  }

  function setButtonTransparency(enable) {
    state.buttonTransparency = !!enable;
    applyButtonTransparency(state.buttonTransparency);
    saveSettings();
  }

  function applyButtonTransparency(enable) {
    state.buttonTransparency = !!enable;
    if (el.chkBtnTransparency) el.chkBtnTransparency.checked = state.buttonTransparency;
    const langData = I18N_DATA[state.resolvedLanguage] || I18N_DATA['tr'];
    if (el.lblBtnTransparencyStatus && langData.ui) {
      el.lblBtnTransparencyStatus.textContent = state.buttonTransparency
        ? (langData.ui.buttonsTransparent || 'Şeffaf Düğmeler')
        : (langData.ui.buttonsSolid || 'Belirgin (Opak Düğmeler)');
    }
    if (state.transparencyEnabled) {
      if (state.buttonTransparency) {
        el.body.classList.remove('has-btn-solid');
        el.body.classList.add('has-btn-transparency');
      } else {
        el.body.classList.remove('has-btn-transparency');
        el.body.classList.add('has-btn-solid');
      }
    } else {
      el.body.classList.remove('has-btn-transparency');
      el.body.classList.add('has-btn-solid');
    }
  }

  // --- STANDARD & SCIENTIFIC CALCULATOR ENGINE ---
  function formatNumber(numStr) {
    if (numStr === 'Error' || numStr === 'Hata') return 'Hata';
    if (numStr.endsWith('.')) {
      const whole = numStr.slice(0, -1);
      return formatWholePart(whole) + '.';
    }
    if (numStr.includes('.')) {
      const parts = numStr.split('.');
      return formatWholePart(parts[0]) + '.' + parts[1];
    }
    return formatWholePart(numStr);
  }

  function formatWholePart(str) {
    const isNegative = str.startsWith('-');
    const digits = isNegative ? str.slice(1) : str;
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return isNegative ? '-' + formatted : formatted;
  }

  function cleanFloat(num) {
    const val = typeof num === 'number' ? num : parseFloat(num);
    if (isNaN(val) || !isFinite(val)) return 'Hata';
    const rounded = parseFloat(val.toPrecision(14));
    return rounded.toString();
  }

  function updateDisplay() {
    const formatted = formatNumber(state.currentInput);
    el.valueDisplay.textContent = formatted;
    el.expressionDisplay.textContent = state.expressionLine;

    const len = formatted.length;
    if (len > 16) el.valueDisplay.style.fontSize = '20px';
    else if (len > 13) el.valueDisplay.style.fontSize = '24px';
    else if (len > 10) el.valueDisplay.style.fontSize = '30px';
    else if (len > 8) el.valueDisplay.style.fontSize = '36px';
    if (el.badgeMemory) {
      if (state.memory && state.memory.length > 0) {
        el.badgeMemory.style.display = 'inline-block';
        if (el.btnMc) el.btnMc.classList.remove('disabled');
        if (el.btnMr) el.btnMr.classList.remove('disabled');
        if (el.btnMflyout) el.btnMflyout.classList.remove('disabled');
      } else {
        el.badgeMemory.style.display = 'none';
        if (el.btnMc) el.btnMc.classList.add('disabled');
        if (el.btnMr) el.btnMr.classList.add('disabled');
        if (el.btnMflyout) el.btnMflyout.classList.add('disabled');
      }
    }

    if (state.mode === 'scientific') {
      el.badgeAngle.style.display = 'inline-block';
      el.badgeAngle.textContent = state.angleMode;
      if (el.btnAngleToggle) el.btnAngleToggle.textContent = state.angleMode;
    } else {
      el.badgeAngle.style.display = 'none';
    }

    if (state.parenCount > 0) {
      if (el.badgeParen) {
        el.badgeParen.style.display = 'inline-block';
        el.badgeParen.textContent = `( ${state.parenCount}`;
      }
      if (el.parenInfo) {
        el.parenInfo.textContent = `(${state.parenCount})`;
      }
    } else {
      if (el.badgeParen) el.badgeParen.style.display = 'none';
      if (el.parenInfo) el.parenInfo.textContent = '';
    }
  }

  function inputDigit(digit) {
    playClickSound();
    if (state.overwrite || state.currentInput === '0' || state.currentInput === 'Hata') {
      state.currentInput = digit;
      state.overwrite = false;
    } else {
      if (state.currentInput.replace(/[-.]/g, '').length < 16) {
        state.currentInput += digit;
      }
    }
    updateDisplay();
  }

  function inputDecimal() {
    playClickSound();
    if (state.overwrite || state.currentInput === 'Hata') {
      state.currentInput = '0.';
      state.overwrite = false;
    } else if (!state.currentInput.includes('.')) {
      state.currentInput += '.';
    }
    updateDisplay();
  }

  function handleBackspace() {
    playClickSound();
    if (state.overwrite || state.currentInput === 'Hata') {
      state.currentInput = '0';
      state.overwrite = false;
    } else {
      if (state.currentInput.length > 1) {
        state.currentInput = state.currentInput.slice(0, -1);
        if (state.currentInput === '-' || state.currentInput === '-0') {
          state.currentInput = '0';
        }
      } else {
        state.currentInput = '0';
      }
    }
    updateDisplay();
  }

  function handleClearEntry() {
    playClickSound();
    state.currentInput = '0';
    updateDisplay();
  }

  function handleClear() {
    playClickSound();
    state.currentInput = '0';
    state.previousValue = null;
    state.pendingOperation = null;
    state.expressionLine = '';
    state.lastEqualsOperation = null;
    state.overwrite = false;
    state.parenCount = 0;
    state.parenStack = [];
    updateDisplay();
  }

  function handleNegate() {
    playClickSound();
    if (state.currentInput === '0' || state.currentInput === 'Hata') return;
    if (state.currentInput.startsWith('-')) {
      state.currentInput = state.currentInput.slice(1);
    } else {
      state.currentInput = '-' + state.currentInput;
    }
    updateDisplay();
  }

  function executeMath(op, a, b) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    switch (op) {
      case '+': return numA + numB;
      case '−':
      case '-': return numA - numB;
      case '×':
      case '*': return numA * numB;
      case '÷':
      case '/':
        if (numB === 0) return NaN;
        return numA / numB;
      case 'mod':
        if (numB === 0) return NaN;
        return numA % numB;
      case 'power':
        return Math.pow(numA, numB);
      default:
        return numB;
    }
  }

  // --- MATHEMATICAL EXPRESSION PARSER (Shunting-Yard with BODMAS & Parentheses) ---
  function evaluateExpressionString(exprStr) {
    if (!exprStr || !exprStr.trim()) return NaN;

    // Handle comma as decimal separator when between numbers, e.g. 10,5 -> 10.5
    let clean = exprStr
      .replace(/(\d+),(\d+)/g, '$1.$2')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    // Replace 'x' or 'X' with '*' when between digits or parentheses
    clean = clean.replace(/(\d|\))\s*[xX]\s*(\d|\()/g, '$1*$2');

    const rawTokens = [];
    let i = 0;
    while (i < clean.length) {
      const char = clean[i];
      if (char === ' ') {
        i++;
        continue;
      }
      if (char === '(' || char === ')' || char === '+' || char === '*' || char === '/' || char === '^') {
        rawTokens.push(char);
        i++;
        continue;
      }
      if (char === 'm' && clean.slice(i, i + 3) === 'mod') {
        rawTokens.push('mod');
        i += 3;
        continue;
      }
      if (char === '-') {
        const prevToken = rawTokens[rawTokens.length - 1];
        if (rawTokens.length === 0 || prevToken === '(' || ['+', '-', '*', '/', 'mod', '^'].includes(prevToken)) {
          let numStr = '-';
          i++;
          while (i < clean.length && /[0-9.]/.test(clean[i])) {
            numStr += clean[i];
            i++;
          }
          rawTokens.push(numStr);
          continue;
        } else {
          rawTokens.push('-');
          i++;
          continue;
        }
      }
      if (/[0-9.]/.test(char)) {
        let numStr = '';
        while (i < clean.length && /[0-9.]/.test(clean[i])) {
          numStr += clean[i];
          i++;
        }
        rawTokens.push(numStr);
        continue;
      }
      i++;
    }

    // Insert implicit multiplication: e.g. 100(10-7) -> 100 * (10-7), (a)(b) -> (a)*(b)
    const tokens = [];
    for (let idx = 0; idx < rawTokens.length; idx++) {
      const cur = rawTokens[idx];
      tokens.push(cur);
      if (idx < rawTokens.length - 1) {
        const next = rawTokens[idx + 1];
        const isCurNumOrClose = !isNaN(parseFloat(cur)) || cur === ')';
        const isNextNumOrOpen = !isNaN(parseFloat(next)) || next === '(';
        if (isCurNumOrClose && next === '(') {
          tokens.push('*');
        } else if (cur === ')' && isNextNumOrOpen) {
          tokens.push('*');
        }
      }
    }

    // Auto-balance open parentheses
    let openCount = 0;
    for (const t of tokens) {
      if (t === '(') openCount++;
      else if (t === ')') openCount = Math.max(0, openCount - 1);
    }
    while (openCount > 0) {
      tokens.push(')');
      openCount--;
    }

    const precedence = { '+': 2, '-': 2, '*': 3, '/': 3, 'mod': 3, '^': 4 };
    const outputQueue = [];
    const operatorStack = [];

    for (const token of tokens) {
      if (!isNaN(parseFloat(token))) {
        outputQueue.push(parseFloat(token));
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] === '(') {
          operatorStack.pop();
        }
      } else if (precedence[token]) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          (precedence[operatorStack[operatorStack.length - 1]] > precedence[token] ||
            (precedence[operatorStack[operatorStack.length - 1]] === precedence[token] && token !== '^'))
        ) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.push(token);
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop();
      if (op !== '(' && op !== ')') {
        outputQueue.push(op);
      }
    }

    const evalStack = [];
    for (const item of outputQueue) {
      if (typeof item === 'number') {
        evalStack.push(item);
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) return NaN;
        let res;
        switch (item) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) return NaN;
            res = a / b;
            break;
          case 'mod':
            if (b === 0) return NaN;
            res = a % b;
            break;
          case '^': res = Math.pow(a, b); break;
          default: return NaN;
        }
        evalStack.push(res);
      }
    }

    return evalStack.length === 1 ? evalStack[0] : NaN;
  }

  function handleOperator(op) {
    playClickSound();
    const currentNum = parseFloat(state.currentInput);

    if (state.expressionLine.endsWith('=')) {
      state.expressionLine = `${cleanFloat(currentNum)} ${op}`;
      state.previousValue = currentNum;
      state.pendingOperation = op;
      state.overwrite = true;
      state.lastEqualsOperation = null;
      updateDisplay();
      return;
    }

    if (/[+−\-×*÷/mod^]\s*$/.test(state.expressionLine) && state.overwrite) {
      state.expressionLine = state.expressionLine.replace(/[+−\-×*÷/mod^]\s*$/, op);
      state.pendingOperation = op;
      updateDisplay();
      return;
    }

    if (state.expressionLine) {
      if (state.expressionLine.endsWith(')')) {
        state.expressionLine += ` ${op}`;
      } else {
        state.expressionLine += ` ${cleanFloat(currentNum)} ${op}`;
      }
    } else {
      state.expressionLine = `${cleanFloat(currentNum)} ${op}`;
    }

    state.pendingOperation = op;
    state.previousValue = currentNum;
    state.overwrite = true;
    state.lastEqualsOperation = null;
    updateDisplay();
  }

  function handleParenOpen() {
    playClickSound();
    if (!state.overwrite && state.currentInput !== '0' && state.expressionLine === '') {
      state.expressionLine = `${cleanFloat(state.currentInput)} × (`;
      state.previousValue = parseFloat(state.currentInput);
      state.pendingOperation = '×';
    } else if (state.expressionLine && !/[+−\-×*÷/mod^(]\s*$/.test(state.expressionLine)) {
      state.expressionLine += ` ${cleanFloat(state.currentInput)} × (`;
      state.previousValue = parseFloat(state.currentInput);
      state.pendingOperation = '×';
    } else if (state.expressionLine) {
      state.expressionLine += ' (';
    } else {
      state.expressionLine = '(';
    }

    state.parenCount++;
    state.parenStack.push({
      prev: state.previousValue,
      op: state.pendingOperation
    });

    state.previousValue = null;
    state.pendingOperation = null;
    state.currentInput = '0';
    state.overwrite = true;
    updateDisplay();
  }

  function handleParenClose() {
    playClickSound();
    if (state.parenCount <= 0 || state.parenStack.length === 0) return;

    const currentNum = parseFloat(state.currentInput);
    const frame = state.parenStack.pop();
    state.parenCount--;

    if (/[+−\-×*÷/mod^]\s*$/.test(state.expressionLine)) {
      state.expressionLine += ` ${cleanFloat(currentNum)} )`;
    } else {
      state.expressionLine += ` )`;
    }

    const lastOpenIndex = state.expressionLine.lastIndexOf('(');
    if (lastOpenIndex !== -1) {
      const parenSubExpr = state.expressionLine.slice(lastOpenIndex);
      const innerVal = evaluateExpressionString(parenSubExpr);
      if (!isNaN(innerVal) && isFinite(innerVal)) {
        state.currentInput = cleanFloat(innerVal);
      }
    }

    state.previousValue = frame.prev;
    state.pendingOperation = frame.op;
    state.overwrite = true;
    updateDisplay();
  }

  function handleEquals() {
    playClickSound();

    // Auto-close any unclosed open parentheses
    while (state.parenCount > 0 && state.parenStack.length > 0) {
      handleParenClose();
    }

    let result;
    let expr = '';

    if (state.expressionLine) {
      let fullExpr = state.expressionLine;
      if (/[+−\-×*÷/mod^]\s*$/.test(fullExpr)) {
        fullExpr += ` ${cleanFloat(state.currentInput)}`;
      }
      expr = `${fullExpr} =`;
      result = evaluateExpressionString(fullExpr);
      state.lastEqualsOperation = null;
      state.pendingOperation = null;
    } else if (state.lastEqualsOperation) {
      const currentNum = parseFloat(state.currentInput);
      expr = `${cleanFloat(currentNum)} ${state.lastEqualsOperation.op} ${cleanFloat(state.lastEqualsOperation.operand)} =`;
      result = executeMath(state.lastEqualsOperation.op, currentNum, state.lastEqualsOperation.operand);
    } else {
      expr = `${state.currentInput} =`;
      result = parseFloat(state.currentInput);
    }

    if (isNaN(result) || !isFinite(result)) {
      state.currentInput = 'Hata';
      state.expressionLine = expr;
      state.overwrite = true;
      state.parenCount = 0;
      state.parenStack = [];
      updateDisplay();
      return;
    }

    const cleanResult = cleanFloat(result);
    state.currentInput = cleanResult;
    state.expressionLine = expr;
    state.previousValue = null;
    state.overwrite = true;
    state.parenCount = 0;
    state.parenStack = [];
    updateDisplay();

    addHistoryEntry(expr, cleanResult);
  }

  function handlePercentage() {
    playClickSound();
    const currentNum = parseFloat(state.currentInput);
    if (state.pendingOperation && state.previousValue !== null) {
      const percentVal = (state.previousValue * currentNum) / 100;
      state.currentInput = cleanFloat(percentVal);
    } else {
      state.currentInput = cleanFloat(currentNum / 100);
    }
    updateDisplay();
  }

  function handleSingleOperandFunction(fnName) {
    playClickSound();
    const val = parseFloat(state.currentInput);
    let result;
    let exprFormat = '';

    switch (fnName) {
      case 'reciprocal':
        if (val === 0) result = NaN;
        else result = 1 / val;
        exprFormat = `1/(${cleanFloat(val)})`;
        break;
      case 'square':
        result = val * val;
        exprFormat = `sqr(${cleanFloat(val)})`;
        break;
      case 'sqrt':
        if (val < 0) result = NaN;
        else result = Math.sqrt(val);
        exprFormat = `√(${cleanFloat(val)})`;
        break;
      case 'cube':
        result = Math.pow(val, 3);
        exprFormat = `cube(${cleanFloat(val)})`;
        break;
      case 'cbrt':
        result = Math.cbrt(val);
        exprFormat = `cbrt(${cleanFloat(val)})`;
        break;
      case 'power10':
        result = Math.pow(10, val);
        exprFormat = `10^(${cleanFloat(val)})`;
        break;
      case 'power2':
        result = Math.pow(2, val);
        exprFormat = `2^(${cleanFloat(val)})`;
        break;
      case 'log':
        if (val <= 0) result = NaN;
        else result = Math.log10(val);
        exprFormat = `log(${cleanFloat(val)})`;
        break;
      case 'ln':
        if (val <= 0) result = NaN;
        else result = Math.log(val);
        exprFormat = `ln(${cleanFloat(val)})`;
        break;
      case 'abs':
        result = Math.abs(val);
        exprFormat = `abs(${cleanFloat(val)})`;
        break;
      case 'factorial':
        result = factorial(val);
        exprFormat = `fact(${cleanFloat(val)})`;
        break;
      case 'sin':
        result = Math.sin(toAngle(val));
        exprFormat = `sin(${cleanFloat(val)})`;
        break;
      case 'cos':
        result = Math.cos(toAngle(val));
        exprFormat = `cos(${cleanFloat(val)})`;
        break;
      case 'tan':
        result = Math.tan(toAngle(val));
        exprFormat = `tan(${cleanFloat(val)})`;
        break;
      case 'pi':
        result = Math.PI;
        exprFormat = 'π';
        break;
      case 'e':
        result = Math.E;
        exprFormat = 'e';
        break;
      case 'rand':
        result = Math.random();
        exprFormat = 'rand()';
        break;
      default:
        result = val;
    }

    if (isNaN(result) || !isFinite(result)) {
      state.currentInput = 'Hata';
      state.overwrite = true;
    } else {
      const cleanRes = cleanFloat(result);
      state.currentInput = cleanRes;
      state.overwrite = true;
      if (fnName === 'pi' || fnName === 'e') {
        state.expressionLine = '';
      } else {
        state.expressionLine = exprFormat;
      }
    }
    updateDisplay();
  }

  function toAngle(val) {
    return state.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
  }

  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // --- TOAST NOTIFICATIONS ---
  let toastTimer = null;
  function showToast(msg) {
    if (!el.toastNotify) return;
    el.toastNotify.textContent = msg;
    el.toastNotify.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el.toastNotify) el.toastNotify.classList.remove('show');
    }, 2200);
  }

  // --- INTERNATIONALIZATION (i18n) HELPER & APPLICATION ---
  function t(key) {
    const lang = state.resolvedLanguage || 'tr';
    const dict = (typeof I18N_DATA !== 'undefined' ? I18N_DATA : (typeof window !== 'undefined' ? window.I18N_DATA : null)) || {};
    if (dict[lang] && dict[lang].ui && dict[lang].ui[key]) {
      return dict[lang].ui[key];
    }
    if (dict['en'] && dict['en'].ui && dict['en'].ui[key]) {
      return dict['en'].ui[key];
    }
    return '';
  }

  function resolveLanguageCode(code) {
    if (!code) return 'tr';
    const short = code.toLowerCase().split(/[-_]/)[0];
    const supported = ['tr', 'en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'zh', 'ar', 'ko'];
    return supported.includes(short) ? short : 'en';
  }

  function applyLanguage(selectedLang) {
    state.language = selectedLang || 'auto';

    let resolved = 'tr';
    if (state.language === 'auto') {
      const sys = state.systemLocale || 'tr';
      resolved = resolveLanguageCode(sys);
    } else {
      resolved = resolveLanguageCode(state.language);
    }
    state.resolvedLanguage = resolved;

    const dict = (typeof I18N_DATA !== 'undefined' ? I18N_DATA : (typeof window !== 'undefined' ? window.I18N_DATA : null)) || {};
    const langData = dict[resolved] || dict['tr'] || dict['en'];
    if (!langData) return;

    // Localized Window Document Title
    if (langData.ui && langData.ui.appTitle) {
      document.title = langData.ui.appTitle;
    }

    // 1. Update Mode Titles mapping
    if (langData.modes) {
      Object.assign(MODE_TITLES, langData.modes);
      if (el.currentModeTitle) {
        el.currentModeTitle.textContent = MODE_TITLES[state.mode] || 'Hesap Makinesi';
      }
    }

    // 2. Navigation Drawer Items & Headers
    document.querySelectorAll('.nav-item[data-mode]').forEach(item => {
      const m = item.dataset.mode;
      const textEl = item.querySelector('.nav-item-text');
      if (textEl && langData.modes && langData.modes[m]) {
        textEl.textContent = langData.modes[m];
      }
    });

    const navTitle = document.getElementById('nav-title-text');
    if (navTitle && langData.ui && langData.ui.menuTitle) navTitle.textContent = langData.ui.menuTitle;

    const navSecCalc = document.getElementById('nav-sec-calc');
    if (navSecCalc && langData.ui && langData.ui.secCalc) navSecCalc.textContent = langData.ui.secCalc;

    const navSecConv = document.getElementById('nav-sec-conv');
    if (navSecConv && langData.ui && langData.ui.secConv) navSecConv.textContent = langData.ui.secConv;

    // 3. Header tooltips
    if (el.btnOpenThemes && langData.ui) el.btnOpenThemes.title = langData.ui.themeTitle;
    if (el.btnToggleColorScheme && langData.ui) el.btnToggleColorScheme.title = `${langData.ui.light} / ${langData.ui.dark}`;
    if (el.btnToggleHistory && langData.ui) el.btnToggleHistory.title = langData.ui.history;

    // 4. Theme Modal
    const themeModalTitle = document.getElementById('theme-modal-title');
    if (themeModalTitle && langData.ui && langData.ui.themeTitle) themeModalTitle.textContent = langData.ui.themeTitle;
    const lblSettingColor = document.getElementById('lbl-setting-color');
    if (lblSettingColor) lblSettingColor.textContent = (resolved === 'tr' ? 'Renk:' : 'Color:');
    if (el.segModeDark && langData.ui) el.segModeDark.textContent = langData.ui.dark;
    if (el.segModeLight && langData.ui) el.segModeLight.textContent = langData.ui.light;
    const lblSound = document.getElementById('lbl-setting-sound');
    if (lblSound && langData.ui) lblSound.textContent = langData.ui.sound;
    const lblTransTitle = document.getElementById('lbl-setting-transparency');
    if (lblTransTitle && langData.ui) lblTransTitle.textContent = langData.ui.transparency;
    if (el.lblTransparencyStatus && langData.ui) {
      el.lblTransparencyStatus.textContent = state.transparencyEnabled ? langData.ui.transOn : langData.ui.transOff;
    }
    const lblSettingBtnTrans = document.getElementById('lbl-setting-btn-transparency');
    if (lblSettingBtnTrans && langData.ui && langData.ui.buttonTransparency) {
      lblSettingBtnTrans.textContent = langData.ui.buttonTransparency;
    }
    if (el.lblBtnTransparencyStatus && langData.ui) {
      el.lblBtnTransparencyStatus.textContent = state.buttonTransparency ? langData.ui.buttonsTransparent : langData.ui.buttonsSolid;
    }
    const themeModalSub = document.getElementById('theme-modal-subtitle');
    if (themeModalSub && langData.ui && langData.ui.themeModalSubtitle) {
      themeModalSub.textContent = langData.ui.themeModalSubtitle;
    }
    const lblLang = document.getElementById('lbl-setting-language');
    if (lblLang && langData.ui) lblLang.textContent = langData.ui.language;
    if (el.selectAppLanguage) {
      el.selectAppLanguage.value = selectedLang;
    }

    // Update Themed Custom Dropdown selected display
    if (el.lblSelectedLang) {
      const activeItem = document.querySelector(`.themed-dropdown-item[data-lang="${selectedLang}"]`);
      if (activeItem) {
        el.lblSelectedLang.textContent = activeItem.textContent;
      }
      document.querySelectorAll('.themed-dropdown-item').forEach(it => {
        it.classList.toggle('active', it.dataset.lang === selectedLang);
      });
    }

    // 5. Context Menu Labels
    const ctxCopy = document.getElementById('ctx-label-copy');
    if (ctxCopy && langData.ui && langData.ui.copy) ctxCopy.textContent = langData.ui.copy;
    const ctxPaste = document.getElementById('ctx-label-paste');
    if (ctxPaste && langData.ui && langData.ui.paste) ctxPaste.textContent = langData.ui.paste;
    const ctxClear = document.getElementById('ctx-label-clear');
    if (ctxClear && langData.ui && langData.ui.clear) ctxClear.textContent = langData.ui.clear;
    const ctxHist = document.getElementById('ctx-label-history');
    if (ctxHist && langData.ui && langData.ui.history) ctxHist.textContent = langData.ui.history;
    const ctxShort = document.getElementById('ctx-label-shortcuts');
    if (ctxShort && langData.ui && langData.ui.shortcuts) ctxShort.textContent = langData.ui.shortcuts;
    const ctxThemes = document.getElementById('ctx-label-themes');
    if (ctxThemes && langData.ui && langData.ui.themeTitle) ctxThemes.textContent = langData.ui.themeTitle;
    const ctxAbout = document.getElementById('ctx-label-about');
    if (ctxAbout && langData.ui && langData.ui.about) ctxAbout.textContent = langData.ui.about;

    // 6. Navigation Drawer Footer
    const navShortcuts = document.getElementById('nav-shortcuts-text');
    if (navShortcuts && langData.ui && langData.ui.shortcuts) navShortcuts.textContent = langData.ui.shortcuts;
    const navAbout = document.getElementById('nav-about-text');
    if (navAbout && langData.ui && langData.ui.about) navAbout.textContent = langData.ui.about;

    // 7. Modals: About & Shortcuts
    const aboutTitle = document.getElementById('about-modal-title');
    if (aboutTitle && langData.ui && langData.ui.about) aboutTitle.textContent = langData.ui.about;
    const aboutFeat2 = document.getElementById('about-feat-2');
    if (aboutFeat2 && langData.ui && langData.ui.aboutFeat2) aboutFeat2.textContent = langData.ui.aboutFeat2;
    const aboutFeat6 = document.getElementById('about-feat-6');
    if (aboutFeat6 && langData.ui && langData.ui.aboutFeat6) aboutFeat6.textContent = langData.ui.aboutFeat6;
    const shortcutsTitle = document.getElementById('shortcuts-modal-title');
    if (shortcutsTitle && langData.ui && langData.ui.shortcutsTitle) shortcutsTitle.textContent = langData.ui.shortcutsTitle;
    const shortcutsSubtitle = document.getElementById('shortcuts-modal-subtitle');
    if (shortcutsSubtitle && langData.ui && langData.ui.shortcutsSubtitle) shortcutsSubtitle.textContent = langData.ui.shortcutsSubtitle;
    const btnResetShort = document.getElementById('btn-reset-shortcuts');
    if (btnResetShort && langData.ui && langData.ui.resetShortcuts) btnResetShort.textContent = langData.ui.resetShortcuts;
    const btnDoneShort = document.getElementById('btn-done-shortcuts');
    if (btnDoneShort && langData.ui && langData.ui.done) btnDoneShort.textContent = langData.ui.done;
    const btnAboutOk = document.getElementById('btn-about-ok');
    if (btnAboutOk && langData.ui && langData.ui.done) btnAboutOk.textContent = langData.ui.done;

    // 8. Side Panel (Geçmiş & Bellek)
    if (el.tabHistory && langData.ui && langData.ui.history) el.tabHistory.textContent = langData.ui.history;
    if (el.tabMemory && langData.ui && langData.ui.memory) el.tabMemory.textContent = langData.ui.memory;
    if (el.btnClearHistory && langData.ui) el.btnClearHistory.title = langData.ui.clearHistory;
    if (el.btnClearMemory && langData.ui) el.btnClearMemory.title = langData.ui.clearMemory;
    const btnClearHistText = document.getElementById('btn-clear-history-text');
    if (btnClearHistText && langData.ui && langData.ui.clearHistory) btnClearHistText.textContent = langData.ui.clearHistory;
    const btnClearMemText = document.getElementById('btn-clear-memory-text');
    if (btnClearMemText && langData.ui && langData.ui.clearMemory) btnClearMemText.textContent = langData.ui.clearMemory;

    // 9. Date Tabs
    if (el.tabDateDiff && langData.ui) el.tabDateDiff.textContent = langData.ui.dateDiffTab;
    if (el.tabDateAdd && langData.ui) el.tabDateAdd.textContent = langData.ui.dateAddTab;

    // 10. Update dynamic shortcuts display in nav drawer
    updateNavDrawerShortcuts();

    // 11. Save settings
    saveSettings();
  }

  // --- CLIPBOARD & FULL-EXPRESSION PROCESSING ---
  async function copyCurrentResult() {
    playClickSound();
    let textToCopy = '';
    if (state.mode === 'programmer') {
      const radix = getBaseRadix(state.progBase);
      textToCopy = state.progValue.toString(radix).toUpperCase();
    } else if (state.mode.startsWith('converter-')) {
      textToCopy = el.convInputTo ? el.convInputTo.value : '';
    } else {
      textToCopy = state.currentInput || '0';
    }

    let success = false;
    try {
      if (window.electronAPI && typeof window.electronAPI.copyToClipboard === 'function') {
        await window.electronAPI.copyToClipboard(textToCopy);
        success = true;
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }

    if (success) {
      showToast(`${t('copied') || 'Kopyalandı'}: ${textToCopy}`);
    }
  }

  async function pasteExpressionFromClipboard() {
    playClickSound();
    let text = '';
    try {
      if (window.electronAPI && typeof window.electronAPI.readFromClipboard === 'function') {
        text = await window.electronAPI.readFromClipboard();
      } else if (navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }

    if (text) {
      processInputExpression(text);
    }
  }

  function processInputExpression(rawText) {
    if (!rawText || typeof rawText !== 'string') return;
    let text = rawText.trim();
    if (text.endsWith('=')) {
      text = text.slice(0, -1).trim();
    }
    if (!text) return;

    if (state.mode === 'programmer') {
      try {
        let val = 0n;
        if (/^0x[0-9a-fA-F]+$/i.test(text)) {
          val = BigInt(text);
        } else if (/^0b[01]+$/i.test(text)) {
          val = BigInt(text);
        } else if (/^-?[0-9]+$/.test(text)) {
          val = BigInt(text);
        } else if (/^[0-9a-fA-F]+$/i.test(text) && state.progBase === 'HEX') {
          val = BigInt('0x' + text);
        } else {
          showToast(t('invalidExpr') || 'Geçersiz girdi');
          return;
        }
        setProgrammerValue(val);
        showToast(t('pasted') || 'Yapıştırıldı');
      } catch (e) {
        showToast(t('invalidExpr') || 'Geçersiz girdi');
      }
      return;
    }

    if (state.mode.startsWith('converter-')) {
      const cleanNum = text.replace(/,/g, '.');
      const num = parseFloat(cleanNum);
      if (!isNaN(num)) {
        el.convInputFrom.value = cleanFloat(num);
        calculateConversion();
        showToast(t('pasted') || 'Yapıştırıldı');
      } else {
        showToast(t('invalidExpr') || 'Geçersiz girdi');
      }
      return;
    }

    // Standard / Scientific mode:
    // 1. Check if input is a single plain number
    const normalizedComma = text.replace(/(\d+),(\d+)/g, '$1.$2');
    if (/^-?\d+(\.\d+)?$/.test(normalizedComma.replace(/\s+/g, ''))) {
      const num = parseFloat(normalizedComma);
      if (!isNaN(num)) {
        state.currentInput = cleanFloat(num);
        state.overwrite = true;
        updateDisplay();
        showToast(t('pasted') || 'Yapıştırıldı');
        return;
      }
    }

    // 2. Evaluate comprehensive formula expression (e.g. 100*(10-7)/6)
    const result = evaluateExpressionString(text);
    if (!isNaN(result) && isFinite(result)) {
      const cleanResult = cleanFloat(result);
      const formattedExpr = text
        .replace(/\*/g, ' × ')
        .replace(/\//g, ' ÷ ')
        .replace(/-/g, ' − ')
        .replace(/\+/g, ' + ')
        .replace(/\s+/g, ' ')
        .trim();

      const finalExpr = `${formattedExpr} =`;
      state.expressionLine = finalExpr;
      state.currentInput = cleanResult;
      state.overwrite = true;
      state.previousValue = null;
      state.pendingOperation = null;
      state.parenCount = 0;
      state.parenStack = [];
      updateDisplay();

      addHistoryEntry(finalExpr, cleanResult);
      showToast(`${t('pasted') || 'Yapıştırıldı'}: ${cleanResult}`);
    } else {
      showToast(t('invalidExpr') || 'Geçersiz işlem ifadesi');
    }
  }

  // --- PERSISTENT HISTORY LOGIC ---
  async function loadInitialHistory() {
    try {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.loadHistory();
        if (Array.isArray(loaded)) {
          state.history = loaded.slice(0, 100);
          renderHistoryList();
        }
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  async function addHistoryEntry(expression, result) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      expression,
      result,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    state.history.unshift(entry);
    if (state.history.length > 100) state.history.pop();
    renderHistoryList();

    try {
      if (window.electronAPI) {
        await window.electronAPI.saveHistory(state.history);
      }
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  function renderHistoryList() {
    el.historyList.innerHTML = '';
    if (state.history.length === 0) {
      el.historyList.innerHTML = `
        <div class="empty-panel-msg">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>Henüz geçmiş yok</p>
          <span style="font-size: 11px; opacity: 0.7; margin-top: 4px;">Kapatıp açsanız dahi silinmez</span>
        </div>
      `;
      el.btnClearHistory.style.display = 'none';
      return;
    }

    el.btnClearHistory.style.display = 'inline-flex';

    state.history.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.innerHTML = `
        <div class="history-item-top">
          <span class="history-item-expr">${item.expression}</span>
          <button class="history-item-delete" data-id="${item.id}" title="Sil">✕</button>
        </div>
        <div class="history-item-result">${formatNumber(item.result)}</div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-delete')) return;
        playClickSound();
        state.currentInput = item.result;
        state.expressionLine = item.expression;
        state.overwrite = true;
        updateDisplay();
        el.sidePanel.classList.remove('open');
      });

      const delBtn = card.querySelector('.history-item-delete');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        playClickSound();
        state.history = state.history.filter(h => h.id !== item.id);
        renderHistoryList();
        if (window.electronAPI) {
          await window.electronAPI.saveHistory(state.history);
        }
      });

      el.historyList.appendChild(card);
    });
  }

  async function clearAllHistory() {
    playClickSound();
    state.history = [];
    renderHistoryList();
    if (window.electronAPI) {
      await window.electronAPI.clearHistory();
    }
  }

  function openSidePanel(tabName = 'history') {
    el.sidePanel.classList.add('open');
    switchSidePanelTab(tabName);
  }

  function switchSidePanelTab(tabName) {
    if (tabName === 'history') {
      if (el.tabHistory) el.tabHistory.classList.add('active');
      if (el.tabMemory) el.tabMemory.classList.remove('active');
      if (el.contentHistory) el.contentHistory.classList.add('active');
      if (el.contentMemory) el.contentMemory.classList.remove('active');
    } else {
      if (el.tabMemory) el.tabMemory.classList.add('active');
      if (el.tabHistory) el.tabHistory.classList.remove('active');
      if (el.contentMemory) el.contentMemory.classList.add('active');
      if (el.contentHistory) el.contentHistory.classList.remove('active');
      renderMemoryList();
    }
  }

  // --- MEMORY OPERATIONS ---
  function handleMemory(action) {
    playClickSound();
    const currentNum = parseFloat(state.currentInput);
    if (isNaN(currentNum)) return;

    switch (action) {
      case 'mc':
        state.memory = [];
        break;
      case 'mr':
        if (state.memory.length > 0) {
          state.currentInput = cleanFloat(state.memory[0]);
          state.overwrite = true;
        }
        break;
      case 'mplus':
        if (state.memory.length === 0) state.memory.push(currentNum);
        else state.memory[0] += currentNum;
        state.overwrite = true;
        break;
      case 'mminus':
        if (state.memory.length === 0) state.memory.push(-currentNum);
        else state.memory[0] -= currentNum;
        state.overwrite = true;
        break;
      case 'ms':
        state.memory.unshift(currentNum);
        if (state.memory.length > 50) state.memory.pop();
        state.overwrite = true;
        break;
      case 'mflyout':
        openSidePanel('memory');
        break;
    }
    renderMemoryList();
    updateDisplay();
  }

  function renderMemoryList() {
    if (!el.memoryList) return;
    el.memoryList.innerHTML = '';
    const langData = I18N_DATA[state.resolvedLanguage] || I18N_DATA['tr'];
    if (state.memory.length === 0) {
      el.memoryList.innerHTML = `<div class="empty-panel-msg"><p>${langData.ui?.emptyMemory || 'Bellekte kayıtlı değer yok'}</p></div>`;
      if (el.btnClearMemory) el.btnClearMemory.style.display = 'none';
      return;
    }

    if (el.btnClearMemory) el.btnClearMemory.style.display = 'inline-flex';

    state.memory.forEach((val, idx) => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.innerHTML = `
        <div class="history-item-result" style="text-align: left;">${formatNumber(cleanFloat(val))}</div>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <button class="panel-action-btn mem-recall-btn" style="padding: 2px 8px;">Çağır</button>
          <button class="panel-action-btn mem-del-btn" style="padding: 2px 8px; color: #e81123;">Sil</button>
        </div>
      `;

      card.querySelector('.mem-recall-btn').addEventListener('click', () => {
        playClickSound();
        state.currentInput = cleanFloat(val);
        state.overwrite = true;
        updateDisplay();
        el.sidePanel.classList.remove('open');
      });

      card.querySelector('.mem-del-btn').addEventListener('click', () => {
        playClickSound();
        state.memory.splice(idx, 1);
        renderMemoryList();
        updateDisplay();
      });

      el.memoryList.appendChild(card);
    });
  }

  // --- PROGRAMMER CALCULATOR LOGIC ---
  function getBitMask(size) {
    switch (size) {
      case 'BYTE': return 0xFFn;
      case 'WORD': return 0xFFFFn;
      case 'DWORD': return 0xFFFFFFFFn;
      case 'QWORD':
      default: return 0xFFFFFFFFFFFFFFFFn;
    }
  }

  function getBitLength(size) {
    switch (size) {
      case 'BYTE': return 8;
      case 'WORD': return 16;
      case 'DWORD': return 32;
      case 'QWORD':
      default: return 64;
    }
  }

  function setProgrammerValue(val) {
    const mask = getBitMask(state.progWordSize);
    state.progValue = val & mask;
    updateProgrammerDisplay();
  }

  function updateProgrammerDisplay() {
    const val = state.progValue;
    const bitLen = getBitLength(state.progWordSize);

    // HEX
    el.progValHex.textContent = val.toString(16).toUpperCase();

    // DEC (Signed or Unsigned)
    el.progValDec.textContent = val.toString(10);

    // OCT
    el.progValOct.textContent = val.toString(8);

    // BIN with 4-bit space grouping
    let binStr = val.toString(2).padStart(bitLen, '0');
    let groupedBin = '';
    for (let i = 0; i < binStr.length; i++) {
      if (i > 0 && (binStr.length - i) % 4 === 0) groupedBin += ' ';
      groupedBin += binStr[i];
    }
    el.progValBin.textContent = groupedBin;

    // Word size buttons
    document.querySelectorAll('.prog-word-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === state.progWordSize);
    });
    el.progBitCount.textContent = `${bitLen}-bit`;

    // Base row highlighting
    document.querySelectorAll('.prog-base-row').forEach(row => {
      row.classList.toggle('active', row.dataset.base === state.progBase);
    });

    // Keypad disabled states depending on active base
    const base = state.progBase;
    document.querySelectorAll('.key-hex').forEach(btn => {
      btn.classList.toggle('disabled', base !== 'HEX');
    });

    document.querySelectorAll('.programmer-keypad .key-num').forEach(btn => {
      const num = parseInt(btn.dataset.num);
      if (base === 'BIN') {
        btn.classList.toggle('disabled', num > 1);
      } else if (base === 'OCT') {
        btn.classList.toggle('disabled', num > 7);
      } else {
        btn.classList.remove('disabled');
      }
    });

    // Render 64-bit visualizer
    renderBitGrid();
  }

  function renderBitGrid() {
    el.progBitGrid.innerHTML = '';
    const bitLen = getBitLength(state.progWordSize);

    for (let i = 63; i >= 0; i--) {
      const node = document.createElement('div');
      node.className = 'prog-bit-node';
      const bitVal = (state.progValue >> BigInt(i)) & 1n;

      if (i >= bitLen) {
        node.style.opacity = '0.15';
        node.style.pointerEvents = 'none';
        node.textContent = '0';
      } else {
        node.textContent = bitVal.toString();
        if (bitVal === 1n) node.classList.add('on');
        node.addEventListener('click', () => {
          playClickSound();
          const toggled = state.progValue ^ (1n << BigInt(i));
          setProgrammerValue(toggled);
        });
      }

      el.progBitGrid.appendChild(node);
    }
  }

  function handleProgrammerInput(char) {
    playClickSound();
    let currentStr = state.progOverwrite ? '0' : state.progValue.toString(getBaseRadix(state.progBase)).toUpperCase();
    if (currentStr === '0') currentStr = '';
    currentStr += char;

    try {
      const radix = getBaseRadix(state.progBase);
      let parsed = 0n;
      for (const c of currentStr) {
        const val = BigInt(parseInt(c, radix));
        parsed = parsed * BigInt(radix) + val;
      }
      setProgrammerValue(parsed);
      state.progOverwrite = false;
    } catch (e) {
      // ignore
    }
  }

  function getBaseRadix(base) {
    switch (base) {
      case 'HEX': return 16;
      case 'OCT': return 8;
      case 'BIN': return 2;
      case 'DEC':
      default: return 10;
    }
  }

  function handleProgrammerOp(op) {
    playClickSound();
    const mask = getBitMask(state.progWordSize);

    if (op === 'NOT') {
      state.progValue = (~state.progValue) & mask;
      updateProgrammerDisplay();
      return;
    }

    if (state.progPendingOp && state.progPrevValue !== null && !state.progOverwrite) {
      executeProgrammerMath();
    } else {
      state.progPrevValue = state.progValue;
    }

    state.progPendingOp = op;
    state.progOverwrite = true;
  }

  function executeProgrammerMath() {
    if (!state.progPendingOp || state.progPrevValue === null) return;
    const a = state.progPrevValue;
    const b = state.progValue;
    const mask = getBitMask(state.progWordSize);
    let res = 0n;

    switch (state.progPendingOp) {
      case 'AND': res = a & b; break;
      case 'OR': res = a | b; break;
      case 'XOR': res = a ^ b; break;
      case 'LSH': res = a << (b & 63n); break;
      case 'RSH': res = a >> (b & 63n); break;
      case '+': res = a + b; break;
      case '−': res = a - b; break;
      case '×': res = a * b; break;
      case '÷': res = b !== 0n ? a / b : 0n; break;
    }

    state.progValue = res & mask;
    state.progPrevValue = null;
    state.progPendingOp = null;
    state.progOverwrite = true;
    updateProgrammerDisplay();
  }

  // --- GRAPHING CALCULATOR ENGINE ---
  let graphCtx = null;
  function setupGraphCanvas() {
    const canvas = el.graphCanvas;
    const container = el.graphCanvasContainer;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    graphCtx = canvas.getContext('2d');
    graphCtx.scale(dpr, dpr);
  }

  function parseMathFunction(exprStr) {
    // Sanitizes and converts mathematical expression to JS function f(x)
    let clean = exprStr
      .replace(/\s+/g, '')
      .replace(/(\d)([a-zA-Z(])/g, '$1*$2') // 2x -> 2*x
      .replace(/(\))([a-zA-Z0-9(])/g, '$1*$2') // (x)(x) -> (x)*(x)
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/log/g, 'Math.log10')
      .replace(/ln/g, 'Math.log')
      .replace(/pi/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');

    try {
      return new Function('x', `try { return ${clean}; } catch(e) { return NaN; }`);
    } catch (e) {
      return () => NaN;
    }
  }

  function drawGraph() {
    if (!graphCtx) setupGraphCanvas();
    const canvas = el.graphCanvas;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const ctx = graphCtx;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2 + state.graphOffsetX;
    const centerY = height / 2 + state.graphOffsetY;
    const scale = state.graphScale;

    // Grid Lines
    ctx.strokeStyle = state.colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const startX = Math.floor(-centerX / scale) - 1;
    const endX = Math.ceil((width - centerX) / scale) + 1;
    for (let x = startX; x <= endX; x++) {
      const px = centerX + x * scale;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
    }

    const startY = Math.floor(-centerY / scale) - 1;
    const endY = Math.ceil((height - centerY) / scale) + 1;
    for (let y = startY; y <= endY; y++) {
      const py = centerY + y * scale;
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
    }
    ctx.stroke();

    // Main Axes
    ctx.strokeStyle = state.colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = state.colorScheme === 'dark' ? '#888888' : '#777777';
    ctx.font = '10px monospace';
    for (let x = startX; x <= endX; x++) {
      if (x === 0 || x % 2 !== 0) continue;
      const px = centerX + x * scale;
      ctx.fillText(x.toString(), px - 4, centerY + 14);
    }
    for (let y = startY; y <= endY; y++) {
      if (y === 0 || y % 2 !== 0) continue;
      const py = centerY - y * scale;
      ctx.fillText(y.toString(), centerX + 6, py + 3);
    }

    // Function Curve
    const fn = parseMathFunction(state.graphExpr);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let isDrawing = false;
    for (let px = 0; px <= width; px += 1.5) {
      const xVal = (px - centerX) / scale;
      const yVal = fn(xVal);

      if (isNaN(yVal) || !isFinite(yVal) || Math.abs(yVal) > 1000) {
        isDrawing = false;
        continue;
      }

      const py = centerY - yVal * scale;
      if (!isDrawing) {
        ctx.moveTo(px, py);
        isDrawing = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // --- DATE CALCULATOR ENGINE ---
  function updateDateCalculations() {
    // Mode A: Difference
    const d1 = new Date(el.dateDiffFrom.value || state.dateDiffFrom);
    const d2 = new Date(el.dateDiffTo.value || state.dateDiffTo);

    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffTime = Math.abs(d2 - d1);
      const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let start = d1 < d2 ? d1 : d2;
      let end = d1 < d2 ? d2 : d1;

      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();
      let days = end.getDate() - start.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      let parts = [];
      if (years > 0) parts.push(`${years} yıl`);
      if (months > 0) parts.push(`${months} ay`);
      if (days > 0 || parts.length === 0) parts.push(`${days} gün`);

      el.dateDiffMain.textContent = parts.join(', ');
      el.dateDiffSub.textContent = `Toplam: ${totalDays.toLocaleString('tr-TR')} gün (${Math.floor(totalDays / 7)} hafta)`;
    }

    // Mode B: Add / Subtract
    const baseDate = new Date(el.dateAddStart.value || state.dateAddStart);
    if (!isNaN(baseDate.getTime())) {
      const opSign = state.dateAddOp === 'add' ? 1 : -1;
      const y = (parseInt(el.dateAddYears.value) || 0) * opSign;
      const m = (parseInt(el.dateAddMonths.value) || 0) * opSign;
      const d = (parseInt(el.dateAddDays.value) || 0) * opSign;

      const target = new Date(baseDate);
      target.setFullYear(target.getFullYear() + y);
      target.setMonth(target.getMonth() + m);
      target.setDate(target.getDate() + d);

      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      el.dateAddMain.textContent = target.toLocaleDateString('tr-TR', options);
      el.dateAddSub.textContent = target.toISOString().split('T')[0];
    }
  }

  // --- UNIT CONVERTER ENGINE ---
  function setupConverterCategory(catKey) {
    state.convCategory = catKey;
    const cat = CONVERTER_DATA[catKey];
    if (!cat) return;

    el.convSelectFrom.innerHTML = '';
    el.convSelectTo.innerHTML = '';

    Object.keys(cat.units).forEach(key => {
      const optFrom = document.createElement('option');
      optFrom.value = key;
      optFrom.textContent = cat.units[key].name;
      el.convSelectFrom.appendChild(optFrom);

      const optTo = document.createElement('option');
      optTo.value = key;
      optTo.textContent = cat.units[key].name;
      el.convSelectTo.appendChild(optTo);
    });

    state.convFromUnit = cat.defaultFrom || Object.keys(cat.units)[0];
    state.convToUnit = cat.defaultTo || Object.keys(cat.units)[1] || Object.keys(cat.units)[0];

    el.convSelectFrom.value = state.convFromUnit;
    el.convSelectTo.value = state.convToUnit;

    calculateConversion();
  }

  function calculateConversion() {
    const cat = CONVERTER_DATA[state.convCategory];
    if (!cat) return;

    const val = parseFloat(el.convInputFrom.value) || 0;
    let converted = 0;

    if (cat.isTemp) {
      // Temperature special formulas
      const from = el.convSelectFrom.value;
      const to = el.convSelectTo.value;

      let celsius = val;
      if (from === 'F') celsius = (val - 32) * (5 / 9);
      else if (from === 'K') celsius = val - 273.15;

      if (to === 'C') converted = celsius;
      else if (to === 'F') converted = (celsius * (9 / 5)) + 32;
      else if (to === 'K') converted = celsius + 273.15;
    } else {
      // Standard linear unit conversion
      const fromRate = cat.units[el.convSelectFrom.value]?.rate || 1.0;
      const toRate = cat.units[el.convSelectTo.value]?.rate || 1.0;

      // Convert to base, then to target
      const inBase = val * fromRate;
      converted = inBase / toRate;
    }

    el.convInputTo.value = cleanFloat(converted);

    // Formula & Rate info line
    const fromName = cat.units[el.convSelectFrom.value]?.name.split('(')[0].trim();
    const toName = cat.units[el.convSelectTo.value]?.name.split('(')[0].trim();
    el.convRateText.textContent = `1 ${fromName} ≈ ${cleanFloat(convertSingle(1, el.convSelectFrom.value, el.convSelectTo.value, cat))} ${toName}`;
    el.convExtraText.textContent = `${val} ${fromName} = ${cleanFloat(converted)} ${toName}`;
  }

  function convertSingle(val, fromKey, toKey, cat) {
    if (cat.isTemp) return val;
    const fromRate = cat.units[fromKey]?.rate || 1.0;
    const toRate = cat.units[toKey]?.rate || 1.0;
    return (val * fromRate) / toRate;
  }

  // --- THEME & SETTINGS MANAGEMENT ---
  function applyTheme(themeName, colorScheme) {
    state.theme = themeName;
    state.colorScheme = colorScheme;

    const classes = Array.from(el.body.classList);
    classes.forEach(c => {
      if (c.startsWith('theme-') || c.startsWith('mode-')) {
        el.body.classList.remove(c);
      }
    });

    el.body.classList.add(`theme-${themeName}`, `mode-${colorScheme}`);

    if (colorScheme === 'dark') {
      el.segModeDark.classList.add('active');
      el.segModeLight.classList.remove('active');
    } else {
      el.segModeLight.classList.add('active');
      el.segModeDark.classList.remove('active');
    }

    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === themeName);
    });

    if (state.mode === 'graphing') drawGraph();
    saveSettings();
  }

  async function loadInitialSettings() {
    try {
      // 1. Detect System Locale
      let systemLocale = 'tr';
      if (window.electronAPI && typeof window.electronAPI.getSystemLocale === 'function') {
        try {
          systemLocale = await window.electronAPI.getSystemLocale();
        } catch (e) {
          systemLocale = navigator.language || 'tr';
        }
      } else {
        systemLocale = navigator.language || 'tr';
      }
      state.systemLocale = systemLocale;

      if (window.electronAPI) {
        const settings = await window.electronAPI.loadSettings();
        if (settings) {
          state.theme = settings.theme || 'default';
          state.colorScheme = settings.colorScheme || 'dark';
          state.angleMode = settings.angleMode || 'DEG';
          state.soundEnabled = settings.soundEnabled !== false;
          state.transparencyEnabled = !!settings.transparencyEnabled;
          state.buttonTransparency = !!settings.buttonTransparency;
          state.language = settings.language || 'auto';
          if (settings.shortcuts && typeof settings.shortcuts === 'object') {
            state.shortcuts = { ...DEFAULT_SHORTCUTS, ...settings.shortcuts };
          }

          el.chkSoundEnabled.checked = state.soundEnabled;
          setTransparency(state.transparencyEnabled);
          applyButtonTransparency(state.buttonTransparency);
          applyTheme(state.theme, state.colorScheme);
          applyLanguage(state.language);
          updateNavDrawerShortcuts();

          if (settings.calculatorMode) {
            switchMode(settings.calculatorMode);
          }
        } else {
          applyLanguage('auto');
        }
      } else {
        applyLanguage('auto');
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
      applyLanguage('auto');
    }
  }

  async function saveSettings() {
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings({
          theme: state.theme,
          colorScheme: state.colorScheme,
          calculatorMode: state.mode,
          angleMode: state.angleMode,
          soundEnabled: state.soundEnabled,
          transparencyEnabled: state.transparencyEnabled,
          buttonTransparency: state.buttonTransparency,
          shortcuts: state.shortcuts,
          language: state.language
        });
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // --- WINDOW CONTROLS (CSD) ---
  function initWindowControls() {
    if (!window.electronAPI) return;

    el.btnWindowMin.addEventListener('click', () => window.electronAPI.minimize());
    el.btnWindowMax.addEventListener('click', async () => {
      const isMax = await window.electronAPI.maximizeToggle();
      el.body.classList.toggle('is-maximized', isMax);
    });
    el.btnWindowClose.addEventListener('click', () => window.electronAPI.close());
    window.electronAPI.onWindowStateChanged(({ isMaximized }) => {
      el.body.classList.toggle('is-maximized', isMaximized);
    });
  }

  // --- EVENT LISTENERS INITIALIZATION ---
  function initEventListeners() {
    // Navigation Drawer
    el.btnOpenNav.addEventListener('click', openNavDrawer);
    el.btnCloseNav.addEventListener('click', closeNavDrawer);
    el.navDrawerOverlay.addEventListener('click', closeNavDrawer);

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const mode = item.dataset.mode;
        if (mode) switchMode(mode);
      });
    });

    // Custom Context Menu, Modals & Dropdown
    initContextMenu();
    initThemedLanguageDropdown();
    initAboutModal();
    initShortcutsModal();

    // Top action buttons
    el.btnToggleTransparency.addEventListener('click', toggleTransparency);
    el.chkTransparencyModal.addEventListener('change', (e) => setTransparency(e.target.checked));
    if (el.chkBtnTransparency) {
      el.chkBtnTransparency.addEventListener('change', (e) => setButtonTransparency(e.target.checked));
    }
    if (el.selectAppLanguage) {
      el.selectAppLanguage.addEventListener('change', (e) => applyLanguage(e.target.value));
    }

    el.btnOpenThemes.addEventListener('click', () => {
      playClickSound();
      el.themeModal.style.display = 'flex';
    });

    el.btnCloseThemes.addEventListener('click', () => {
      el.themeModal.style.display = 'none';
    });

    el.themeModal.addEventListener('click', (e) => {
      if (e.target === el.themeModal) el.themeModal.style.display = 'none';
    });

    el.btnToggleColorScheme.addEventListener('click', () => {
      playClickSound();
      applyTheme(state.theme, state.colorScheme === 'dark' ? 'light' : 'dark');
    });

    el.segModeDark.addEventListener('click', () => applyTheme(state.theme, 'dark'));
    el.segModeLight.addEventListener('click', () => applyTheme(state.theme, 'light'));
    el.chkSoundEnabled.addEventListener('change', (e) => {
      state.soundEnabled = e.target.checked;
      saveSettings();
    });

    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        playClickSound();
        applyTheme(card.dataset.theme, state.colorScheme);
      });
    });

    // Side panel (Global Persistent History & Memory)
    el.btnToggleHistory.addEventListener('click', () => {
      playClickSound();
      if (el.sidePanel.classList.contains('open')) el.sidePanel.classList.remove('open');
      else openSidePanel('history');
    });

    el.btnCloseSidePanel.addEventListener('click', () => el.sidePanel.classList.remove('open'));
    if (el.tabHistory) el.tabHistory.addEventListener('click', () => switchSidePanelTab('history'));
    if (el.tabMemory) el.tabMemory.addEventListener('click', () => switchSidePanelTab('memory'));
    el.btnClearHistory.addEventListener('click', clearAllHistory);
    if (el.btnClearMemory) {
      el.btnClearMemory.addEventListener('click', () => {
        playClickSound();
        state.memory = [];
        renderMemoryList();
        updateDisplay();
      });
    }

    // Memory Bar
    if (el.memoryBar) {
      el.memoryBar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || btn.classList.contains('disabled')) return;
        const action = btn.dataset.action;
        if (action) handleMemory(action);
      });
    }

    // Standard Keypad
    el.standardKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.num !== undefined) return inputDigit(btn.dataset.num);
      if (btn.dataset.op !== undefined) return handleOperator(btn.dataset.op);

      switch (btn.dataset.action) {
        case 'decimal': inputDecimal(); break;
        case 'equals': handleEquals(); break;
        case 'backspace': handleBackspace(); break;
        case 'ce': handleClearEntry(); break;
        case 'c': handleClear(); break;
        case 'negate': handleNegate(); break;
        case 'percent': handlePercentage(); break;
        case 'reciprocal': handleSingleOperandFunction('reciprocal'); break;
        case 'square': handleSingleOperandFunction('square'); break;
        case 'sqrt': handleSingleOperandFunction('sqrt'); break;
      }
    });

    // Scientific Keypad
    el.scientificKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const fn = btn.dataset.fn;

      if (action === 'toggle-angle') {
        playClickSound();
        state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
        updateDisplay();
        saveSettings();
      } else if (action === 'fn-2nd') {
        playClickSound();
        state.is2ndActive = !state.is2ndActive;
        el.badge2nd.style.display = state.is2ndActive ? 'inline-block' : 'none';
        btn.classList.toggle('active', state.is2ndActive);
      } else if (action === 'paren-open') {
        handleParenOpen();
      } else if (action === 'paren-close') {
        handleParenClose();
      } else if (action === 'fn') {
        if (fn === 'power' || fn === 'mod') handleOperator(fn);
        else handleSingleOperandFunction(fn);
      } else if (action === 'ce') {
        handleClearEntry();
      }
    });

    // Parentheses Bar
    if (el.parenBar) {
      el.parenBar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'paren-open') handleParenOpen();
        else if (action === 'paren-close') handleParenClose();
      });
    }

    // Graphing Event Listeners
    el.btnPlotGraph.addEventListener('click', () => {
      state.graphExpr = el.graphExprInput.value || 'x';
      drawGraph();
    });

    el.btnClearGraph.addEventListener('click', () => {
      el.graphExprInput.value = '';
      state.graphExpr = '0';
      drawGraph();
    });

    document.querySelectorAll('.graph-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        el.graphExprInput.value = chip.dataset.fn;
        state.graphExpr = chip.dataset.fn;
        drawGraph();
      });
    });

    el.btnGraphZoomIn.addEventListener('click', () => {
      state.graphScale = Math.min(state.graphScale * 1.3, 200);
      drawGraph();
    });

    el.btnGraphZoomOut.addEventListener('click', () => {
      state.graphScale = Math.max(state.graphScale / 1.3, 10);
      drawGraph();
    });

    el.btnGraphReset.addEventListener('click', () => {
      state.graphScale = 40;
      state.graphOffsetX = 0;
      state.graphOffsetY = 0;
      drawGraph();
    });

    // Graph mouse interaction (Pan & Hover)
    const canvas = el.graphCanvas;
    canvas.addEventListener('mousedown', (e) => {
      state.graphIsDragging = true;
      state.graphDragStart = { x: e.clientX - state.graphOffsetX, y: e.clientY - state.graphOffsetY };
    });

    window.addEventListener('mousemove', (e) => {
      if (state.graphIsDragging) {
        state.graphOffsetX = e.clientX - state.graphDragStart.x;
        state.graphOffsetY = e.clientY - state.graphDragStart.y;
        drawGraph();
      }
    });

    window.addEventListener('mouseup', () => {
      state.graphIsDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      state.graphScale = Math.max(10, Math.min(300, state.graphScale * zoomFactor));
      drawGraph();
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const centerX = (canvas.width / (window.devicePixelRatio || 1)) / 2 + state.graphOffsetX;
      const centerY = (canvas.height / (window.devicePixelRatio || 1)) / 2 + state.graphOffsetY;
      const xVal = (px - centerX) / state.graphScale;
      const yVal = -(py - centerY) / state.graphScale;
      el.graphCursorReadout.textContent = `x: ${xVal.toFixed(2)}, y: ${yVal.toFixed(2)}`;
    });

    window.addEventListener('resize', () => {
      if (state.mode === 'graphing') {
        setupGraphCanvas();
        drawGraph();
      }
    });

    // Programmer Event Listeners
    document.querySelectorAll('.prog-base-row').forEach(row => {
      row.addEventListener('click', () => {
        playClickSound();
        state.progBase = row.dataset.base;
        updateProgrammerDisplay();
      });
    });

    document.querySelectorAll('.prog-word-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playClickSound();
        state.progWordSize = btn.dataset.size;
        setProgrammerValue(state.progValue);
      });
    });

    el.programmerKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.classList.contains('disabled')) return;

      if (btn.dataset.hex) {
        handleProgrammerInput(btn.dataset.hex);
      } else if (btn.dataset.num !== undefined) {
        handleProgrammerInput(btn.dataset.num);
      } else if (btn.dataset.op) {
        handleProgrammerOp(btn.dataset.op);
      } else if (btn.dataset.action === 'equals') {
        executeProgrammerMath();
      } else if (btn.dataset.action === 'c' || btn.dataset.action === 'ce') {
        setProgrammerValue(0n);
        state.progPrevValue = null;
        state.progPendingOp = null;
      } else if (btn.dataset.action === 'backspace') {
        const radix = getBaseRadix(state.progBase);
        const str = state.progValue.toString(radix);
        if (str.length > 1) {
          setProgrammerValue(BigInt(parseInt(str.slice(0, -1), radix) || 0));
        } else {
          setProgrammerValue(0n);
        }
      }
    });

    document.querySelectorAll('.prog-op-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        handleProgrammerOp(btn.dataset.progOp);
      });
    });

    // Date Calculator Event Listeners
    el.tabDateDiff.addEventListener('click', () => {
      el.tabDateDiff.classList.add('active');
      el.tabDateAdd.classList.remove('active');
      el.dateSubviewDiff.style.display = 'flex';
      el.dateSubviewAdd.style.display = 'none';
      updateDateCalculations();
    });

    el.tabDateAdd.addEventListener('click', () => {
      el.tabDateAdd.classList.add('active');
      el.tabDateDiff.classList.remove('active');
      el.dateSubviewAdd.style.display = 'flex';
      el.dateSubviewDiff.style.display = 'none';
      updateDateCalculations();
    });

    [el.dateDiffFrom, el.dateDiffTo, el.dateAddStart, el.dateAddYears, el.dateAddMonths, el.dateAddDays].forEach(input => {
      input.addEventListener('input', updateDateCalculations);
      input.addEventListener('change', updateDateCalculations);
    });

    document.querySelectorAll('input[name="date-op-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.dateAddOp = e.target.value;
        updateDateCalculations();
      });
    });

    // Converter Event Listeners
    el.convSelectFrom.addEventListener('change', calculateConversion);
    el.convSelectTo.addEventListener('change', calculateConversion);
    el.convInputFrom.addEventListener('input', calculateConversion);

    el.btnConverterSwap.addEventListener('click', () => {
      playClickSound();
      const temp = el.convSelectFrom.value;
      el.convSelectFrom.value = el.convSelectTo.value;
      el.convSelectTo.value = temp;
      calculateConversion();
    });

    el.converterKeypad.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      playClickSound();

      if (btn.dataset.convNum !== undefined) {
        if (el.convInputFrom.value === '0') el.convInputFrom.value = btn.dataset.convNum;
        else el.convInputFrom.value += btn.dataset.convNum;
        calculateConversion();
      } else if (btn.dataset.convAction === 'decimal') {
        if (!el.convInputFrom.value.includes('.')) {
          el.convInputFrom.value += '.';
        }
      } else if (btn.dataset.convAction === 'backspace') {
        if (el.convInputFrom.value.length > 1) {
          el.convInputFrom.value = el.convInputFrom.value.slice(0, -1);
        } else {
          el.convInputFrom.value = '0';
        }
        calculateConversion();
      } else if (btn.dataset.convAction === 'c' || btn.dataset.convAction === 'ce') {
        el.convInputFrom.value = '0';
        calculateConversion();
      } else if (btn.dataset.convAction === 'negate') {
        if (el.convInputFrom.value.startsWith('-')) {
          el.convInputFrom.value = el.convInputFrom.value.slice(1);
        } else if (el.convInputFrom.value !== '0') {
          el.convInputFrom.value = '-' + el.convInputFrom.value;
        }
        calculateConversion();
      }
    });

    // Keyboard Shortcuts
    initKeyboardShortcuts();
  }

  // --- KEYBOARD SHORTCUTS & LEFT-ALT MODE SWITCHING ---
  let isLeftAltPressed = false;

  function animateButton(selector) {
    if (!selector) return;
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.add('is-pressed');
    setTimeout(() => {
      btn.classList.remove('is-pressed');
    }, 120);
  }

  function initKeyboardShortcuts() {
    // Strictly track Left Alt only, ignore Right Alt / AltGr
    window.addEventListener('keydown', (e) => {
      if (e.code === 'AltLeft') isLeftAltPressed = true;
      else if (e.code === 'AltRight') isLeftAltPressed = false;
      else if (!e.altKey && e.key !== 'Alt') isLeftAltPressed = false;

      // 1. If currently recording a new shortcut combo in the modal
      if (recordingShortcutMode) {
        const combo = getComboFromEvent(e);
        if (combo) {
          e.preventDefault();
          e.stopPropagation();
          state.shortcuts[recordingShortcutMode] = combo;
          recordingShortcutMode = null;
          saveSettings();
          updateNavDrawerShortcuts();
          updateShortcutsUI();
          playClickSound();
          return;
        }
      }

      // 2. Handle Mode Switch Shortcuts (Customizable)
      for (const [mode, shortcutStr] of Object.entries(state.shortcuts)) {
        if (matchesShortcut(e, shortcutStr)) {
          e.preventDefault();
          switchMode(mode);
          return;
        }
      }

      // If user is currently typing in an input field or select, do not capture calculation keys
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.isContentEditable) {
        return;
      }

      // Copy & Paste (Ctrl + C / Ctrl + V)
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          copyCurrentResult();
          return;
        }
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          pasteExpressionFromClipboard();
          return;
        }
      }

      const key = e.key;
      const code = e.code;

      // 1. Regular Numbers 0-9 (strictly when shift, alt, ctrl are NOT pressed)
      if (!e.shiftKey && !e.altKey && !e.ctrlKey && /^[0-9]$/.test(key)) {
        e.preventDefault();
        animateButton(`.key-num[data-num="${key}"]`);
        animateButton(`#converter-keypad [data-conv-num="${key}"]`);
        animateButton(`.prog-key[data-num="${key}"]`);
        if (state.mode === 'programmer') handleProgrammerInput(key);
        else if (state.mode.startsWith('converter-')) {
          if (el.convInputFrom.value === '0') el.convInputFrom.value = key;
          else el.convInputFrom.value += key;
          calculateConversion();
        } else {
          inputDigit(key);
        }
        return;
      }

      // 2. Hex digits A-F in Programmer mode
      if (state.mode === 'programmer' && !e.altKey && !e.ctrlKey && /^[a-fA-F]$/.test(key)) {
        e.preventDefault();
        const hex = key.toUpperCase();
        animateButton(`[data-hex="${hex}"]`);
        handleProgrammerInput(hex);
        return;
      }

      // 3. Decimal . or ,
      if (!e.shiftKey && !e.altKey && !e.ctrlKey && (key === '.' || key === ',' || code === 'NumpadDecimal' || code === 'Period' || code === 'Comma')) {
        e.preventDefault();
        animateButton('.key-btn[data-action="decimal"]');
        animateButton('#converter-keypad [data-conv-action="decimal"]');
        if (state.mode.startsWith('converter-')) {
          if (!el.convInputFrom.value.includes('.')) {
            el.convInputFrom.value += '.';
            calculateConversion();
          }
        } else {
          inputDecimal();
        }
        return;
      }

      // 4. Parentheses (Open: '(', Close: ')')
      // Supports Turkish keyboard Shift+8 for '(', Shift+9 for ')'
      // Supports US keyboard Shift+9 for '(', Shift+0 for ')'
      const isOpenParen = key === '(' || (e.shiftKey && code === 'Digit8' && key !== '*') || (e.shiftKey && code === 'Digit9' && key === '(');
      const isCloseParen = key === ')' || (e.shiftKey && code === 'Digit9' && key !== '(') || (e.shiftKey && code === 'Digit0' && key === ')');

      if (isOpenParen) {
        e.preventDefault();
        animateButton('.key-paren[data-action="paren-open"]');
        animateButton('#scientific-keypad [data-action="paren-open"]');
        handleParenOpen();
        return;
      }

      if (isCloseParen) {
        e.preventDefault();
        animateButton('.key-paren[data-action="paren-close"]');
        animateButton('#scientific-keypad [data-action="paren-close"]');
        handleParenClose();
        return;
      }

      // 5. Operators:
      // Plus (+): Shift+4 (Turkish), Shift+= (US), NumpadAdd, or key === '+'
      const isPlus = key === '+' || code === 'NumpadAdd' || (e.shiftKey && (code === 'Digit4' || code === 'Equal'));
      if (isPlus) {
        e.preventDefault();
        animateButton('.key-op[data-op="+"]');
        animateButton('.prog-op-btn[data-prog-op="+"]');
        if (state.mode === 'programmer') handleProgrammerOp('+');
        else handleOperator('+');
        return;
      }

      // Minus (-): '-' key, NumpadSubtract, or Slash on some layouts
      const isMinus = (key === '-' || key === '−' || code === 'NumpadSubtract' || (code === 'Minus' && !e.shiftKey));
      if (isMinus) {
        e.preventDefault();
        animateButton('.key-op[data-op="−"]');
        animateButton('.prog-op-btn[data-prog-op="−"]');
        if (state.mode === 'programmer') handleProgrammerOp('−');
        else handleOperator('−');
        return;
      }

      // Multiply (*): '*' key, 'x', 'X', NumpadMultiply, Shift+8 (US)
      const isMultiply = key === '*' || key === 'x' || key === 'X' || code === 'NumpadMultiply' || (e.shiftKey && code === 'Digit8' && key === '*');
      if (isMultiply) {
        e.preventDefault();
        animateButton('.key-op[data-op="×"]');
        animateButton('.prog-op-btn[data-prog-op="×"]');
        if (state.mode === 'programmer') handleProgrammerOp('×');
        else handleOperator('×');
        return;
      }

      // Divide (/): '/' key, NumpadDivide, Shift+7 (Turkish)
      const isDivide = key === '/' || code === 'NumpadDivide' || (e.shiftKey && code === 'Digit7');
      if (isDivide) {
        e.preventDefault();
        animateButton('.key-op[data-op="÷"]');
        animateButton('.prog-op-btn[data-prog-op="÷"]');
        if (state.mode === 'programmer') handleProgrammerOp('÷');
        else handleOperator('÷');
        return;
      }

      // 6. Equals (= / Enter):
      const isEquals = key === 'Enter' || key === '=' || code === 'NumpadEnter' || (e.shiftKey && code === 'Digit0' && key === '=');
      if (isEquals) {
        e.preventDefault();
        animateButton('.key-equals');
        animateButton('.prog-key[data-action="equals"]');
        if (state.mode === 'programmer') executeProgrammerMath();
        else handleEquals();
        return;
      }

      // 7. Backspace
      if (key === 'Backspace') {
        e.preventDefault();
        animateButton('.key-btn[data-action="backspace"]');
        animateButton('#converter-keypad [data-conv-action="backspace"]');
        animateButton('.prog-key[data-action="backspace"]');
        if (state.mode === 'programmer') {
          const radix = getBaseRadix(state.progBase);
          const str = state.progValue.toString(radix);
          if (str.length > 1) {
            setProgrammerValue(BigInt(parseInt(str.slice(0, -1), radix) || 0));
          } else {
            setProgrammerValue(0n);
          }
        } else if (state.mode.startsWith('converter-')) {
          if (el.convInputFrom.value.length > 1) {
            el.convInputFrom.value = el.convInputFrom.value.slice(0, -1);
          } else {
            el.convInputFrom.value = '0';
          }
          calculateConversion();
        } else {
          handleBackspace();
        }
        return;
      }

      // 8. Clear (Escape or Delete)
      if (key === 'Escape' || key === 'Delete') {
        e.preventDefault();
        animateButton('.key-btn[data-action="c"]');
        animateButton('#converter-keypad [data-conv-action="c"]');
        animateButton('.prog-key[data-action="c"]');
        if (el.navDrawer.classList.contains('open')) closeNavDrawer();
        else if (el.themeModal.style.display === 'flex') el.themeModal.style.display = 'none';
        else if (el.sidePanel.classList.contains('open')) el.sidePanel.classList.remove('open');
        else if (state.mode === 'programmer') {
          setProgrammerValue(0n);
          state.progPrevValue = null;
          state.progPendingOp = null;
        } else if (state.mode.startsWith('converter-')) {
          el.convInputFrom.value = '0';
          calculateConversion();
        } else {
          handleClear();
        }
        return;
      }

      // 9. Percentage (%)
      const isPercent = key === '%' || (e.shiftKey && code === 'Digit5');
      if (isPercent) {
        e.preventDefault();
        animateButton('.key-top[data-action="percent"]');
        handlePercentage();
        return;
      }
    }, true);

    window.addEventListener('keyup', (e) => {
      if (e.code === 'AltLeft' || !e.altKey) isLeftAltPressed = false;
    }, true);

    window.addEventListener('blur', () => {
      isLeftAltPressed = false;
    });
  }

  // --- INITIALIZATION ---
  async function init() {
    initWindowControls();
    initEventListeners();
    await loadInitialSettings();
    await loadInitialHistory();
    updateDisplay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
