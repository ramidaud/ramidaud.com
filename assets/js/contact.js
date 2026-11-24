/* Contact form: inline validation, then sends through Web3Forms with a time limit.
   If the service has no key yet, is down, or times out, it falls back to the
   visitor's email app with the message filled in. */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var summary = document.getElementById('form-errors');
  var btn = form.querySelector('button[type=submit]');
  var to = form.getAttribute('data-mailto');
  var key = form.elements.access_key ? form.elements.access_key.value.trim() : '';
  var checks = [
    ['cf-name', function (v) { return v.trim() ? '' : 'Enter your name.'; }],
    ['cf-email', function (v) { return !v.trim() ? 'Enter your email address.' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com.'); }],
    ['cf-msg', function (v) { return v.trim() ? '' : 'Write a message.'; }]
  ];

  function setError(input, msg) {
    var id = input.id + '-err';
    var el = document.getElementById(id);
    var described = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
    if (msg) {
      if (!el) { el = document.createElement('p'); el.className = 'err'; el.id = id; input.insertAdjacentElement('afterend', el); }
      el.textContent = msg;
      input.setAttribute('aria-invalid', 'true');
      described.push(id);
    } else {
      if (el) el.remove();
      input.removeAttribute('aria-invalid');
    }
    if (described.length) input.setAttribute('aria-describedby', described.join(' ')); else input.removeAttribute('aria-describedby');
  }

  function validate() {
    var errors = [];
    checks.forEach(function (c) {
      var input = document.getElementById(c[0]);
      var msg = c[1](input.value);
      setError(input, msg);
      if (msg) errors.push([input, msg]);
    });
    return errors;
  }

  function mailtoHref() {
    var f = form.elements;
    var topic = (form.querySelector('input[name=topic]:checked') || {}).value || '';
    var body = f.message.value + '\n\n' + f.name.value + (f.organization.value ? ', ' + f.organization.value : '') + '\n' + f.email.value;
    return 'mailto:' + to + '?subject=' + encodeURIComponent('ramidaud.com: ' + topic) + '&body=' + encodeURIComponent(body);
  }

  function fallback(lead) {
    btn.disabled = false;
    status.className = 'form-status is-bad';
    status.innerHTML = lead + ' <a href="' + mailtoHref() + '">Send it from your email app instead</a>, already filled in.';
  }

  checks.forEach(function (c) {
    var input = document.getElementById(c[0]);
    input.addEventListener('blur', function () { if (input.hasAttribute('aria-invalid')) setError(input, c[1](input.value)); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errors = validate();
    if (errors.length) {
      summary.innerHTML = '<p>Please fix ' + (errors.length === 1 ? 'this' : 'these') + ' before sending:</p><ul>' +
        errors.map(function (er) { return '<li><a href="#' + er[0].id + '">' + er[1] + '</a></li>'; }).join('') + '</ul>';
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;
    if (form.elements.botcheck && form.elements.botcheck.checked) return;
    if (!key) { window.location.href = mailtoHref(); status.className = 'form-status'; status.textContent = 'Opening your email app with your message filled in.'; return; }

    btn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Sending…';
    var ctl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        clearTimeout(timer);
        if (res.ok && res.d.success) {
          form.classList.add('sent');
          if (window.RD && RD.track) RD.track('contact-sent', 'Contact form sent');
          status.className = 'form-status is-ok';
          status.textContent = 'Sent. Thank you, I’ll be in touch.';
          form.reset();
          btn.textContent = 'Message sent';
        } else { fallback('That didn’t go through.'); }
      })
      .catch(function (err) {
        clearTimeout(timer);
        fallback(err && err.name === 'AbortError' ? 'The form service isn’t answering.' : 'That didn’t go through.');
      });
  });
})();
