(() => {
  'use strict';
  const form = document.getElementById('feedback-form');
  if (!form) return;

  const submit = form.querySelector('.feedback-submit');
  const submitLabel = submit.querySelector('span');
  const status = document.getElementById('feedback-form-status');
  const success = document.getElementById('popup-feedback-success');
  const IDLE_LABEL = submitLabel.textContent;

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TELEGRAM = /^(?:@|(?:https?:\/\/)?t\.me\/)?[a-z][a-z0-9_]{4,31}$/i;

  // Each rule returns an error message, or '' when the value is acceptable.
  const rules = {
    message: v => v ? '' : 'Напиши свой вопрос или предложение',
    name: v => v ? '' : 'Укажи, как к тебе обращаться',
    phone: v => {
      if (!v) return '';
      const digits = v.replace(/\D/g, '').length;
      return /^[+\d\s()-]+$/.test(v) && digits >= 10 && digits <= 15 ? '' : 'Проверь номер: нужно 10–15 цифр';
    },
    contact: v => {
      if (!v) return 'Оставь email или ник в Telegram';
      return EMAIL.test(v) || TELEGRAM.test(v) ? '' : 'Укажи email (name@mail.ru) или ник в Telegram (@username)';
    },
    consent: checked => checked ? '' : 'Подтверди согласие на обработку персональных данных',
  };
  const names = Object.keys(rules);
  const touched = new Set();
  let sending = false;

  const valueOf = name => {
    const field = form.elements[name];
    return field.type === 'checkbox' ? field.checked : field.value.trim();
  };
  const errorOf = name => rules[name](valueOf(name));
  const isValid = () => names.every(name => !errorOf(name));

  function renderField(name) {
    const field = form.elements[name];
    const hint = document.getElementById(`feedback-${name}-error`);
    const message = touched.has(name) ? errorOf(name) : '';
    hint.textContent = message;
    hint.hidden = !message;
    field.toggleAttribute('aria-invalid', Boolean(message));
    field.closest('.feedback-field, .feedback-consent')?.classList.toggle('is-invalid', Boolean(message));
  }

  function setStatus(text, tone) {
    status.textContent = text;
    status.dataset.tone = tone || '';
  }

  // The button stays focusable (aria-disabled instead of disabled) so a press
  // on an incomplete form can still explain what is missing.
  function update() {
    const valid = isValid();
    submit.setAttribute('aria-disabled', String(!valid || sending));
    // Drop the summary once resolved, or when the consent hint takes its line.
    if (status.dataset.tone === 'invalid' && (valid || errorOf('consent'))) setStatus('');
  }

  names.forEach(name => {
    const field = form.elements[name];
    const isCheckbox = field.type === 'checkbox';
    field.addEventListener(isCheckbox ? 'change' : 'input', () => {
      if (isCheckbox) touched.add(name);
      if (touched.has(name)) renderField(name);
      update();
    });
    if (!isCheckbox) {
      field.addEventListener('blur', () => {
        if (!field.value.trim() && !touched.has(name)) return; // don't flag a field the user only tabbed through
        touched.add(name);
        renderField(name);
      });
    }
  });

  // Delivery is not connected yet. Set data-endpoint on the form to POST JSON
  // to a real handler; without it the request is simulated.
  async function deliver(payload) {
    const endpoint = form.dataset.endpoint;
    if (!endpoint) return new Promise(resolve => setTimeout(resolve, 900));
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Feedback request failed: ${response.status}`);
  }

  function setSending(on) {
    sending = on;
    form.setAttribute('aria-busy', String(on));
    form.classList.toggle('is-sending', on);
    [...form.elements].forEach(el => { if (el !== submit) el.disabled = on; });
    submitLabel.textContent = on ? 'Отправка…' : IDLE_LABEL;
    update();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;

    if (!isValid()) {
      names.forEach(name => { touched.add(name); renderField(name); });
      // One line fits under the actions: the consent hint, or else a summary.
      setStatus(errorOf('consent') ? '' : 'Заполни обязательные поля, отмеченные *', 'invalid');
      form.elements[names.find(name => errorOf(name))].focus();
      return;
    }

    const payload = {
      message: valueOf('message'),
      name: valueOf('name'),
      phone: valueOf('phone'),
      contact: valueOf('contact'),
      consent: true,
    };
    setStatus('');
    setSending(true);
    try {
      await deliver(payload);
      setSending(false);
      form.reset();
      touched.clear();
      names.forEach(renderField);
      update();
      if (success && typeof success.showModal === 'function') success.showModal();
      else setStatus('Сообщение отправлено. Спасибо!', 'success');
    } catch (err) {
      console.error(err);
      setSending(false);
      setStatus('Не удалось отправить сообщение. Попробуй ещё раз чуть позже.', 'error');
    }
  });

  if (success) {
    success.querySelectorAll('[data-close-popup]').forEach(btn => btn.addEventListener('click', () => success.close()));
    // The dialog art is lazy; start fetching it once someone engages with the form.
    form.addEventListener('focusin', () => success.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; }), { once: true });
    // The submit button was busy when the dialog opened; return focus to the form start.
    success.addEventListener('close', () => form.elements.message.focus({ preventScroll: true }));
  }

  update();
})();
