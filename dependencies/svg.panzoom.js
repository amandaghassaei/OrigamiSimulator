/*!
* svg.panzoom.js - A plugin for svg.js that enables panzoom for viewport elements
* @version 1.1.1
* https://github.com/svgdotjs/svg.panzoom.js#readme
*
* @copyright Ulrich-Matthias Schäfer
* @license MIT
*/;
;(function() {
"use strict";

var normalizeEvent = function(ev) {
  if(!ev.touches) {
    ev.touches = [{clientX: ev.clientX, clientY: ev.clientY}]
  }

  return ev.touches
}

SVG.extend(SVG.Doc, SVG.Nested, {

  panZoom: function(options) {
    this.off('.panZoom')

    // when called with false, disable panZoom
    if(options === false) return this

    options = options || {}
    var zoomFactor = options.zoomFactor || 0.03
    var zoomMin = options.zoomMin || Number.MIN_VALUE
    var zoomMax = options.zoomMax || Number.MAX_VALUE

    var lastP, lastTouches, zoomInProgress = false

    var wheelZoom = function(ev) {
      ev.preventDefault()

      // touchpads can give ev.deltaY == 0, which skews the lvl calculation
      if(ev.deltaY == 0) return

      var lvl = this.zoom() - zoomFactor * ev.deltaY/Math.abs(ev.deltaY)
        , p = this.point(ev.clientX, ev.clientY)

      if(lvl > zoomMax)
        lvl = zoomMax

      if(lvl < zoomMin)
        lvl = zoomMin

      this.zoom(lvl, p)
    }

    var pinchZoomStart = function(ev) {
      lastTouches = normalizeEvent(ev)

      if(lastTouches.length < 2) return
      ev.preventDefault()

      if(this.fire('pinchZoomStart', {event: ev}).event().defaultPrevented)
        return

      this.off('touchstart.panZoom', pinchZoomStart)

      zoomInProgress = true
      SVG.on(document, 'touchmove.panZoom', pinchZoom, this, {passive:false})
      SVG.on(document, 'touchend.panZoom', pinchZoomStop, this, {passive:false})
    }

    var pinchZoomStop = function(ev) {
      ev.preventDefault()
      zoomInProgress = false

      this.fire('pinchZoomEnd', {event: ev})

      SVG.off(document,'touchmove.panZoom', pinchZoom)
      SVG.off(document,'touchend.panZoom', pinchZoomStop)
      this.on('touchstart.panZoom', pinchZoomStart)
    }

    var pinchZoom = function(ev) {
      ev.preventDefault()

      var currentTouches = normalizeEvent(ev)
        , zoom = this.zoom()

      // Distance Formula
      var lastDelta = Math.sqrt(
        Math.pow(lastTouches[0].clientX - lastTouches[1].clientX, 2) +
        Math.pow(lastTouches[0].clientY - lastTouches[1].clientY, 2)
      )

      var currentDelta = Math.sqrt(
        Math.pow(currentTouches[0].clientX - currentTouches[1].clientX, 2) +
        Math.pow(currentTouches[0].clientY - currentTouches[1].clientY, 2)
      )

      var zoomAmount = lastDelta/currentDelta

      if((zoom < zoomMin && zoomAmount > 1) || (zoom > zoomMax && zoomAmount < 1))
        zoomAmount = 1

      var currentFocus = {
        x: currentTouches[0].clientX + 0.5 * (currentTouches[1].clientX - currentTouches[0].clientX),
        y: currentTouches[0].clientY + 0.5 * (currentTouches[1].clientY - currentTouches[0].clientY)
      }

      var lastFocus = {
        x: lastTouches[0].clientX + 0.5 * (lastTouches[1].clientX - lastTouches[0].clientX),
        y: lastTouches[0].clientY + 0.5 * (lastTouches[1].clientY - lastTouches[0].clientY)
      }

      var p = this.point(currentFocus.x, currentFocus.y)
      var focusP = this.point(2*currentFocus.x-lastFocus.x, 2*currentFocus.y-lastFocus.y)
      var box = new SVG.Box(this.viewbox()).transform(
        new SVG.Matrix()
          .translate(p.x, p.y)
          .scale(zoomAmount, 0, 0)
          .translate(-focusP.x, -focusP.y)
      )

      this.viewbox(box)

      lastTouches = currentTouches

      this.fire('zoom', {box: box, focus: focusP})
    }

    var panStart = function(ev) {
      ev.preventDefault()

      this.off('mousedown.panZoom', panStart)

      lastTouches = normalizeEvent(ev)

      if(zoomInProgress) return

      this.fire('panStart', {event: ev})

      lastP = {x: lastTouches[0].clientX, y: lastTouches[0].clientY }

      SVG.on(document, 'mousemove.panZoom', panning, this)
      SVG.on(document, 'mouseup.panZoom', panStop, this)
    }

    var panStop = function(ev) {
      ev.preventDefault()

      this.fire('panEnd', {event: ev})

      SVG.off(document,'mousemove.panZoom', panning)
      SVG.off(document,'mouseup.panZoom', panStop)
      this.on('mousedown.panZoom', panStart)
    }

    var panning = function(ev) {
      ev.preventDefault()

      var currentTouches = normalizeEvent(ev)

      var currentP = {x: currentTouches[0].clientX, y: currentTouches[0].clientY }
        , p1 = this.point(currentP.x, currentP.y)
        , p2 = this.point(lastP.x, lastP.y)
        , deltaP = [p2.x - p1.x, p2.y - p1.y]
        , box = new SVG.Box(this.viewbox()).transform(new SVG.Matrix().translate(deltaP[0], deltaP[1]))

      this.viewbox(box)
      lastP = currentP
    }

    this.on('wheel.panZoom', wheelZoom)
    this.on('touchstart.panZoom', pinchZoomStart, this, {passive:false})
    this.on('mousedown.panZoom', panStart, this)

    return this

  },

  zoom: function(level, point) {
    var style = window.getComputedStyle(this.node)
      , width = parseFloat(style.getPropertyValue('width'))
      , height = parseFloat(style.getPropertyValue('height'))
      , v = this.viewbox()
      , zoomX = width / v.width
      , zoomY = height / v.height
      , zoom = Math.min(zoomX, zoomY)

    if(level == null) {
      return zoom
    }

    var zoomAmount = zoom / level
    if(zoomAmount === Infinity) zoomAmount = Number.MIN_VALUE

    point = point || new SVG.Point(width/2 / zoomX + v.x, height/2 / zoomY + v.y)

    var box = new SVG.Box(v)
      .transform(new SVG.Matrix()
        .scale(zoomAmount, point.x, point.y)
      )

    if(this.fire('zoom', {box: box, focus: point}).event().defaultPrevented)
      return this

    return this.viewbox(box)
  }
})

SVG.extend(SVG.FX, {
  zoom: function(level, point) {
    return this.add('zoom', [new SVG.Number(level)].concat(point || []))
  }
})
}());
