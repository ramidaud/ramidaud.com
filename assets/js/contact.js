/* Contact form: inline validation, then sends through FormSubmit's AJAX endpoint.
   Without JS the form posts normally to FormSubmit. */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var summary = document.getElementById('form-errors');
  var btn = form.querySelector('button[type=submit]');
  var endpoint = form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
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
    if (form.elements._honey.value) return;
    btn.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Sending…';
    fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && String(res.d.success) === 'true') {
          form.classList.add('sent');
          status.className = 'form-status is-ok';
          status.textContent = 'Sent. Thank you, I’ll be in touch.';
          form.reset();
          btn.textContent = 'Message sent';
        } else if (/activat/i.test(res.d.message || '')) {
          btn.disabled = false;
          status.className = 'form-status is-bad';
          status.textContent = 'This form is waiting to be activated. Please email ramidaud@me.com for now.';
        } else { throw new Error(res.d.message || 'failed'); }
      })
      .catch(function () {
        btn.disabled = false;
        status.className = 'form-status is-bad';
        status.innerHTML = 'That didn’t go through. Try again, or email <a href="mailto:ramidaud@me.com">ramidaud@me.com</a>.';
      });
  });
})();
