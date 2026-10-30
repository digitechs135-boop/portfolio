/* ================================================================
   PORTFOLIO — MAIN.JS
   Handles: preloader, smooth scroll (Lenis), GSAP scroll-triggered
   reveals, nav behaviour, mobile menu, and local-time clock.
   ================================================================ */

;(function () {
  'use strict'

  /* ---------------------------------------------------------------
     0. REDUCED-MOTION GUARD
     --------------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

  /* ---------------------------------------------------------------
     1. PRELOADER
     --------------------------------------------------------------- */
  const preloader = document.getElementById('preloader')
  const preloaderBar = preloader?.querySelector('.preloader__bar')
  let preloaderHandled = false

  function hidePreloader() {
    if (!preloader || preloaderHandled) return
    preloaderHandled = true
    // Animate the bar to 100 %
    if (typeof gsap !== 'undefined') {
      gsap.to(preloaderBar, {
        width: '100%',
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          preloader.classList.add('is-done')
          document.body.style.overflow = ''
          // Once transition ends, remove from DOM
          preloader.addEventListener('transitionend', () => {
            preloader.remove()
          })
          // Start entrance animations
          animateHero()
        },
      })
    } else {
      preloader.remove()
      animateHero()
    }
  }

  // External fonts and animation libraries should not keep the page covered.
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(hidePreloader, prefersReducedMotion ? 0 : 1200)
  }, { once: true })

  window.addEventListener('load', () => {
    // Small delay so the bar animation is visible
    setTimeout(hidePreloader, prefersReducedMotion ? 0 : 300)
  })

  /* ---------------------------------------------------------------
     2. LENIS SMOOTH SCROLL
     --------------------------------------------------------------- */
  let lenis = null

  function initLenis() {
    if (typeof Lenis === 'undefined' || prefersReducedMotion) return

    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    })

    // Connect Lenis to GSAP ticker so ScrollTrigger stays in sync
    if (typeof gsap !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000)
      })
      gsap.ticker.lagSmoothing(0)
    } else {
      function raf(time) {
        lenis.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
    }
  }

  initLenis()

  /* ---------------------------------------------------------------
     3. GSAP + SCROLLTRIGGER SETUP
     --------------------------------------------------------------- */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
  }

  /* ---------------------------------------------------------------
     4. HERO ENTRANCE ANIMATION
     --------------------------------------------------------------- */
  function animateHero() {
    // Standalone pages such as the Work listing have no homepage hero.
    if (!document.querySelector('.hero')) {
      initScrollReveals()
      return
    }

    if (typeof gsap === 'undefined' || prefersReducedMotion) {
      document
        .querySelectorAll('.hero .reveal-up, .hero__line-inner')
        .forEach((el) => {
          el.style.opacity = '1'
          el.style.transform = 'none'
        })
      initScrollReveals()
      return
    }

    // Set initial states
    gsap.set('.hero__line-inner', { y: '110%' })
    gsap.set('.hero__line', { opacity: 0, y: 40 })
    gsap.set('.hero__eyebrow', { opacity: 0, y: 24 })
    gsap.set('.hero__details', { opacity: 0, y: 24 })
    gsap.set('.hero__portrait', { opacity: 0, x: 32 })
    gsap.set('.hero__scroll-indicator', { opacity: 0, y: 20 })

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: initScrollReveals,
    })

    tl.to('.hero__eyebrow', {
      opacity: 1,
      y: 0,
      duration: 0.7,
    })
      .to(
        '.hero__line-inner',
        {
          y: '0%',
          duration: 1.1,
          stagger: 0.1,
          ease: 'power4.out',
        },
        '-=0.4'
      )
      .to(
        '.hero__line',
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
        },
        '-=0.95'
      )
      .to(
        '.hero__details',
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
        },
        '-=0.6'
      )
      .to(
        '.hero__portrait',
        {
          opacity: 1,
          x: 0,
          duration: 1.1,
          ease: 'power3.out',
        },
        '-=0.5'
      )
      .to(
        '.hero__scroll-indicator',
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
        },
        '-=0.5'
      )
  }

  /* ---------------------------------------------------------------
     5. SCROLL-TRIGGERED REVEALS
     --------------------------------------------------------------- */
  function initScrollReveals() {
    if (typeof gsap === 'undefined' || prefersReducedMotion) {
      document.querySelectorAll('.reveal-up').forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
      return
    }

    // Select all reveal-up elements NOT inside .hero (hero is handled above)
    const revealEls = document.querySelectorAll(
      '.works .reveal-up, .services .reveal-up, .footer .reveal-up, .case-study-page .reveal-up, .about-page .reveal-up'
    )

    revealEls.forEach((el) => {
      gsap.to(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          end: 'top 60%',
          toggleActions: 'play none none none',
        },
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
      })
    })

    // Stagger project cards within each row
    document.querySelectorAll('.works__row').forEach((row) => {
      const cards = row.querySelectorAll('.project-card')
      if (cards.length > 1) {
        gsap.to(cards, {
          scrollTrigger: {
            trigger: row,
            start: 'top 85%',
          },
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.15,
          ease: 'power3.out',
        })
      }
    })

    // Stagger service cards
    const serviceCards = document.querySelectorAll('.service-card')
    if (serviceCards.length) {
      gsap.to(serviceCards, {
        scrollTrigger: {
          trigger: '.services__grid',
          start: 'top 85%',
        },
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }

    // Footer CTA — special larger animation
    const footerTitle = document.querySelector('.footer__title')
    if (footerTitle) {
      gsap.fromTo(
        footerTitle,
        { opacity: 0, y: 60, scale: 0.96 },
        {
          scrollTrigger: {
            trigger: '.footer__cta',
            start: 'top 80%',
          },
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.1,
          ease: 'power3.out',
        }
      )
    }
  }

  /* ---------------------------------------------------------------
     6. POINTER INTERACTIONS
     --------------------------------------------------------------- */
  function initPointerEffects() {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const portrait = document.querySelector('.hero__portrait')
    const cursorFollower = document.getElementById('cursorFollower')
    if (!finePointer || prefersReducedMotion) return

    document.body.classList.add('has-pointer-effects')
    let activeCard = null

    function resetPointerEffects() {
      document.body.classList.remove('has-pointer-effects')
      cursorFollower?.classList.remove('is-visible')
      cursorFollower?.classList.remove('is-over-image')
      activeCard?.classList.remove('is-hovered')
      activeCard = null
      if (portrait) portrait.style.translate = '0 0'
    }

    document.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return
      document.body.classList.add('has-pointer-effects')
      if (cursorFollower) {
        cursorFollower.style.left = `${event.clientX}px`
        cursorFollower.style.top = `${event.clientY}px`
        cursorFollower.classList.add('is-visible')
      }

      const target = event.target instanceof Element ? event.target : null
      const imageSurface = target?.closest(
        '.project-card__image-wrap, .showcase-banner__viewport, .hero__portrait, img, video'
      )
      cursorFollower?.classList.toggle('is-over-image', Boolean(imageSurface))
      const projectLink = target?.closest('.project-card__link')

      if (projectLink) {
        const card = projectLink.closest('.project-card')
        if (card !== activeCard) {
          activeCard?.classList.remove('is-hovered')
          card?.classList.add('is-hovered')
          activeCard = card
        }
      } else {
        activeCard?.classList.remove('is-hovered')
        activeCard = null
      }

      const imageWrap = target?.closest('.project-card__image-wrap')
      if (imageWrap) {
        const bounds = imageWrap.getBoundingClientRect()
        imageWrap.style.setProperty('--hover-x', `${event.clientX - bounds.left}px`)
        imageWrap.style.setProperty('--hover-y', `${event.clientY - bounds.top}px`)
      }

      const hero = target?.closest('.hero')
      if (hero) {
        const bounds = hero.getBoundingClientRect()
        const x = (event.clientX - bounds.left) / bounds.width
        const y = (event.clientY - bounds.top) / bounds.height
        if (portrait) {
          const shiftX = (x - 0.5) * -12
          const shiftY = (y - 0.5) * -12
          portrait.style.translate = `${shiftX}px ${shiftY}px`
        }
      } else {
        if (portrait) portrait.style.translate = '0 0'
      }
    }, { passive: true })

    document.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget) resetPointerEffects()
    })
    window.addEventListener('blur', resetPointerEffects)
  }

  initPointerEffects()

  /* ---------------------------------------------------------------
     6B. WORK FILTERS
     --------------------------------------------------------------- */
  function initWorkFilters() {
    const filters = Array.from(document.querySelectorAll('[data-work-filter]'))
    if (!filters.length || !document.querySelector('.project-card[data-category]')) return
    const hasAllFilter = filters.some((filter) => filter.dataset.workFilter === 'all')
    let hasAppliedHomeFilter = false
    const applyCategory = (category) => {
      document.querySelectorAll('.project-card[data-category]').forEach((card) => {
        const categories = card.dataset.category.split(/\s+/)
        card.hidden = category !== 'all' && !categories.includes(category)
      })
    }

    const initiallySelected = filters.find((filter) => filter.classList.contains('is-active'))
    if (initiallySelected?.dataset.workFilter === 'all') applyCategory('all')

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        const category = !hasAllFilter && hasAppliedHomeFilter && button.classList.contains('is-active')
          ? 'all'
          : button.dataset.workFilter
        if (!hasAllFilter) hasAppliedHomeFilter = category !== 'all'
        filters.forEach((filter) => {
          const isActive = category !== 'all' && filter === button
          filter.classList.toggle('is-active', isActive)
          filter.setAttribute('aria-pressed', String(isActive))
        })
        applyCategory(category)
      })
    })
  }

  initWorkFilters()

  /* ---------------------------------------------------------------
     7. NAVIGATION BEHAVIOUR
     --------------------------------------------------------------- */
  const nav = document.getElementById('nav')
  let lastScrollY = 0
  let ticking = false

  function updateNav() {
    const currentScrollY = window.scrollY || document.documentElement.scrollTop

    if (currentScrollY > lastScrollY && currentScrollY > 200) {
      // Scrolling down past threshold — hide nav
      nav.classList.add('is-hidden')
    } else {
      // Scrolling up or near top — show nav
      nav.classList.remove('is-hidden')
    }

    lastScrollY = currentScrollY
    ticking = false
  }

  // Use Lenis scroll event if available, otherwise native
  if (lenis) {
    lenis.on('scroll', ({ scroll }) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = scroll
          if (currentScrollY > lastScrollY && currentScrollY > 200) {
            nav.classList.add('is-hidden')
          } else {
            nav.classList.remove('is-hidden')
          }
          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    })
  } else {
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          requestAnimationFrame(updateNav)
          ticking = true
        }
      },
      { passive: true }
    )
  }

  /* ---------------------------------------------------------------
     7. MOBILE MENU TOGGLE
     --------------------------------------------------------------- */
  const navToggle = document.getElementById('navToggle')
  const navMenu = document.getElementById('navMenu')

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.classList.toggle('is-open')
      navMenu.classList.toggle('is-open')
      navToggle.setAttribute('aria-expanded', isOpen)
      document.body.style.overflow = isOpen ? 'hidden' : ''

      // Pause / resume Lenis
      if (lenis) {
        isOpen ? lenis.stop() : lenis.start()
      }
    })

    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('is-open')
        navMenu.classList.remove('is-open')
        navToggle.setAttribute('aria-expanded', 'false')
        document.body.style.overflow = ''
        if (lenis) lenis.start()
      })
    })
  }

  /* ---------------------------------------------------------------
     8. LOCAL TIME CLOCK
     --------------------------------------------------------------- */
  const timeEl = document.getElementById('localTime')

  function updateClock() {
    if (!timeEl) return
    const now = new Date()
    // PLACEHOLDER: Change the timezone to match your city
    // Examples: 'America/New_York', 'Europe/London', 'Asia/Tokyo'
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }
    timeEl.textContent = now.toLocaleTimeString('en-GB', options)
  }

  updateClock()
  setInterval(updateClock, 1000)

  /* ---------------------------------------------------------------
     9. CURRENT YEAR
     --------------------------------------------------------------- */
  const yearEl = document.getElementById('currentYear')
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear()
  }

  /* ---------------------------------------------------------------
     10. SMOOTH ANCHOR SCROLLING (via Lenis)
     --------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href')
      if (targetId === '#') return

      const target = document.querySelector(targetId)
      if (!target) return

      e.preventDefault()

      if (lenis) {
        lenis.scrollTo(target, { offset: -80 })
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })

  /* ---------------------------------------------------------------
     11. KEYBOARD ACCESSIBILITY
     --------------------------------------------------------------- */
  // Ensure project cards are keyboard-navigable
  document.querySelectorAll('.project-card__link').forEach((card) => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        card.click()
      }
    })
  })

  // Trap focus in mobile menu when open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu?.classList.contains('is-open')) {
      navToggle.click()
      navToggle.focus()
    }
  })
})()
