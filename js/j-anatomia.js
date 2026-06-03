//
//  Anatomia JS
//

(function() {
  'use strict';

  var debug = false;

  if ((location.hostname === '') || (location.hostname === 'localhost') || (location.hostname === 'grenaten.local')) {
    debug = true;
    log('Debug mode on');
  }

  var kassaUrl = 'https://nocnasowa.pl/kassa/';

  var elements = {
    orderCount: document.getElementById('order-count'),
    orderMinus: document.getElementById('order-minus'),
    orderPlus: document.getElementById('order-plus'),
    orderLink: document.getElementById('order-link'),
  };

  var orderCount = 1;
  var orderSum = 399;

  var utm = { utmSource: '', utmMedium: '', utmCampaign: '' };


  window.addEventListener('load', init, false);


  //  Init
  function init() {
    log('init');
    if (elements.orderCount) {
      updateOrderCountFromField();
      updateOrderString();
      listenToOrderCount();
    }
    addEventListeners();
    updateUtm();
    initSectionTracking();
    initCoverAnimate();
  }


  //  Update UTM from tracker
  function updateUtm() {
    if (window.ga === undefined) return;

    ga(function(tracker) {
      if (tracker.get('campaignSource') !== undefined) utm.utmSource = tracker.get('campaignSource');
      if (tracker.get('campaignName') !== undefined) utm.utmCampaign = tracker.get('campaignName');
      if (tracker.get('campaignMedium') !== undefined) utm.utmMedium = tracker.get('campaignMedium');
    });
  }


  function addEventListeners() {
    window.addEventListener('click', clickHandler, false);
  }


  //  Click handler
  function clickHandler(event) {
    var target = event.target.closest('.js-plus, .js-minus, .js-slider, .js-opinie');
    if (!target) return;

    log(target);

    if (target.classList.contains('js-plus')) {
      addOrderCount();
      return;
    }
    if (target.classList.contains('js-minus')) {
      substractOrderCount();
      return;
    }
    if (target.classList.contains('js-slider')) {
      event.preventDefault();
      event.stopPropagation();
      sliderMove(target, event);
      return;
    }
    if (target.classList.contains('js-opinie')) {
      event.preventDefault();
      event.stopPropagation();
      openOpinie(target, event);
      return;
    }
  }


  //  Order count
  function addOrderCount() {
    orderCount = parseInt(orderCount) + 1;
    updateOrder();
  }

  function substractOrderCount() {
    orderCount = parseInt(orderCount) - 1;
    updateOrder();
  }

  function updateOrder() {
    checkOrderCount();
    updateOrderSum();
    updateOrderString();
    updateOrderCountField();
  }

  function checkOrderCount() {
    if (orderCount < 1) orderCount = 1;
  }

  function updateOrderCountFromField() {
    if (isNaN(parseInt(elements.orderCount.value)) && (elements.orderCount.value !== '')) {
      orderCount = 1;
      updateOrder();
    } else if (!isNaN(parseInt(elements.orderCount.value)) && parseInt(elements.orderCount.value) !== orderCount) {
      orderCount = elements.orderCount.value;
      updateOrder();
    }
  }

  function updateOrderCountField() {
    elements.orderCount.value = orderCount;
  }

  function updateOrderSum() {
    var newSum = 0;
    if (orderCount < 6) newSum = orderCount * 399;
    else if (orderCount < 11) newSum = orderCount * 349;
    else if (orderCount < 31) newSum = orderCount * 319;
    else if (orderCount > 30) newSum = orderCount * 299;
    orderSum = newSum;
  }

  function updateOrderString() {
    if (!elements.orderLink) return;

    var utmUrl = '';
    if (utm.utmSource.length > 0) utmUrl += '&utm_source=' + utm.utmSource;
    if (utm.utmMedium.length > 0) utmUrl += '&utm_medium=' + utm.utmMedium;
    if (utm.utmCampaign.length > 0) utmUrl += '&utm_campaign=' + utm.utmCampaign;

    var bagx = 'bagx=' + orderCount;
    elements.orderLink.href = kassaUrl + '?' + bagx + utmUrl;
    elements.orderLink.setAttribute('data-ga-label', bagx);
  }

  function listenToOrderCount() {
    elements.orderCount.addEventListener('input', updateOrderCountFromField, false);
  }


  //
  //  Slider — horizontal scroll to a slide
  //
  function sliderMove(target) {
    var targetSlideId = target.getAttribute('href').slice(1);
    var slide = document.getElementById(targetSlideId);
    var sliderId = target.getAttribute('data-ns-slider');
    var slides = document.getElementById(sliderId);
    if (!slide || !slides) return;

    slides.classList.add('anatomia-slides--animating');
    slides.scrollTo({
      left: slide.offsetLeft - slides.offsetLeft,
      behavior: 'smooth',
    });
    setTimeout(function() {
      slides.classList.remove('anatomia-slides--animating');
    }, 600);
  }


  //
  //  Opinie — fade out the open button, slide down hidden paragraphs
  //
  function openOpinie(target) {
    var href = target.getAttribute('href').slice(1);
    var opinia = document.getElementById(href);
    if (!opinia) return;

    var children = opinia.childNodes;

    var fade = target.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 500, easing: 'ease-in-out', fill: 'forwards' }
    );
    fade.onfinish = function() {
      if (target.parentNode) target.parentNode.removeChild(target);
    };

    for (var i = 1, l = children.length; i < l; i++) {
      var p = children[i];
      if (p.tagName && p.className !== 'anatomia-opinie__open-q') {
        slideDown(p, 500);
      }
    }
  }

  function slideDown(el, duration) {
    el.style.display = 'block';
    el.style.overflow = 'hidden';
    var endHeight = el.scrollHeight;
    var anim = el.animate(
      [
        { height: '0px', opacity: 0 },
        { height: endHeight + 'px', opacity: 1 },
      ],
      { duration: duration, easing: 'ease-in-out' }
    );
    anim.onfinish = function() {
      el.style.overflow = '';
    };
  }


  //
  //  Section tracking in header nav (Gumshoe replacement)
  //
  function initSectionTracking() {
    var nav = document.getElementById('navMain');
    if (!nav) return;

    var linksBySection = {};
    var sections = [];

    nav.querySelectorAll('a').forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#' || href.length < 2) return;
      var section = document.getElementById(href.slice(1));
      if (!section) return;
      linksBySection[section.id] = link;
      sections.push(section);
    });

    if (!sections.length) return;

    var activeLink = null;
    function activate(link) {
      if (activeLink === link) return;
      if (activeLink) activeLink.classList.remove('btn-black--active', 'navbar__btn--active');
      link.classList.add('btn-black--active', 'navbar__btn--active');
      activeLink = link;
      scrollNavToActive(nav, link);
    }

    var navHeight = nav.getBoundingClientRect().height;
    var visible = {};

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      //  pick the topmost visible section
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) {
          activate(linksBySection[sections[i].id]);
          return;
        }
      }
    }, {
      rootMargin: '-' + navHeight + 'px 0px -50% 0px',
    });

    sections.forEach(function(section) { observer.observe(section); });
  }

  function scrollNavToActive(nav, link) {
    var navRect = nav.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    if (linkRect.left < navRect.left || linkRect.right > navRect.right) {
      nav.scrollTo({
        left: nav.scrollLeft + (linkRect.left - navRect.left) - (navRect.width - linkRect.width) / 2,
        behavior: 'smooth',
      });
    }
  }


  //
  //  Cover animation (WAAPI replacement for Velocity + scrollama)
  //
  function initCoverAnimate() {
    var svg = document.getElementById('an-website-cover');
    if (!svg) return;

    var maskEl = svg.getElementById('mask-chick');
    var revealEl = svg.getElementById('an-reveal');
    var circle1 = svg.getElementById('circle-1');
    if (!maskEl || !revealEl || !circle1) return;

    var firstAnimation = true;
    var animationNo = 0;
    var circleSide = 'head';
    var pt = svg.createSVGPoint();
    var revealAnim = null;

    //  Trigger when a .step element crosses ~40% from the top
    var stepObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) startOnScrollAnimation();
      });
    }, { rootMargin: '-40% 0px -60% 0px' });

    document.querySelectorAll('.step').forEach(function(step) { stepObserver.observe(step); });

    function animateMask(c) {
      //  fade 0 → 1 over 150ms (ease-in-cubic), then 1 → 0 over 7000ms (ease-out-sine)
      var anim = c.animate(
        [
          { opacity: 0, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' },
          { opacity: 1, offset: 150 / 7150, easing: 'cubic-bezier(0.39, 0.575, 0.565, 1)' },
          { opacity: 0 },
        ],
        { duration: 7150, fill: 'forwards' }
      );
      anim.onfinish = function() {
        if (c.parentNode === maskEl) maskEl.removeChild(c);
      };
    }

    function reveal(event) {
      if (revealAnim) revealAnim.cancel();
      revealAnim = revealEl.animate(
        [
          { opacity: 0, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' },
          { opacity: 1, offset: 450 / 7450, easing: 'cubic-bezier(0.39, 0.575, 0.565, 1)' },
          { opacity: 0 },
        ],
        { duration: 7450, fill: 'forwards' }
      );

      if (event !== undefined) {
        try {
          gtag('event', 'Anatomy Click', { event_category: 'Cover', event_label: 'Reveal' });
        } catch (err) {}
      }
    }

    function createNewCircle(coords) {
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', 150);
      circle.setAttribute('cx', coords.x);
      circle.setAttribute('cy', coords.y);
      circle.setAttribute('opacity', 0);
      circle.setAttribute('fill', 'url(#radialGradient)');
      maskEl.appendChild(circle);
      return circle;
    }

    function createSingleAnimation(event) {
      var coords;
      var label;

      if (event !== undefined) {
        coords = convertCoords({ x: event.clientX, y: event.clientY });
        label = 'X: ' + Math.floor(coords.x) + '; Y: ' + Math.floor(coords.y);
        try {
          gtag('event', 'Anatomy Click', { event_category: 'Cover', event_label: label });
        } catch (err) {}
      } else {
        coords = convertCoords(getRandomCoords());
      }

      var circle = createNewCircle(coords);
      animateMask(circle);

      if (animationNo > 10) {
        reveal(event);
        animationNo = 0;
      }
    }

    function getRandomNum(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function convertCoords(coords) {
      pt.x = coords.x;
      pt.y = coords.y;
      var cursorpt = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { x: cursorpt.x, y: cursorpt.y };
    }

    function getRandomCoords() {
      var rect = svg.getBoundingClientRect();
      var svgWidth = svg.clientWidth;
      var svgHeight = svg.clientHeight;
      var xRange;
      var yRange;

      if (circleSide === 'head') {
        xRange = { min: svgWidth * 0.40, max: svgWidth - (svgWidth * 0.38) };
        yRange = { min: svgHeight * 0.15, max: svgHeight * 0.68 };
        circleSide = 'body';
      } else {
        xRange = { min: svgWidth * 0.15, max: svgWidth - (svgWidth * 0.15) };
        yRange = { min: svgHeight * 0.75, max: svgHeight - (svgHeight * 0.05) };
        circleSide = 'head';
      }

      return {
        x: rect.left + getRandomNum(xRange.min, xRange.max),
        y: rect.top + getRandomNum(yRange.min, yRange.max),
      };
    }

    function easing(p) {
      var m = p - 1;
      return 1 - m * m * m * m;
    }

    function generateIntervals(duration, no) {
      var times = [];
      var linearInterval = duration / (no - 1);
      for (var i = 0; i <= (no - 1); i++) {
        times[i] = easing((linearInterval * i) / duration) * duration;
      }
      return times;
    }

    function startOnScrollAnimation() {
      if (!firstAnimation) return;
      firstAnimation = false;

      var maxCircles = 16;
      var duration = 3200;
      var intervals = generateIntervals(duration, maxCircles);
      var timeSum = 0;

      animateMask(circle1);

      for (var i = 1; i <= maxCircles; i++) {
        if (intervals[i] !== undefined) timeSum = intervals[i];
        var last = (i === maxCircles);
        startTimer(timeSum, last);
      }

      try {
        gtag('event', 'Anatomy Click', { event_category: 'Cover', event_label: 'On Scroll Animation' });
      } catch (err) {}
    }

    function startTimer(time, last) {
      if (last) {
        setTimeout(function() { reveal(); }, time + 50);
      } else {
        setTimeout(function() { createSingleAnimation(); }, time);
      }
    }

    svg.addEventListener('click', function(event) {
      animationNo += 1;
      createSingleAnimation(event);
      event.stopPropagation();
    });
  }


  function log(msg) {
    if (debug) window.console.log(msg);
  }

//  End Anatomia JS
})();


//
//  MailerLite inline subscribe (paper-edition reprint signup)
//
(function() {
  'use strict';

  var wraps = document.querySelectorAll('.js-ml-form-wrap');
  if (!wraps.length) return;

  wraps.forEach(function(wrap) {
    var form = wrap.querySelector('.js-ml-form');
    var success = wrap.querySelector('.js-ml-form-success');
    var error = wrap.querySelector('.js-ml-form-error');
    var button = wrap.querySelector('.js-ml-submit');
    if (!form) return;

    form.addEventListener('submit', function(event) {
      event.preventDefault();

      if (error) error.hidden = true;
      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
      }

      fetch(form.action, {
        method: 'POST',
        mode: 'no-cors',
        body: new FormData(form),
      })
        .then(function() {
          form.hidden = true;
          if (success) success.hidden = false;
          try {
            gtag('event', 'Submit', {
              event_category: 'Submit',
              event_label: 'Powiadom o dodruku',
            });
          } catch (err) {}
        })
        .catch(function() {
          if (error) error.hidden = false;
          if (button) {
            button.disabled = false;
            button.classList.remove('is-loading');
          }
        });
    });
  });
})();
