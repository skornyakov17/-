/* Static, offline-capable presentation. No analytics, backend, or remote dependencies. */
(() => {
  'use strict';
  const data = window.PRESENTATION_CONTENT;
  const $ = (id) => document.getElementById(id);
  if (!data || !Array.isArray(data.scenes)) {
    $('deck').innerHTML = '<section class="scene"><h2>Не удалось загрузить содержание.</h2><p>Проверьте, что рядом с index.html находится папка data с файлом content.js.</p></section>';
    return;
  }
  const scenes = data.scenes;
  const people = Object.fromEntries(data.people.map(p => [p.id, p.name]));
  for (const asset of data.scenes.flatMap(s => s.original?.images || [])) {
    const preload = new Image();
    preload.src = asset.src;
  }
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const formatTime = (seconds) => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`;
  const store = { get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }, set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} } };
  const groups = [
    {start:0,end:3,label:'Проблема',speaker:'konstantin'},
    {start:4,end:11,label:'Диагностика',speaker:'valeria'},
    {start:12,end:14,label:'Личные границы',speaker:'ksenia'},
    {start:15,end:18,label:'Изменение проекта',speaker:'nikita'},
    {start:19,end:22,label:'Заказчик и деньги',speaker:'matthew'},
    {start:23,end:24,label:'Завершение',speaker:'nikita'}
  ];
  const groupFor = (index) => groups.find(g => index >= g.start && index <= g.end);
  let index = Math.max(0, scenes.findIndex(s => `#${s.id}` === location.hash));
  let testUnlocked = false;
  let motion = !store.get('pressure-reduce-motion-v1', matchMedia('(prefers-reduced-motion: reduce)').matches);
  const timers = new Map();
  let timerRunning = false;
  let timerDeadline = 0;
  let timerInterval;
  let transitionId = 0;
  let touchStart = null;
  const notesById = {
    opening:'Откройте занятие знакомой репликой о «маленькой правке». Коротко спросите, кто сталкивался с похожей ситуацией. Представьте команду. Дальше Константин раскрывает проблему, Валерия проводит диагностику, затем три практики.',
    'why-difficult':'Определение из исходной теории: переговоры — процесс взаимодействия двух или более сторон, направленный на согласование интересов, разрешение разногласий и достижение взаимоприемлемого решения. Объясните пять причин сложности на понятном архитектурном примере. На всю вводную отведено около пяти минут.',
    'position-interest':'В исходной теории: отделять обсуждение предмета от личных эмоций, понимать интересы за позициями, опираться на объективные критерии и искать варианты, учитывающие интересы сторон. Не предполагайте мотив заказчика: выясните его вопросами.',
    'conversation-support':'Уточните интерес открытым вопросом, обозначьте реальные ограничения, предложите варианты и зафиксируйте следующий шаг. Дополнительные понятия из материала Константина: BATNA — лучшая альтернатива соглашению; ZOPA — зона возможного соглашения. Их можно пояснить при обсуждении практики, если они нужны аудитории. Передайте слово Валерии.',
    'friday-case':'Ксения проводит упражнение из своего документа. Общий блок около десяти минут. Ситуация: пятница 18:55, работы минимум на два дня, у архитектора планы. Дайте каждой из пяти групп свою стратегию.',
    'five-responses':'Две минуты на подготовку. Группа произносит одну реплику, не называя стратегию. Остальные угадывают. Не оценивайте человека по назначенной ему роли. Каждая группа отыгрывает условный способ поведения.',
    'friday-debrief':'Обсудите три вопроса. В исходном упражнении сотрудничество предлагается как конструктивный вариант именно для этого случая, но выбор зависит от обстоятельств. Свяжите вывод с возможностью согласовать приоритеты, сроки и нагрузку. Передайте слово Никите.',
    'facade-case':'Никита проводит двадцатиминутный блок по упражнению «Да, и…» из раздатки. Объясните, что признание пожелания не означает обещания выполнить изменение на любых условиях. Технические последствия новой облицовки предстоит проверить применительно к выбранному решению.',
    'facade-roles':'Около двух минут на инструкцию, двух на подготовку, четырёх на первый диалог. Заказчик настаивает и говорит, что не ожидал сложностей. Архитектор уточняет интерес, объясняет необходимые проверки и предлагает порядок действий. При нечётном числе участников добавьте наблюдателя.',
    'facade-second-round':'Перед вторым диалогом уделите около трёх минут короткому разбору. Затем поменяйте роли и запустите четыре минуты. Наблюдатель отмечает, удалось ли выяснить интерес, объяснить последствия и согласовать следующий шаг.',
    'facade-agreement':'Около пяти минут на итоговый разбор и переход. Какие условия участники действительно согласовали, а что осталось предположением? Вернитесь к четырём пунктам на экране. Передайте слово Мэтью.',
    'payment-overdue':'Мэтью выбрал этот кейс в переписке. Общий блок около семнадцати минут. Условия учебного договора для обсуждения: сроки оплаты и порядок действий при задержке заранее согласованы сторонами. Обсуждаем, как спокойно назвать факт, обозначить границу и согласовать следующий шаг.',
    'payment-response':'Четыре минуты на работу мини-групп. Затем четыре минуты на обсуждение ответов. Ответы открываются вручную кнопкой после работы аудитории. Просите сформулировать конкретную первую реплику, а не только назвать пункт договора.',
    'accepted-unpaid':'Второй выбранный Мэтью кейс. Три минуты на работу. Отличайте текущую беседу с заказчиком от того, какие условия следовало согласовать заранее. Точные договорные механизмы зависят от заданных условий кейса.',
    'payment-debrief':'Четыре минуты на общий разбор. В исходной раздатке упомянуты предоплата, неустойка и условия о правах на проект. Не представляйте их как автоматические последствия без соответствующих условий договора. Оцените ясность и конкретность реплик.',
    closing:'Три минуты общей рефлексии входят в пятидесятиминутную практическую часть. Попросите сформулировать одну реплику, которую участник сможет использовать в похожем разговоре. Не требуется повторно пересказывать все блоки.',
    sources:'Исходные материалы команды сохранены. Здесь указаны содержательные источники занятия. Экспорт личной переписки в сайт не включён.'
  };
  function header(s, eyebrow) { return `<header class="scene-header"><span class="eyebrow">${eyebrow || `${pad(groups.indexOf(groupFor(index)) + 1)} / ${esc(groupFor(index).label)}`}</span><h2>${esc(s.title)}</h2></header>`; }
  function button(label, action, primary = true) { return `<button class="button ${primary ? 'primary' : 'secondary'}" data-action="${action}">${label}</button>`; }
  function instructions(s, aside) {
    return `${header(s)}<div class="instruction-layout"><ol class="instruction-list">${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ol><aside class="instruction-aside">${aside || ''}<p class="instruction-time" data-scene-timer>${formatTime(currentTimer().remaining)}</p>${button('Открыть таймер <span aria-hidden="true">↗</span>', 'timer', false)}</aside></div>`;
  }
  function facade() {
    return `<svg class="facade-graphic" viewBox="0 0 520 350" role="img" aria-label="Схема фасада: изменяемая часть выделена красным"><g class="draw"><path d="M45 280 45 110 170 35 470 75 470 280Z M45 110 320 147 470 75 M320 147V280 M170 35V244 M45 280 170 244 470 280 M45 110 170 35 M100 77V264 M230 44V251 M290 51V258 M350 59V266 M410 67V273 M45 166 320 193 470 133 M45 223 320 237 470 191 M100 77 100 264 M170 94 320 115 M40 315H475 M25 110V280"/><path d="M37 310 45 320 M467 310 475 320 M20 115 30 105 M20 285 30 275"/></g><path class="panel" d="M350 132 410 102 410 216 350 247Z"/><path class="red" d="M350 125 350 67 470 16 M410 96 410 56 490 22"/><text x="358" y="18" fill="#fa3b2e" font-family="Consolas,monospace" font-size="10">НОВЫЙ МАТЕРИАЛ</text><text x="215" y="337" fill="#aaa8a1" font-family="Consolas,monospace" font-size="9">ИЗМЕНЕНИЕ ≠ ОДНА ПРАВКА</text></svg>`;
  }
  function renderStrategy(s) {
    const lines = s.original.textShapes.flatMap(shape => shape.paragraphs).filter(Boolean);
    const stance = lines[1];
    const parenthesis = stance.lastIndexOf('(');
    const quote = parenthesis > 0 ? stance.slice(0, parenthesis).trim() : stance;
    const coords = parenthesis > 0 ? stance.slice(parenthesis) : '';
    const when = lines.indexOf('Когда эффективно в сложных переговорах:');
    const risks = lines.find(p => p.startsWith('Риски:')) || '';
    const conditions = lines.slice(when + 1, lines.indexOf(risks));
    const media = s.original.images[0];
    const alt = ['Шрам и Муфаса','Реми и Лингвини','Персонажи Простоквашино','Иа и Винни-Пух','Добби с носком'][s.sourceSlide - 4];
    return `${header(s, `02 / Диагностика <span class="accent">&nbsp; / &nbsp; ${pad(s.sourceSlide - 3)} из 05</span>`)}<div class="strategy-order" aria-hidden="true">${pad(s.sourceSlide - 3)}</div><div class="strategy-grid"><div><p class="strategy-definition">${esc(lines[2])}</p><div class="strategy-when"><span class="eyebrow">${esc(lines[when])}</span><ul>${conditions.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div></div><div class="strategy-right"><img class="strategy-image" src="${esc(media.src)}" alt="${alt}"><p class="strategy-stance">${esc(quote)}</p><p class="strategy-coordinates">${esc(coords)}</p></div></div><div class="strategy-risk"><span>РИСКИ</span><p>${esc(risks.slice('Риски:'.length).trim())}</p></div>`;
  }
  function sceneMarkup(s) {
    if (s.id === 'opening') return `<span class="eyebrow"><span class="accent">АРХИТЕКТУРА</span> / ПСИХОЛОГИЯ / ПРАКТИКА</span><h1><span class="first-line">ПОД</span><span class="red-line">ДАВЛЕНИЕМ</span></h1><div class="hero-bottom"><p class="hero-subtitle">Сложные переговоры<br>в архитектуре</p><div class="hero-team">${data.people.map(p => `<span>${esc(p.name)}</span>`).join('')}</div></div><div class="hero-callout"><span class="cross">+</span><p>«Тут буквально <strong>маленькая правка</strong>».<br>Знакомо? Тогда начнём.</p></div><span class="hero-side">СЛОЖНОСТЬ РАЗГОВОРА / ЦЕНА РЕШЕНИЯ</span>`;
    if (s.id === 'why-difficult') return `${header(s)}<div class="issues">${s.points.map(p => `<div class="issue"><h3>${esc(p)}</h3></div>`).join('')}</div><p class="definition">Переговоры помогают согласовать интересы сторон, разрешить разногласия и найти взаимоприемлемое решение.</p>`;
    if (s.id === 'position-interest') return `${header(s)}<div class="position-layout"><div class="position-block"><span class="eyebrow">ПОЗИЦИЯ / ЧТО ТРЕБУЕТ</span><blockquote>«Просто замените<br>материал фасада»</blockquote></div><div class="position-block"><span class="eyebrow">ИНТЕРЕС / ЧТО ХОЧЕТ ПОЛУЧИТЬ</span><blockquote>Что для вас<br>в нём важно?</blockquote></div></div><p class="position-foot">Выяснить интерес. Обсудить варианты. Опереться на объективные критерии.</p>`;
    if (s.id === 'conversation-support') {
      const details = ['Открытый вопрос и активное слушание','Факты, сроки и ресурсы','Несколько условий для обсуждения','Что, кто и когда делает дальше'];
      return `${header(s)}<div class="steps">${s.points.map((p,i) => `<div class="step"><span class="step-number">${pad(i+1)}</span><h3>${esc(p)}</h3><p>${details[i]}</p></div>`).join('')}</div>`;
    }
    if (s.id === 'valeria-01') return `<div class="test-layout"><div><span class="eyebrow">02 / ДИАГНОСТИКА</span><h2 class="test-title" style="margin-top:20px">Тест Томаса-<br>Килманна (1974)</h2><p class="test-adaptation">Адаптация: Н. В. Шаньгина (2015)</p><div class="test-stats"><div class="test-stat"><strong>30</strong><span>вопросов</span></div><div class="test-stat"><strong>6</strong><span>мин</span></div></div></div><div class="qr-block"><img src="${esc(s.original.images[0].src)}" alt="QR-код теста из исходной презентации"><a href="https://psytests.org/confl/tki.html" target="_blank" rel="noopener noreferrer">Открыть тест<br>psytests.org/confl/tki.html ↗</a></div></div><div class="test-bottom">${button('Тест завершён. К результатам <span aria-hidden="true">→</span>', 'finish-test')}<p class="test-progress-note">Таймер запускает ведущий.<br>Результаты открываются вручную.</p></div>`;
    if (s.id === 'valeria-02') {
      if (!testUnlocked) return `${header(s)}<div class="result-cover"><p class="huge">30 / 6</p><p>Дайте участникам закончить тест.<br>Ведущий открывает профиль, когда группа готова к обсуждению.</p>${button('Открыть результат', 'unlock-test')}</div>`;
      const p = s.imageTranscription;
      return `${header(s)}<div class="profile"><div class="profile-scale"><span>0</span><span>12</span></div>${p.scores.map(([label, score],i) => `<div class="profile-row"><span class="profile-label">${esc(label)}</span><div class="profile-track"><div class="profile-fill" style="width:${score/12*100}%"></div>${[0,2].map(j => `<span class="profile-boundary" style="left:${(p.rangeBoundaries[i][j]+.5)/12*100}%">${p.rangeBoundaries[i][j]}|${p.rangeBoundaries[i][j+1]}</span>`).join('')}</div><strong class="profile-value">${score}</strong></div>`).join('')}<p class="profile-legend">${esc(p.legend)}</p><p class="profile-source">${esc(p.footer)} / профиль из исходной презентации</p></div>`;
    }
    if (s.id === 'valeria-03') return `${header(s)}<div class="model-layout"><div class="model" role="img" aria-label="Схема пяти стратегий по осям напористость и кооперация"><span class="model-y">Напористость</span><span class="model-x">Кооперация</span><div class="model-point" style="left:24%;top:17%"><strong>Соперничество</strong><small>Победа – поражение</small></div><div class="model-point" style="left:76%;top:17%"><strong>Сотрудничество</strong><small>Победа – победа</small></div><div class="model-point" style="left:50%;top:50%"><strong>Компромисс</strong></div><div class="model-point" style="left:24%;top:83%"><strong>Уклонение</strong><small>Поражение – поражение</small></div><div class="model-point" style="left:76%;top:83%"><strong>Приспособление</strong><small>Поражение – победа</small></div></div><aside class="model-comment"><p>Пять способов<br>действовать<br>в конфликте.</p><p>Дальше разберём каждый: особенности, условия применения и риски.</p></aside></div>`;
    if (s.sourceSlide >= 4 && s.speaker === 'valeria') return renderStrategy(s);
    if (s.id === 'friday-case') return `<span class="eyebrow">03 / ПРАКТИКА / ЛИЧНЫЕ ГРАНИЦЫ</span><div class="case-layout"><div><div class="case-time">18:55<small>ПЯТНИЦА / ВЫ СОБИРАЕТЕСЬ ДОМОЙ</small></div><p class="case-details">Переделать генплан, три фасада и пару визуализаций. В понедельник утром — показ заказчику. Работы минимум на два дня.</p></div><div><blockquote class="case-quote">«Ну мы же<br>одна команда!<br><span class="accent">Я на тебя<br>рассчитываю»</span></blockquote><span class="case-tag">«ПОСЛЕДНЯЯ ПРАВКА. ТОЧНО ПОСЛЕДНЯЯ»</span></div></div>`;
    if (s.id === 'five-responses') return instructions(s, `<span class="eyebrow">ПЯТЬ ГРУПП / ПЯТЬ СТРАТЕГИЙ</span><div class="role-list">${s.roleCards.map(p => `<span>${esc(p)}</span>`).join('')}</div>`);
    if (s.id === 'friday-debrief') return `${header(s)}<div class="questions">${s.points.map((p,i) => `<div class="question"><span>${pad(i+1)}</span><p>${esc(p)}</p></div>`).join('')}</div><div class="reveal-answer">${button('Показать вариант ответа', 'reveal-friday', false)}<div class="answer-content" id="friday-answer" hidden>«Давайте решим, <b>что действительно нужно к понедельнику</b>, а остальные задачи перенесём или распределим».<br>Сотрудничество: согласовать приоритеты, сроки и нагрузку. Выбор стратегии зависит от обстоятельств.</div></div>`;
    if (s.id === 'facade-case') return `<span class="eyebrow">04 / ПРАКТИКА / ИЗМЕНЕНИЕ ПРОЕКТА</span><div class="case-layout"><div><h2>«Это же просто<br><span>заменить<br>материал»</span></h2><p class="case-details">Перед согласованием заказчик выбирает более дорогой фасадный материал, требующий другого конструктивного решения.</p><span class="case-tag">«Я ПРОСТО ВЛЮБИЛСЯ В ЭТО!»</span></div>${facade()}</div>`;
    if (s.id === 'facade-roles') return instructions(s, '<span class="eyebrow">РАБОТА В ПАРАХ</span><p class="role-description"><b>Архитектор</b><br>Уточняет интерес, объясняет последствия и предлагает порядок действий.</p><p class="role-description"><b>Заказчик</b><br>Настаивает. Не ожидал сложностей и считает их заботой архитектора.</p>');
    if (s.id === 'facade-second-round') return instructions(s, '<span class="eyebrow">ТЕХНИКА «ДА, И…»</span><p class="role-description">Признать пожелание.<br>Обсудить необходимые проверки.<br>Предложить порядок действий.</p>');
    if (s.id === 'facade-agreement') return `${header(s)}<div class="agreement-grid">${s.points.map((p,i) => `<div class="agreement-item"><span>${pad(i+1)} / ПРОВЕРЬТЕ РЕЗУЛЬТАТ</span>${esc(p)}</div>`).join('')}</div>`;
    if (s.id === 'payment-overdue') return `<span class="eyebrow">05 / ПРАКТИКА / ЗАКАЗЧИК И ДЕНЬГИ</span><div class="case-layout"><div><h2>«Деньги скоро<br>будут.<br><span>Продолжайте»</span></h2><p class="case-details">Очередной платёж по договору не поступил. Вы напоминаете об оплате, заказчик просит работать дальше.</p></div><div class="case-counter">14<span>ДНЕЙ ПОСЛЕ ДЕДЛАЙНА</span></div></div><p class="case-tag">ЗАДАЧА / РАЗРАБОТАТЬ ПОШАГОВЫЙ АЛГОРИТМ ДЕЙСТВИЙ АРХИТЕКТОРА</p>`;
    if (s.id === 'payment-response') return instructions(s, '<span class="eyebrow">МИНИ-ГРУППЫ</span><p class="role-description">Назовите факт задержки.<br>Сформулируйте границу.<br>Предложите конкретный следующий шаг.</p>');
    if (s.id === 'accepted-unpaid') return `<span class="eyebrow">05 / ПРАКТИКА / ВТОРОЙ КЕЙС</span><div class="case-layout"><div><h2>Работу приняли.<br><span>Оплату<br>откладывают.</span></h2><p class="case-details">Акт сдачи-приёмки подписан. Заказчик постоянно переносит оплату «на следующую неделю».</p></div><div class="case-counter">АКТ<span>ПОДПИСАН / ПЛАТЁЖ НЕ ПОСТУПИЛ</span></div></div><p class="case-tag">КАКИЕ МЕХАНИЗМЫ НУЖНО БЫЛО ЗАЛОЖИТЬ В ДОГОВОР ИЗНАЧАЛЬНО?</p>`;
    if (s.id === 'payment-debrief') return `${header(s)}<div class="questions">${s.points.map((p,i) => `<div class="question"><span>${pad(i+1)}</span><p>${esc(p)}</p></div>`).join('')}</div><div class="reveal-answer">${button('Открыть опоры для обсуждения', 'reveal-payment', false)}<div class="answer-content" id="payment-answer" hidden><b>Сейчас:</b> назвать факт, уточнить конкретный срок, обозначить действия в рамках согласованных условий, письменно зафиксировать следующий шаг.<br><b>Заранее:</b> согласовать порядок и сроки оплаты этапов, приёмку, действия при задержке и условия использования проекта.</div></div>`;
    if (s.id === 'closing') return `<span class="eyebrow">06 / ЧТО ОСТАЁТСЯ С ВАМИ</span><h2 style="margin-top:26px">«Тут буквально<br><span>маленькая<br>правка».</span></h2><p class="closing-question">Что вы скажете теперь?</p><div class="closing-chain">${['Факт','Интерес','Граница','Вариант','Следующий шаг'].map(p => `<span>${p}</span>`).join('')}</div>`;
    if (s.id === 'sources') return `${header(s)}<ul class="source-list">${s.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul><div class="source-links">${s.links.map(link => `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a>`).join('')}</div>`;
    return `${header(s)}<div class="questions">${s.points.map((p,i) => `<div class="question"><span>${pad(i+1)}</span><p>${esc(p)}</p></div>`).join('')}</div>`;
  }

  function currentTimer() {
    const s = scenes[index];
    if (!timers.has(s.id)) timers.set(s.id, {duration:s.timerSeconds || 60, remaining:s.timerSeconds || 60});
    return timers.get(s.id);
  }
  function updateTimer() {
    const timer = currentTimer();
    if (timerRunning) timer.remaining = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
    if (timerRunning && timer.remaining === 0) {
      timerRunning = false;
      clearInterval(timerInterval);
      $('announcer').textContent = 'Время на задание закончилось.';
    }
    $('timer-display').textContent = $('timer-large').textContent = formatTime(timer.remaining);
    document.querySelectorAll('[data-scene-timer]').forEach(el => el.textContent = formatTime(timer.remaining));
    $('timer-open').classList.toggle('running', timerRunning);
    $('timer-open').classList.toggle('finished', timer.remaining === 0);
    $('timer-toggle').textContent = timerRunning ? 'Пауза' : timer.remaining === 0 ? 'Начать заново' : 'Запустить';
    $('timer-open').setAttribute('aria-label', `Открыть таймер: ${formatTime(timer.remaining)}${timerRunning ? ', идёт отсчёт' : ', на паузе'}`);
  }
  function pauseTimer() {
    if (timerRunning) updateTimer();
    timerRunning = false;
    clearInterval(timerInterval);
  }
  function toggleTimer() {
    if (timerRunning) { pauseTimer(); updateTimer(); return; }
    const timer = currentTimer();
    if (timer.remaining <= 0) timer.remaining = timer.duration;
    timerDeadline = Date.now() + timer.remaining * 1000;
    timerRunning = true;
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 200);
    updateTimer();
  }
  function render() {
    const s = scenes[index], group = groupFor(index);
    const groupNumber = groups.indexOf(group) + 1;
    document.title = `${s.title} — Под давлением`;
    document.body.classList.toggle('reading', s.speaker === 'valeria' || ['why-difficult','conversation-support'].includes(s.id));
    document.body.classList.toggle('case-active', ['friday-case','facade-case','payment-overdue','accepted-unpaid'].includes(s.id));
    $('phase').innerHTML = `<strong>${pad(groupNumber)} / 06</strong>${esc(group.label)}`;
    $('speaker').innerHTML = s.speaker ? `<span class="speaker-index">${pad(data.people.findIndex(p => p.id === s.speaker)+1)}</span><span><small>ВЕДУЩИЙ</small>${esc(people[s.speaker])}</span>` : '<span><small>ПОД ДАВЛЕНИЕМ</small>Источники занятия</span>';
    $('current').textContent = pad(index + 1);
    $('total').textContent = pad(scenes.length);
    $('progress').style.width = `${(index+1)/scenes.length*100}%`;
    $('previous').disabled = index === 0;
    $('next').disabled = index === scenes.length - 1;
    $('next').setAttribute('aria-label', s.id === 'valeria-01' ? 'Завершить тест и открыть результаты' : 'Следующий слайд');
    $('next').title = s.id === 'valeria-01' ? 'Завершить тест и открыть результаты' : 'Дальше (→)';
    const cls = ['scene',s.id === 'opening' ? 'hero' : '',s.sourceSlide >= 4 && s.speaker === 'valeria' ? 'strategy' : '',['friday-case','facade-case','payment-overdue','accepted-unpaid'].includes(s.id) ? 'case-screen' : '',s.id === 'accepted-unpaid' ? 'case-secondary' : '',s.id === 'closing' ? 'closing' : ''].filter(Boolean).join(' ');
    $('deck').innerHTML = `<section class="${cls}" data-scene-id="${s.id}" aria-label="${index+1}. ${esc(s.title)}">${sceneMarkup(s)}</section>`;
    $('deck').scrollTop = 0;
    $('announcer').textContent = `Слайд ${index+1} из ${scenes.length}: ${s.title}`;
    updateTimer();
    updateNotes();
  }
  function go(nextIndex, fromHash = false) {
    const target = Math.min(scenes.length - 1, Math.max(0, nextIndex));
    if (target === index && !fromHash) return;
    pauseTimer();
    if (scenes[index].id === 'valeria-01' && target === index + 1) unlockTest();
    index = target;
    if (!fromHash) history.replaceState(null, '', `#${scenes[index].id}`);
    closeDialogs();
    render();
    transitionId++;
  }
  function unlockTest() { testUnlocked = true; }
  function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }
  function openDialog(id) {
    closeDialogs();
    if (id === 'overview') renderOverview();
    if (id === 'timer-panel') { $('timer-duration').value = String(currentTimer().duration); updateTimer(); }
    $(id).showModal();
  }
  function renderOverview() {
    $('overview-list').innerHTML = scenes.map((s,i) => `<button class="overview-item" data-jump="${i}" aria-current="${i===index}"><span>${pad(i+1)}</span><strong><small>${esc(groupFor(i).label)}${s.speaker ? ' / ' + esc(people[s.speaker]) : ''}</small>${esc(s.title)}</strong></button>`).join('');
  }
  function updateNotes() {
    const s = scenes[index];
    $('notes-content').innerHTML = `<h3>${esc(s.title)}</h3><p>${esc(s.speakerNotes || notesById[s.id] || 'Раскройте содержание экрана, затем вручную перейдите к следующему.')}</p>${s.source ? `<p class="source-note">ИСТОЧНИК<br>${esc(s.source)}${s.sourceSlide ? ', слайд ' + s.sourceSlide : ''}</p>` : ''}`;
  }
  function setMotion(enabled) {
    motion = enabled;
    document.body.classList.toggle('no-motion', !motion);
    $('motion').setAttribute('aria-label', motion ? 'Отключить анимацию' : 'Включить анимацию');
    $('motion').setAttribute('aria-pressed', String(!motion));
    store.set('pressure-reduce-motion-v1', !motion);
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('announcer').textContent = 'Браузер не включил полный экран. Можно использовать F11.'; }
  }
  $('previous').addEventListener('click', () => go(index - 1));
  $('next').addEventListener('click', () => go(index + 1));
  $('overview-open').addEventListener('click', () => openDialog('overview'));
  $('help-open').addEventListener('click', () => openDialog('help'));
  $('timer-open').addEventListener('click', () => openDialog('timer-panel'));
  $('fullscreen').addEventListener('click', toggleFullscreen);
  $('motion').addEventListener('click', () => setMotion(!motion));
  $('timer-toggle').addEventListener('click', toggleTimer);
  $('timer-reset').addEventListener('click', () => { pauseTimer(); currentTimer().remaining = currentTimer().duration; updateTimer(); });
  $('timer-add').addEventListener('click', () => { const timer = currentTimer(); timer.remaining += 60; if (timerRunning) timerDeadline += 60000; updateTimer(); });
  $('timer-duration').addEventListener('change', event => { pauseTimer(); currentTimer().duration = currentTimer().remaining = Number(event.target.value); updateTimer(); });
  document.querySelectorAll('.close-dialog').forEach(b => b.addEventListener('click', closeDialogs));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) { const rect=d.getBoundingClientRect(); if (e.clientX<rect.left || e.clientX>rect.right || e.clientY<rect.top || e.clientY>rect.bottom) d.close(); } }));
  $('overview-list').addEventListener('click', e => { const target = e.target.closest('[data-jump]'); if (target) { const nextIndex=Number(target.dataset.jump); if(nextIndex===index)closeDialogs();else go(nextIndex); } });
  $('deck').addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    if (target.dataset.action === 'finish-test') { unlockTest(); go(index+1); }
    if (target.dataset.action === 'unlock-test') { unlockTest(); render(); }
    if (target.dataset.action === 'timer') openDialog('timer-panel');
    if (target.dataset.action === 'reveal-friday') { $('friday-answer').hidden = !$('friday-answer').hidden; target.setAttribute('aria-expanded', String(!$('friday-answer').hidden)); }
    if (target.dataset.action === 'reveal-payment') { $('payment-answer').hidden = !$('payment-answer').hidden; target.setAttribute('aria-expanded', String(!$('payment-answer').hidden)); }
  });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    const open = document.querySelector('dialog[open]');
    if (open) return;
    if (['ArrowRight','PageDown',' '].includes(e.key)) { e.preventDefault(); go(index + 1); }
    else if (['ArrowLeft','PageUp'].includes(e.key)) { e.preventDefault(); go(index - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(scenes.length - 1); }
    else if (e.key.toLowerCase() === 'o' || e.key.toLowerCase() === 'щ') openDialog('overview');
    else if (e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р' || e.key === '?') openDialog('help');
    else if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'е') openDialog('timer-panel');
    else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'а') toggleFullscreen();
    else if (e.key.toLowerCase() === 'm' || e.key.toLowerCase() === 'ь') setMotion(!motion);
    else if (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 'т') openDialog('notes');
  });
  $('deck').addEventListener('touchstart', e => { if (e.touches.length === 1) touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY}; }, {passive:true});
  $('deck').addEventListener('touchend', e => { if (!touchStart) return; const dx=e.changedTouches[0].clientX-touchStart.x, dy=e.changedTouches[0].clientY-touchStart.y; if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*1.8&&!document.querySelector('dialog[open]'))go(index+(dx<0?1:-1));touchStart=null; }, {passive:true});
  window.addEventListener('hashchange', () => { const target=scenes.findIndex(s=>`#${s.id}`===location.hash); if(target>=0)go(target,true); });
  document.addEventListener('fullscreenchange', () => $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Выйти из полного экрана' : 'Полный экран'));
  window.addEventListener('pagehide', pauseTimer);
  setMotion(motion);
  render();

  // Variant 2: continuous compression, flowing stress contours and edge vectors.
  // All movement shares the existing M control; no flashes or abrupt luminance changes.
  const canvas=$('pressure-field'),ctx=canvas.getContext('2d');
  if (!ctx) return;
  let width=0,height=0,dpr=1,last=0,lastStatic=0,fieldTime=0;
  function resize(){dpr=Math.min(devicePixelRatio||1,1.5);width=innerWidth;height=innerHeight;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);lastStatic=0;}
  window.addEventListener('resize',resize);resize();
  function draw(now){
    requestAnimationFrame(draw);
    if(document.hidden){last=now;return;}
    if(now-last<32)return;
    const delta=Math.min((now-last)/1000,.06);last=now;
    if(motion)fieldTime+=delta;
    if(!motion&&lastStatic===transitionId+1)return;
    lastStatic=transitionId+1;
    const t=fieldTime;
    ctx.clearRect(0,0,width,height);
    const reading=document.body.classList.contains('reading');
    const caseActive=document.body.classList.contains('case-active');
    const strength=reading?.60:caseActive?1.10:.91;
    const mobile=width<700;
    const focusX=width*(.82+.035*Math.sin(t*.19));
    const focusY=height*(.50+.055*Math.sin(t*.23));
    const compression=.5+.5*Math.sin(t*.48);

    // A broad, steady red pressure front sits outside the main reading area.
    const glow=ctx.createRadialGradient(focusX,focusY,0,focusX,focusY,width*.57);
    glow.addColorStop(0,`rgba(188,31,20,${strength*.19})`);
    glow.addColorStop(.48,`rgba(135,22,16,${strength*.12})`);
    glow.addColorStop(1,'rgba(110,20,15,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);

    // Interlocking stress lines pull inward continuously, rather than blinking.
    const cols=mobile?40:64,rows=mobile?25:36,points=[];
    for(let row=0;row<=rows;row++){
      const line=[];
      for(let col=0;col<=cols;col++){
        const u=col/cols,v=row/rows;
        const focus=Math.exp(-((u-.80)**2*8+(v-.51)**2*3.4));
        const wave=Math.sin(u*8.5-t*.48)*Math.cos(v*4.6+t*.22);
        const x=u*width*1.22-width*.11+Math.cos(v*6.2+t*.34)*focus*width*(.065+compression*.022);
        const y=v*height*1.5-height*.25+wave*focus*height*.22+Math.sin(u*17-v*5+t*.42)*height*.022;
        line.push({x,y,focus});
      }
      points.push(line);
    }
    for(let row=0;row<=rows;row++){
      ctx.beginPath();points[row].forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.strokeStyle=`rgba(${row%4===0?'250,59,46':'181,145,132'},${strength*(row%4===0?.22:.085)})`;
      ctx.lineWidth=row%4===0?1.15:.65;ctx.stroke();
    }
    for(let col=0;col<=cols;col+=2){
      ctx.beginPath();points.forEach((line,i)=>i?ctx.lineTo(line[col].x,line[col].y):ctx.moveTo(line[col].x,line[col].y));
      ctx.strokeStyle=`rgba(208,135,116,${strength*.085})`;ctx.lineWidth=.65;ctx.stroke();
    }
    for(const line of points)for(const p of line){
      ctx.fillStyle=`rgba(${p.focus>.55?'250,77,56':'209,173,155'},${strength*(.10+p.focus*.32)})`;
      const size=p.focus>.6?1.9:1;ctx.fillRect(p.x,p.y,size,size);
    }

    // Nested elliptical fronts tighten toward the right-hand pressure centre.
    ctx.save();ctx.translate(focusX,focusY);ctx.rotate(-.34+Math.sin(t*.14)*.08);
    for(let k=0;k<10;k++){
      const radius=.09+k*.035-compression*.009;
      ctx.beginPath();ctx.ellipse(0,0,width*radius,height*(.19+k*.053),0,0,Math.PI*2);
      ctx.strokeStyle=`rgba(250,59,46,${strength*(k%3===0?.27:.13)})`;
      ctx.lineWidth=k%3===0?1.15:.7;ctx.stroke();
      // Short travelling highlights show direction without opacity pulsing.
      if(k%2===0){
        const angle=t*(.13+k*.006)+k*.9;
        ctx.beginPath();ctx.ellipse(0,0,width*radius,height*(.19+k*.053),0,angle,angle+.28);
        ctx.strokeStyle=`rgba(255,100,72,${strength*.43})`;ctx.lineWidth=1.7;ctx.stroke();
      }
    }
    ctx.restore();

    // Opposing vectors remain at the margins, clear of buttons and body copy.
    const laneCount=mobile?4:6;
    for(let side=0;side<2;side++)for(let lane=0;lane<laneCount;lane++){
      const travel=(t*.038+lane*.173)%1;
      const inward=width*(.012+travel*.08);
      const x=side?width-inward:inward;
      const y=height*(.20+lane*.115)+Math.sin(t*.37+lane)*height*.018;
      const direction=side?-1:1;
      const alpha=Math.sin(travel*Math.PI)*strength*.42;
      ctx.beginPath();ctx.moveTo(x-direction*26,y);ctx.lineTo(x,y);
      ctx.moveTo(x-direction*6,y-4);ctx.lineTo(x,y);ctx.lineTo(x-direction*6,y+4);
      ctx.strokeStyle=`rgba(250,72,50,${alpha})`;ctx.lineWidth=1;ctx.stroke();
    }

    // A fixed dark veil protects type and figures while retaining visible edges.
    const shade=ctx.createLinearGradient(0,0,width,0);
    shade.addColorStop(0,'rgba(16,16,16,.28)');
    shade.addColorStop(.13,`rgba(16,16,16,${reading?.84:.63})`);
    shade.addColorStop(.48,`rgba(16,16,16,${reading?.82:.58})`);
    shade.addColorStop(.76,`rgba(16,16,16,${reading?.50:.12})`);
    shade.addColorStop(1,'rgba(16,16,16,.03)');
    ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  }
  requestAnimationFrame(draw);
})();
