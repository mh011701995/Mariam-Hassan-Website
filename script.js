var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Hero waveform (cursor-reactive) ----------
(function () {
  var canvas = document.getElementById('waveCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var mouseX = null;
  var t = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  });
  canvas.addEventListener('mouseleave', function () { mouseX = null; });
  canvas.addEventListener('touchmove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.touches[0].clientX - rect.left;
  }, { passive: true });
  canvas.addEventListener('touchend', function () { mouseX = null; });

  function draw() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    var baseAmp = h * 0.14;
    ctx.beginPath();
    for (var x = 0; x <= w; x += 2) {
      var localAmp = baseAmp;
      if (mouseX !== null) {
        var dist = Math.abs(x - mouseX);
        var boost = Math.max(0, 1 - dist / 140) * h * 0.22;
        localAmp += boost;
      }
      var y = h / 2 + Math.sin(x * 0.045 + t) * localAmp * 0.65 + Math.sin(x * 0.16 + t * 1.6) * localAmp * 0.3;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#E3E3E1';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (!reducedMotion) t += 0.04;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- EEG demo: slider controls amplitude + predicted state ----------
(function () {
  var canvas = document.getElementById('eegDemoCanvas');
  var slider = document.getElementById('eegSlider');
  var stateLabel = document.getElementById('eegState');
  if (!canvas || !slider) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var t = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function updateState() {
    var val = Number(slider.value);
    stateLabel.textContent = 'Predicted state: ' + (val > 55 ? 'Focused' : 'Relaxed');
  }
  slider.addEventListener('input', updateState);
  updateState();

  function draw() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    var val = Number(slider.value) / 100;
    var amp = h * (0.08 + val * 0.32);
    var freq = 0.05 + val * 0.18;
    ctx.beginPath();
    for (var x = 0; x <= w; x += 2) {
      var y = h / 2 + Math.sin(x * freq + t) * amp * 0.6 + Math.sin(x * freq * 2.3 + t * 1.4) * amp * 0.25;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#D0D0CE';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    if (!reducedMotion) t += 0.05;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- Robotic arm demo: drag to move via 2-link inverse kinematics ----------
(function () {
  var canvas = document.getElementById('armDemoCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var target = null;
  var dragging = false;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  canvas.addEventListener('mousedown', function (e) { dragging = true; target = getPos(e); });
  canvas.addEventListener('touchstart', function (e) { dragging = true; target = getPos(e); }, { passive: true });
  window.addEventListener('mousemove', function (e) { if (dragging) target = getPos(e); });
  canvas.addEventListener('touchmove', function (e) { if (dragging) target = getPos(e); }, { passive: true });
  window.addEventListener('mouseup', function () { dragging = false; });
  window.addEventListener('touchend', function () { dragging = false; });

  function drawArm() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    var baseX = w / 2, baseY = h - 6;
    var L1 = h * 0.55, L2 = h * 0.5;

    var tx = target ? target.x : baseX + 20;
    var ty = target ? target.y : baseY - h * 0.6;

    var dx = tx - baseX, dy = ty - baseY;
    var dist = Math.min(Math.sqrt(dx * dx + dy * dy), L1 + L2 - 1);
    dist = Math.max(dist, Math.abs(L1 - L2) + 1);

    var a = Math.atan2(dy, dx);
    var cosAngle = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    cosAngle = Math.max(-1, Math.min(1, cosAngle));
    var angle1 = a - Math.acos(cosAngle);

    var elbowX = baseX + L1 * Math.cos(angle1);
    var elbowY = baseY + L1 * Math.sin(angle1);

    var cosAngle2 = (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2);
    cosAngle2 = Math.max(-1, Math.min(1, cosAngle2));
    var angle2 = Math.PI - Math.acos(cosAngle2);

    var endX = elbowX + L2 * Math.cos(angle1 + angle2);
    var endY = elbowY + L2 * Math.sin(angle1 + angle2);

    ctx.strokeStyle = '#E3E3E1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = '#9A9A98';
    [[baseX, baseY], [elbowX, elbowY]].forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#F5F5F3';
    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(drawArm);
  }
  drawArm();
})();

// ---------- Dashboard demo: live scrolling stream with play/pause ----------
(function () {
  var canvas = document.getElementById('dashDemoCanvas');
  var toggleBtn = document.getElementById('dashToggle');
  var readout = document.getElementById('dashReadout');
  if (!canvas || !toggleBtn) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var running = true;
  var values = [];
  var current = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  toggleBtn.addEventListener('click', function () {
    running = !running;
    toggleBtn.textContent = running ? 'Pause stream' : 'Resume stream';
  });

  var frame = 0;
  function tick() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;

    if (running && frame % 3 === 0) {
      current += (Math.random() - 0.5) * 8;
      current = Math.max(-40, Math.min(40, current));
      values.push(current);
      var maxPoints = Math.floor(w / 3);
      if (values.length > maxPoints) values.shift();
      readout.textContent = current.toFixed(2) + ' \u00B5V';
    }
    frame++;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    for (var i = 0; i < values.length; i++) {
      var x = w - (values.length - i) * 3;
      var y = h / 2 - values[i];
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#D0D0CE';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    requestAnimationFrame(tick);
  }
  tick();
})();

// ---------- Contact: click-to-copy email ----------
(function () {
  var btn = document.getElementById('emailCopyBtn');
  var hint = document.getElementById('copyHint');
  var emailValue = document.getElementById('emailValue');
  if (!btn) return;

  var email = emailValue.textContent.trim();

  btn.addEventListener('click', function () {
    var done = function () {
      var original = hint.textContent;
      hint.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        hint.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(done).catch(done);
    } else {
      // fallback for browsers without Clipboard API support
      var temp = document.createElement('textarea');
      temp.value = email;
      document.body.appendChild(temp);
      temp.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(temp);
      done();
    }
  });
})();

// ---------- Scroll reveal ----------
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  function revealAll() {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  // Reveal anything already in view on load immediately, so above-the-fold
  // content is never blank while waiting on the observer.
  items.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('is-visible');
    }
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(function (el) { observer.observe(el); });

  // Safety net: never leave content permanently invisible even if the
  // observer misbehaves in some browser.
  setTimeout(revealAll, 4000);
})();
