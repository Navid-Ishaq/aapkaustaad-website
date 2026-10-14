(() => {
  'use strict';
  const form = document.getElementById('alnoorInquiryForm');
  if (!form) return;
  const button = document.getElementById('enquirySubmit');
  const status = document.getElementById('enquiryStatus');
  const courseInput = document.getElementById('courseInterest');
  const allowed = new Set([...courseInput.options].filter(o => o.value).map(o => o.value));
  const requestedCourse = new URLSearchParams(location.search).get('course');
  if (requestedCourse && allowed.has(requestedCourse)) courseInput.value = requestedCourse;

  function setStatus(message, className) {
    status.className = 'enquiry-status ' + (className || '');
    status.textContent = message;
  }
  function read(field) { return form.elements.namedItem(field).value.trim(); }
  let pendingSubmissionId = null;
  let lastPayloadFingerprint = '';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const code = read('countryCode').replace(/\s/g, '');
    const national = read('whatsappNumber').replace(/[\s()\-.]/g, '');
    if (!/^\+[1-9]\d{0,3}$/.test(code) || !/^\d{5,14}$/.test(national) || !(code + national).match(/^\+[1-9]\d{6,14}$/)) {
      setStatus('Please enter a valid WhatsApp country code and mobile number.', 'error'); return;
    }
    const apiBase = (window.ALNOOR_INQUIRY_API_BASE || '').replace(/\/$/, '');
    if (!apiBase.startsWith('https://') || apiBase.includes('REPLACE_WITH')) {
      setStatus('Online enquiries are being configured. Please use the Contact page for now.', 'error'); return;
    }
    button.disabled = true;
    setStatus('Sending your enquiry. Please wait...');
    const payload = {
      name:read('name'), email:read('email'), countryCode:code,
      whatsappNumber:national, city:read('city'), language:read('language'),
      course:read('course'), question:read('question'),
      consent:form.elements.namedItem('consent').checked,
      companyWebsite:read('companyWebsite')
    };
    const fingerprint = JSON.stringify(payload);
    if (!pendingSubmissionId || fingerprint !== lastPayloadFingerprint) {
      pendingSubmissionId = crypto.randomUUID ? crypto.randomUUID() : 'enquiry-' + Date.now();
      lastPayloadFingerprint = fingerprint;
    }
    payload.submissionId = pendingSubmissionId;
    try {
      const response = await fetch(apiBase + '/api/inquiry', {
        method:'POST', mode:'cors', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'We could not submit your enquiry right now.');
      setStatus('Thank you! We received your enquiry (reference: ' + data.reference + '). Please also check your Spam/Junk folder for our confirmation email.', 'success');
      form.reset();
      pendingSubmissionId = null;
      lastPayloadFingerprint = '';
      courseInput.value = requestedCourse && allowed.has(requestedCourse) ? requestedCourse : '';
      window.scrollTo({top:Math.max(0, status.getBoundingClientRect().top + window.scrollY - 200),behavior:'smooth'});
    } catch (error) {
      setStatus(error.message || 'Unable to connect. Please try again or contact us via WhatsApp.', 'error');
    } finally { button.disabled = false; }
  });
})();
