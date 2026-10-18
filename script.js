const sections = document.querySelectorAll('.screen');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  sections.forEach((section) => observer.observe(section));
} else {
  sections.forEach((section) => section.classList.add('is-visible'));
}

document.querySelector('#lead-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = form.querySelector('.lead-form__status');
  if (!form.checkValidity()) {
    form.reportValidity();
    status.textContent = 'Пожалуйста, заполните обязательные поля.';
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const contact = String(data.get('contact') || '').trim();
  const isTelegram = contact.startsWith('@') || contact.includes('t.me/');
  const utm = [...new URLSearchParams(location.search)]
    .filter(([key]) => key.toLowerCase().startsWith('utm_'))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const payload = {
    name: data.get('name'),
    phone: isTelegram ? '' : contact,
    telegram: isTelegram ? contact : '',
    contact,
    email: data.get('email'),
    situation: data.get('message'),
    selectedFormat: 'Обсуждение системы продаж',
    consent: data.get('consent') === 'on',
    page: location.href,
    utm
  };

  button.disabled = true;
  status.textContent = 'Отправляю…';
  try {
    const response = await fetch('https://auditprolab-crm.olgaspektorr.workers.dev', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || 'request_failed');
    status.textContent = 'Спасибо. Заявка отправлена — я свяжусь с вами.';
    form.reset();
  } catch (error) {
    console.error('Lead form submission failed', error);
    status.textContent = 'Не удалось отправить заявку. Напишите в Telegram: @olga_auditpro';
  } finally {
    button.disabled = false;
  }
});
