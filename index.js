
// constants / config
var chartTypeCandleStick = 0
var chartTypeLine = 1

var defaultFont = {
  font: '20px Arial',
  fillStyle: 'Black',
  strokeStyle: '#999',
}

var margin = 8



// methods which are attached to each chart object / context
var proto = {}

proto.candleStick = function (data, color) {
  var range = data.reduce( function (prev, el) {
    if (!prev.minDate || el.date < prev.minDate) prev.minDate = el.date
    if (!prev.maxDate || el.date > prev.maxDate) prev.maxDate = el.date

    if (prev.minVal === undefined || el.low < prev.minVal) prev.minVal = el.low
    if (prev.maxVal === undefined || el.high > prev.maxVal) prev.maxVal = el.high
    return prev
  }, {})

  this.data.push({
    data: data,
    range: range,
    color: color,
    type: chartTypeCandleStick,
  })

  return this
}


proto.line = function (data, color) {
  var range = data.reduce( function (prev, el) {
    if (!prev.minDate || el.date < prev.minDate) prev.minDate = el.date
    if (!prev.maxDate || el.date > prev.maxDate) prev.maxDate = el.date

    if (prev.minVal === undefined || el.val < prev.minVal) prev.minVal = el.val
    if (prev.maxVal === undefined || el.val > prev.maxVal) prev.maxVal = el.val
    return prev
  }, {})

  this.data.push({
    data: data,
    range: range,
    color: color,
    type: chartTypeLine,
  })

  return this
}


proto.draw = function () {
  var ctx = this.ctx
  var $el = this.$el
  var data = this.data

  var globRange = getGlobalRange(data)
  var canvasRange = {
    maxX: $el.clientWidth * 2 - margin * 2,
    maxY: $el.clientHeight * 2 - margin * 2,

    minX: margin * 2,
    minY: margin * 2,
  }

  var xf = (canvasRange.maxX - canvasRange.minX) / (globRange.maxDate - globRange.minDate)
  var yf = (canvasRange.maxY - canvasRange.minY) / (globRange.maxVal - globRange.minVal)

  var lineCoordinateGrps = this.data
    .filter( function (grp) {
      return grp.type === chartTypeLine
    })
    .map( function (grp) {
      grp.coordinates = grp.data.map( function (el) {
        return [
          (el.date - globRange.minDate) * xf + canvasRange.minX,
          canvasRange.maxY - (el.val - globRange.minVal) * yf,
        ]
      })
      return grp
    })


  var md = globRange.minDate
  var minDateCeiled = new Date(md.getFullYear(), md.getMonth(), md.getDate() + 1)
  var oneDayMs = 24 * 60 * 60 * 1000

  var dates = []
  for (var date = minDateCeiled.getTime(); date < globRange.maxDate.getTime(); date += oneDayMs) {
    dates.push(new Date(date))
  }

  var dateCoordinates = dates
    .map( function (date) {
      return {
        val: date,
        x: (date - globRange.minDate) * xf + canvasRange.minX,
      }
    })


  var stickCoordinateGrps = this.data
    .filter( function (grp) {
      return grp.type === chartTypeCandleStick
    })
    .map( function (grp) {
      grp.coordinates = grp.data.map( function (el) {
        var xVals = {
          low: canvasRange.maxY - (el.low - globRange.minVal) * yf,
          open: canvasRange.maxY - (el.open - globRange.minVal) * yf,
          close: canvasRange.maxY - (el.close - globRange.minVal) * yf,
          high: canvasRange.maxY - (el.high - globRange.minVal) * yf,
        }

        return [
          (el.date - globRange.minDate) * xf + canvasRange.minX,
          xVals,
        ]
      })
      return grp
    })


  drawAxes(ctx, canvasRange)
  drawXAxis(ctx, dateCoordinates, canvasRange)
  drawCandleSticks(ctx, stickCoordinateGrps)
  drawLines(ctx, lineCoordinateGrps)
}


var drawXAxis = function (ctx, dateCoordinates, canvasRange) {
  ctx.beginPath()
  extend(ctx, defaultFont)

  dateCoordinates.forEach( function (el, i) {
    if (i % 10 === 0) {
      ctx.moveTo(el.x, canvasRange.maxY - 5)
      ctx.lineTo(el.x, canvasRange.maxY + 5)
      ctx.stroke()

      var dtStr = el.val.getDate() + '.' + (el.val.getMonth() + 1) + '.'
      ctx.fillText(dtStr, el.x + 4, canvasRange.maxY + 16)
    }
  })
}


var drawAxes = function (ctx, canvasRange) {
  ctx.beginPath()
  ctx.strokeStyle = '#999'
  ctx.fillStyle = '#999'

  ctx.moveTo(canvasRange.minX, canvasRange.maxY)
  ctx.lineTo(canvasRange.maxX, canvasRange.maxY)
  ctx.stroke()

  ctx.moveTo(canvasRange.maxX - 8, canvasRange.maxY - 8)
  ctx.lineTo(canvasRange.maxX - 8, canvasRange.maxY + 8)
  ctx.lineTo(canvasRange.maxX + 16, canvasRange.maxY)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(canvasRange.minX, canvasRange.maxY)
  ctx.lineTo(canvasRange.minX, canvasRange.minY)
  ctx.stroke()

  ctx.moveTo(canvasRange.minX - 8, canvasRange.minY + 8)
  ctx.lineTo(canvasRange.minX + 8, canvasRange.minY + 8)
  ctx.lineTo(canvasRange.minX, canvasRange.minY - 16)
  ctx.fill()
}


var drawCandleSticks = function (ctx, coordinateGrps) {
  coordinateGrps.forEach( function (drawing, i) {
    ctx.beginPath()
    ctx.strokeStyle = drawing.color || '#000'
    ctx.fillStyle = drawing.color || '#000'

    drawing.coordinates
      .forEach( function (c) {
        // since everything is inverted => invert check aswell
        if (c[1].open > c[1].close) {
          ctx.moveTo(c[0], c[1].low)
          ctx.lineTo(c[0], c[1].open)

          ctx.moveTo(c[0], c[1].close)
          ctx.lineTo(c[0], c[1].high)
          ctx.stroke()

          ctx.strokeRect(c[0] - 5, c[1].open, 10, c[1].close - c[1].open)
          return
        }

        ctx.moveTo(c[0], c[1].low)
        ctx.lineTo(c[0], c[1].close)

        ctx.moveTo(c[0], c[1].open)
        ctx.lineTo(c[0], c[1].high)
        ctx.stroke()

        ctx.fillRect(c[0] - 5, c[1].close, 10, c[1].open - c[1].close)
      })
  })
}


var drawLines = function (ctx, coordinateGrps) {
  coordinateGrps.forEach( function (drawing, i) {
    ctx.beginPath()
    ctx.strokeStyle = drawing.color || '#000'

    drawing.coordinates
      .slice(0, 1)
      .forEach( function (c) {
        ctx.moveTo.apply(ctx, c)
      })

    drawing.coordinates
      .slice(1)
      .forEach( function (c) {
        ctx.lineTo.apply(ctx, c)
      })

    ctx.stroke()
  })
}


var getGlobalRange = function (dt) {
  return dt
    .slice(1)
    .reduce( function (prev, el) {
      if (el.range.minDate < prev.minDate) prev.minDate = el.range.minDate
      if (el.range.maxDate > prev.maxDate) prev.maxDate = el.range.maxDate

      if (el.range.minVal < prev.minVal) prev.minVal = el.range.minVal
      if (el.range.maxVal > prev.maxVal) prev.maxVal = el.range.maxVal
      return prev
    }, dt[0].range)
}

// utility function
var extend = function (o1, o2) {
  Object.keys(o2).forEach( function (key) {
    o1[key] = o2[key]
  })
  return o1
}


// publicly available method
exports.setContext = function ($el) {
  $el.height = $el.clientHeight * 2
  $el.width = $el.clientWidth * 2

  var ctx = $el.getContext('2d')
  ctx.lineWidth = 1

  var o = {
    $el: $el,
    ctx: ctx,
    data: [],
  }

  return extend(o, proto)
}

