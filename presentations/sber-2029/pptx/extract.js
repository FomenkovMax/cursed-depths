/**
 * Шаг 1 сборки PPTX: разобрать готовую HTML-презентацию на две части.
 *
 *   1) фон каждого слайда — PNG 1920x1080 без текста и диаграмм
 *      (градиенты, «аврора», зерно, стеклянные карточки, 3D-объекты остаются);
 *   2) layout.json — координаты, размер, цвет и содержимое каждого текстового
 *      блока, снятые прямо из DOM.
 *
 * Координаты берутся из вёрстки, а не переписываются руками, — поэтому в PPTX
 * текст встаёт ровно туда же, где он стоит в HTML.
 *
 * Запуск:  node extract.js ../variant-a-aurora.html ./build
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

// Что на каждом слайде считать отдельным текстовым блоком.
// Списки (ul) берём целиком: один текстовый фрейм с абзацами-пунктами
// редактировать удобнее, чем десяток отдельных надписей.
const BLOCKS = [
  ['.title-slide .eyebrow', '.title-slide h1', '.title-slide .name',
   '.title-slide .meta', '.title-slide .topic'],
  ['.h-num', 'h2', '.pillar h3', '.pillar ul'],
  ['.h-num', 'h2', '.stat .fig', '.stat .cap', '.gcard ul'],
  ['.h-num', 'h2', '.chart-title', '.chart-sub', '.money div', '.hrow .share'],
  ['.h-num', 'h2', '.tleft .n', '.tleft p', '.tright'],
  ['.thanks span'],
];

// Скрывается перед съёмкой фона: всё, что станет редактируемым объектом PPTX.
const HIDE = [
  '.eyebrow', 'h1', 'h2', '.h-num', '.who', '.topic', '.thanks span',
  '.pillar h3', '.pillar ul', '.pillar .sep',
  '.stat', '.gcard ul', '.money',
  '.chart-title', '.chart-sub', '.hbars', '.gchart', '.legend', '.sumtrack',
  '.tleft .n', '.tleft p', '.tright span',
];

(async () => {
  const [source, outDir] = [path.resolve(process.argv[2]), path.resolve(process.argv[3])];
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + source);
  await page.waitForTimeout(2500);

  const slides = [];

  for (let i = 0; i < BLOCKS.length; i++) {
    await page.evaluate(idx => window.deck.show(idx), i);
    await page.waitForTimeout(2600);   // дать доиграть появлению и росту столбцов

    // --- координаты и оформление текстовых блоков ---
    const blocks = await page.evaluate(selectors => {
      const slide = document.querySelectorAll('.slide')[window.deck.current];
      const stage = document.getElementById('deckStage').getBoundingClientRect();
      const out = [];

      const rgb = value => {
        const m = (value || '').match(/[\d.]+/g) || [255, 255, 255];
        return [+m[0], +m[1], +m[2]].map(n => Math.round(n));
      };

      // Сдвиг базовой линии (у знака «%» в 47% это vertical-align) в долях кегля.
      const baselineOf = (value, size) => {
        if (!value || value === 'baseline') return 0;
        if (value.endsWith('px')) return parseFloat(value) / size;
        if (value.endsWith('%')) return parseFloat(value) / 100;
        return 0;
      };

      // Текст блока разбираем на сегменты: внутри одного абзаца могут быть
      // куски с другим размером (<small>«(месяц)»</small>), начертанием
      // (<b>«Роль руководителя.»</b>) и сдвигом базовой линии (<em>%</em>).
      // Без этого при переносе в PPTX они превратились бы в ровный текст.
      const runsOf = root => {
        const out = [];
        const walk = (node, style) => {
          node.childNodes.forEach(child => {
            if (child.nodeType === 3) {
              if (child.textContent.trim()) out.push({ text: child.textContent, ...style });
            } else if (child.nodeType === 1) {
              if (child.tagName === 'BR') { out.push({ br: true }); return; }
              const cs = getComputedStyle(child);
              const size = parseFloat(cs.fontSize);
              // Блочный элемент внутри абзаца (<small> у «(месяц)») —
              // это перенос строки, иначе текст склеится.
              if (cs.display !== 'inline' && out.length) out.push({ br: true });
              walk(child, {
                size,
                weight: parseInt(cs.fontWeight, 10) || 400,
                color: rgb(cs.color),
                baseline: baselineOf(cs.verticalAlign, size),
              });
            }
          });
        };
        const cs = getComputedStyle(root);
        walk(root, {
          size: parseFloat(cs.fontSize),
          weight: parseInt(cs.fontWeight, 10) || 400,
          color: rgb(cs.color),
          baseline: 0,
        });
        return out;
      };

      for (const selector of selectors) {
        slide.querySelectorAll(selector).forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          // У ul/.tright собственный font-size — это размер контейнера,
          // а не пунктов списка: стили берём у первого ребёнка.
          const composite = el.matches('ul, .tright');
          const styled = composite && el.children.length ? el.children[0] : el;
          const st = getComputedStyle(styled);

          // Во flex-контейнере (.tright) содержимое центрировано по вертикали:
          // если первый ребёнок начинается ниже верха блока — центрируем и в PPTX.
          const firstChild = el.children[0];
          const vcenter = composite && firstChild
            && firstChild.getBoundingClientRect().top - r.top > 4;

          const sources = composite ? [...el.children] : [el];
          const items = sources.map(runsOf).filter(runs => runs.length);
          if (!items.length) return;

          out.push({
            selector,
            x: r.left - stage.left, y: r.top - stage.top,
            w: r.width, h: r.height,
            items,
            bullet: composite,
            vcenter,
            size: parseFloat(st.fontSize),
            weight: parseInt(st.fontWeight, 10) || 400,
            color: rgb(st.color),
            align: st.textAlign === 'start' ? 'left' : st.textAlign,
            lineHeight: parseFloat(st.lineHeight) / parseFloat(st.fontSize) || 1.3,
            font: st.fontFamily.split(',')[0].replace(/['"]/g, ''),
            letterSpacing: st.letterSpacing === 'normal' ? 0 : parseFloat(st.letterSpacing),
            upper: st.textTransform === 'uppercase',
            // line-height может быть 'normal' — тогда parseFloat даёт NaN
            // и признак однострочности молча ломается.
            singleLine: r.height <=
              (parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.25) * 1.45,
            // у цифр 35 / 47% / 100 текст залит градиентом — берём средний тон
            gradient: el.classList.contains('fig'),
          });
        });
      }
      return out;
    }, BLOCKS[i]);

    // --- прямоугольники диаграмм: туда встанут нативные графики PowerPoint ---
    const charts = await page.evaluate(() => {
      const slide = document.querySelectorAll('.slide')[window.deck.current];
      const stage = document.getElementById('deckStage').getBoundingClientRect();
      const box2 = el => {
        const r = el.getBoundingClientRect();
        return { x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height };
      };
      const box = selector => {
        const el = slide.querySelector(selector);
        return el ? box2(el) : null;
      };

      // Легенды рисуем сами, чтобы они выглядели как в HTML,
      // а не как встроенная легенда PowerPoint.
      const legends = [...slide.querySelectorAll('.legend')].map(legend => ({
        ...box2(legend),
        items: [...legend.querySelectorAll('i')].map(i => {
          const m = (getComputedStyle(i.querySelector('b')).backgroundColor || '')
            .match(/[\d.]+/g) || [255, 255, 255];
          const r = i.getBoundingClientRect();
          return {
            text: i.textContent.trim(),
            color: [+m[0], +m[1], +m[2]].map(n => Math.round(n)),
            x: r.left - stage.left, y: r.top - stage.top, h: r.height,
            size: parseFloat(getComputedStyle(i).fontSize),
          };
        }),
      }));

      // Область графика «Обращение клиентов» = подписи + полосы, без колонки долей.
      const first = slide.querySelector('.hrow');
      let appeals = null;
      if (first) {
        const lbl = first.querySelector('.lbl').getBoundingClientRect();
        const track = first.querySelector('.track').getBoundingClientRect();
        const all = slide.querySelector('.hbars').getBoundingClientRect();
        appeals = {
          x: lbl.left - stage.left, y: all.top - stage.top,
          w: track.right - lbl.left, h: all.height,
        };
      }
      return { appeals, balance: box('.gchart'), legends };
    });

    // --- фон без текста ---
    await page.evaluate(hide => {
      const slide = document.querySelectorAll('.slide')[window.deck.current];
      hide.forEach(s => slide.querySelectorAll(s).forEach(el => {
        el.dataset.pptxHidden = '1';
        el.style.visibility = 'hidden';
      }));
      document.querySelectorAll('.progress,.counter,.hint,.edit-toggle')
        .forEach(el => el.style.display = 'none');
    }, HIDE);
    await page.waitForTimeout(400);

    const file = `bg${i + 1}.png`;
    await page.locator('.slide.active').screenshot({ path: path.join(outDir, file) });

    // вернуть как было — иначе следующий слайд снимется уже без текста
    await page.evaluate(() => {
      document.querySelectorAll('[data-pptx-hidden]').forEach(el => {
        el.style.visibility = '';
        delete el.dataset.pptxHidden;
      });
    });

    slides.push({ background: file, blocks, charts });
    console.log(`слайд ${i + 1}: блоков ${blocks.length}, фон ${file}`);
  }

  fs.writeFileSync(path.join(outDir, 'layout.json'), JSON.stringify({ slides }, null, 1));
  await browser.close();
  console.log('layout.json готов');
})();
