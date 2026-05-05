import { Component } from 'nhsuk-frontend'

/**
 * Sticky component
 */
export class Sticky extends Component {
  /**
   * @param {HTMLElement} $root - HTML element to use for component
   */
  constructor($root) {
    super($root)

    this.stickyElement = $root

    const stickyElementStyle = window.getComputedStyle($root)
    this.stickyElementTop = parseInt(stickyElementStyle.top, 10)

    this.throttledStickyState = this.throttle(this.determineStickyState, 100)
    window.addEventListener('scroll', this.throttledStickyState)

    this.determineStickyState = this.determineStickyState.bind(this)
    this.determineStickyState()

    // Support stuck details elements
    this.detailsElement = $root.closest('details')
    if (this.detailsElement) {
      this.handleDetailsToggle = this.handleDetailsToggle.bind(this)
      this.detailsElement.addEventListener('toggle', this.handleDetailsToggle)
    }
  }

  /**
   * Name for the component used when initialising using data-module attributes
   */
  static moduleName = 'app-sticky'

  /**
   * Determine element’s sticky state
   */
  determineStickyState() {
    const currentTop = this.stickyElement.getBoundingClientRect().top
    const isStuck = currentTop <= this.stickyElementTop

    // Only act when the stuck state actually changes
    const wasStuck = this.stickyElement.dataset.stuck === 'true'
    if (isStuck === wasStuck) {
      return
    }

    // Becoming unstuck — no compensation needed
    if (!isStuck) {
      this.stickyElement.dataset.stuck = 'false'
      return
    }

    // About to become stuck — capture height before the class/style change
    const heightBefore = this.stickyElement.getBoundingClientRect().height

    this.stickyElement.dataset.stuck = 'true'

    // Measure height after the attribute change
    const heightAfter = this.stickyElement.getBoundingClientRect().height
    const top = heightBefore - heightAfter

    if (top !== 0) {
      window.scrollBy({ top, behavior: 'instant' })
    }
  }

  /**
   * Handle scroll position for expandable details elements
   */
  handleDetailsToggle() {
    if (!this.detailsElement) {
      return
    }

    let contentHeightBeforeClose = 0
    if (this.detailsElement.open) {
      // Details is open - store current state
      contentHeightBeforeClose = this.detailsElement.scrollHeight
    } else {
      // Details is closed - calculate and apply scroll adjustment
      const currentScrollY = window.scrollY
      const newContentHeight = this.detailsElement.scrollHeight
      const heightDifference = contentHeightBeforeClose - newContentHeight

      const elementTop =
        this.stickyElement.getBoundingClientRect().top + window.scrollY

      // If we’re scrolled past where the content used to be, adjust scroll
      if (currentScrollY > elementTop && heightDifference > 0) {
        const top = Math.max(
          elementTop - this.stickyElementTop,
          currentScrollY - heightDifference
        )

        window.scrollTo({ top, behavior: 'smooth' })
      }
    }
  }

  /**
   * Throttle
   *
   * @param {(...args: unknown[]) => void} callback - Function to throttle
   * @param {number} limit - Minimum time interval (in milliseconds)
   * @returns {(...args: unknown[]) => void} Throttled function
   */
  throttle(callback, limit) {
    /** @type {boolean | undefined} */
    let inThrottle

    return (...args) => {
      if (!inThrottle) {
        callback.apply(this, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}
