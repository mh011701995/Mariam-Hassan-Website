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

// ---------- Closed-loop demo: decoded signal auto-drives the arm ----------
(function () {
  var canvas = document.getElementById('loopDemoCanvas');
  var label = document.getElementById('loopIntentLabel');
  if (!canvas || !label) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // same intent -> target mapping as the Python closed_loop_control.py version
  var INTENTS = {
    REST:        { x: 0.15, y: -0.55 },
    REACH_LEFT:  { x: -0.85, y: 0.05 },
    REACH_RIGHT: { x: 0.85, y: 0.05 },
    REACH_UP:    { x: 0.10, y: 0.85 },
    REACH_DOWN:  { x: 0.10, y: -0.20 }
  };
  var SEQUENCE = ['REST', 'REACH_RIGHT', 'REST', 'REACH_UP', 'REACH_LEFT', 'REST', 'REACH_DOWN', 'REST'];
  var FRAMES_PER_INTENT = 55;

  var L1 = 0.55, L2 = 0.45;
  var current = { x: INTENTS.REST.x, y: INTENTS.REST.y };
  var frameCount = 0;

  function solveIK(x, y) {
    var dist = Math.min(Math.hypot(x, y), L1 + L2 - 0.001);
    dist = Math.max(dist, Math.abs(L1 - L2) + 0.001);
    var a = Math.atan2(y, x);
    var cosA = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    cosA = Math.max(-1, Math.min(1, cosA));
    var theta1 = a - Math.acos(cosA);
    var cosB = (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2);
    cosB = Math.max(-1, Math.min(1, cosB));
    var theta2 = Math.PI - Math.acos(cosB);
    return [theta1, theta2];
  }

  function forwardFK(theta1, theta2) {
    var ex = L1 * Math.cos(theta1);
    var ey = L1 * Math.sin(theta1);
    var fx = ex + L2 * Math.cos(theta1 + theta2);
    var fy = ey + L2 * Math.sin(theta1 + theta2);
    return [[ex, ey], [fx, fy]];
  }

  function draw() {
    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var scale = Math.min(w, h) / 2.6;
    var originX = w / 2, originY = h / 2 + h * 0.18;

    var idx = Math.floor(frameCount / FRAMES_PER_INTENT) % SEQUENCE.length;
    var intentName = SEQUENCE[idx];
    var target = INTENTS[intentName];

    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;

    var angles = solveIK(current.x, current.y);
    var points = forwardFK(angles[0], angles[1]);
    var elbow = points[0], end = points[1];

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#E3E3E1';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + elbow[0] * scale, originY - elbow[1] * scale);
    ctx.lineTo(originX + end[0] * scale, originY - end[1] * scale);
    ctx.stroke();

    ctx.fillStyle = '#9A9A98';
    ctx.beginPath();
    ctx.arc(originX, originY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(originX + elbow[0] * scale, originY - elbow[1] * scale, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F5F5F3';
    ctx.beginPath();
    ctx.arc(originX + end[0] * scale, originY - end[1] * scale, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // target marker
    ctx.strokeStyle = '#767674';
    ctx.lineWidth = 1.2;
    var tx = originX + target.x * scale, ty = originY - target.y * scale;
    ctx.beginPath();
    ctx.moveTo(tx - 5, ty - 5); ctx.lineTo(tx + 5, ty + 5);
    ctx.moveTo(tx - 5, ty + 5); ctx.lineTo(tx + 5, ty - 5);
    ctx.stroke();

    label.textContent = 'Decoded intent: ' + intentName;

    frameCount++;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- Scroll-spy nav highlighting ----------
(function () {
  var navLinks = document.querySelectorAll('.nav-links a');
  if (!navLinks.length || !('IntersectionObserver' in window)) return;

  var sectionMap = {};
  navLinks.forEach(function (link) {
    var id = link.getAttribute('href').replace('#', '');
    var section = document.getElementById(id);
    if (section) sectionMap[id] = link;
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var id = entry.target.id;
      var link = sectionMap[id];
      if (!link) return;
      if (entry.isIntersecting) {
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  Object.keys(sectionMap).forEach(function (id) {
    observer.observe(document.getElementById(id));
  });
})();

// ---------- Project card 3D tilt ----------
(function () {
  var cards = document.querySelectorAll('.project-card');
  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var rotateY = (px - 0.5) * 10;
      var rotateX = (0.5 - py) * 10;
      card.style.transform =
        'perspective(700px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
    });
  });
})();

// ---------- Typewriter hero tagline ----------
(function () {
  var el = document.getElementById('heroRoleText');
  if (!el) return;
  var fullText = 'Software engineer — applied AI, brain-computer interfaces, and robotics';
  var charIndex = 0;
  var reducedMotionTW = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tick() {
    charIndex++;
    el.textContent = fullText.slice(0, charIndex);
    if (charIndex < fullText.length) {
      setTimeout(tick, 28);
    }
  }

  if (reducedMotionTW) {
    el.textContent = fullText;
  } else {
    tick();
  }
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
