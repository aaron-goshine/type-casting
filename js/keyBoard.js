/*  KBHMan manages both the keyboard and the hands  */
/* global $ */
var KBHMan = {
  curActive: 27,
  init: function () {
    this.KB.init();
    this.Hands.init();
  },

  setActive: function (keycode) {
    this.KB.reset(this.curActive);
    this.Hands.setActive(keycode);
    this.KB.setActive(keycode, this.Hands.shift);  // Coz KB doesn't know which Shift is to be highlighted
    this.curActive = keycode;
  },

  pressKey: function (keycode) {
    this.KB.pressKey(keycode);
  },

  unpressKey: function (keycode) {
    this.KB.unpressKey(keycode);
  },

  show: function () {
  },

  hide: function () {
  },

  KB: {
    keyarray: [],
    $keys: [],
    shiftkeys: [],
    shifted: false,

    init: function () {
       // Prepare an array of all key codes
      this.keyarray = [8, 9, 13, 16, 17, 18, 20, 27, 186, 187, 188, 189, 190, 191, 190, 192, 219, 220, 221, 222];
      for (var i = 32; i <= 125; i++) this.keyarray.push(i);

       //  Populate $keys[] with key objects
      for (var j = 0; j < this.keyarray.length; j++) {
        this.$keys[this.keyarray[j]] = $('#keyboard .c' + this.keyarray[j]) || $('#keyboard .c0');
      };

      this.shiftkeys[0] = $('.shiftleft');
      this.shiftkeys[9] = $('.shiftright');
    },

    setActive: function (keycode, shift) {
      if (keycode === 0) return;
      this.$keys[keycode].addClass('current');
      if (shift >= 0) {
        this.shiftkeys[shift].addClass('current');
        this.shifted = true;
      }
    },

    reset: function (keycode) {
      if (keycode === 0) return;
      this.$keys[keycode].removeClass('current');
      if (this.shifted) {
        this.shiftkeys[0].removeClass('current');
        this.shiftkeys[9].removeClass('current');
        this.shifted = false;
      }
    },

    pressKey: function (keycode) {
      this.$keys[keycode].addClass('keydown');
    },

    unpressKey: function (keycode) {
      this.$keys[keycode].removeClass('keydown');
    }
  },

  Hands: {
    left: null,
    right: null,
    canvW: 175,
    canvH: 250,
    fing: [],
    keyfings: [],
    shiftkeys: [],
    shift: -1,

    init: function () {
      var lcanv = $('#leftCanvas')[0];
      var rcanv = $('#rightCanvas')[0];
      lcanv.width = this.canvW;
      lcanv.height = this.canvH;
      rcanv.width = this.canvW;
      rcanv.height = this.canvH;
      this.left = lcanv.getContext('2d');
      this.right = rcanv.getContext('2d');
      this.shiftkeys = [33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 58, 60, 62, 63, 64, 94, 123, 124, 125, 126];

       //  fingers to highlight for each key
      var fingkeys = [];
      fingkeys[0] = [49, 97, 65, 113, 81, 122, 90, 33];
      fingkeys[1] = [50, 115, 83, 119, 87, 120, 88];
      fingkeys[2] = [51, 100, 68, 101, 69, 99, 67];
      fingkeys[3] = [102, 70, 114, 82, 103, 71, 116, 84, 52, 53, 118, 86, 98, 66];
      fingkeys[4] = [32];
      fingkeys[5] = [32];
      fingkeys[6] = [54, 55, 104, 72, 106, 74, 121, 89, 117, 85, 110, 78, 109, 77];
      fingkeys[7] = [56, 107, 75, 105, 73, 44];
      fingkeys[8] = [57, 108, 76, 111, 79, 46];
      fingkeys[9] = [48, 59, 112, 80, 47, 63, 39, 58, 34, 45];

      for (var i = 0; i < 10; i++) {
        for (var j = 0; j < fingkeys[i].length; j++) {
          this.keyfings[fingkeys[i][j]] = i;
        }
      }

      this.fing[0] = new this.Finger(this.left, 19, 26, 180, 9, 100);
      this.fing[1] = new this.Finger(this.left, 21, 51, 147, 38, 55);
      this.fing[2] = new this.Finger(this.left, 22, 78, 147, 78, 40);
      this.fing[3] = new this.Finger(this.left, 22, 110, 147, 120, 55);
      this.fing[4] = new this.Finger(this.left, 24, 127, 188, 158, 120);
      this.fing[5] = new this.Finger(this.right, 24, 46, 188, 15, 120);
      this.fing[6] = new this.Finger(this.right, 22, 63, 147, 53, 55);
      this.fing[7] = new this.Finger(this.right, 22, 95, 147, 95, 40);
      this.fing[8] = new this.Finger(this.right, 21, 122, 147, 135, 55);
      this.fing[9] = new this.Finger(this.right, 21, 146, 180, 165, 100);
      this.redraw(-1);
    },

    redraw: function (x, y) {
      if (y === undefined) y = -1;
      this.clear();
      for (var i = 0; i < 10; i++) {
        if (i !== x && i !== y) {
          this.fing[i].reset();
        } else {
          this.fing[i].setActive();
        }
      }

      this.drawPalms();
    },

    show: function () {
    },

    hide: function () {
    },

    clear: function () {
      var c = this.left;
      c.fillStyle = 'white';
      c.fillRect(0, 0, this.canvW, this.canvH);
      c.fill();

      c = this.right;
      c.fillStyle = 'white';
      c.fillRect(0, 0, this.canvW, this.canvH);
      c.fill();
    },

    setActive: function (keycode) {
      var i = this.keyfings[keycode];
      this.shift = -1;
      if (keycode === 32) {
        this.redraw(4, 5);
      } else if ((keycode >= 65 && keycode <= 90) || ($.inArray(keycode, this.shiftkeys) >= 0)) {
        this.shift = i >= 5 ? 0 : 9;
        this.redraw(i, this.shift);
      } else {
        this.redraw(i);
      }
    },

    drawPalms: function () {
      var c = this.left;
      var pi = Math.PI;

      c.fillStyle = 'grey';
      c.beginPath();
      c.arc(78, 180, 60, 5 * pi / 6, pi / 6, false);
      c.closePath();
      c.fill();

      c = this.right;

      c.fillStyle = 'grey';
      c.beginPath();
      c.arc(95, 180, 60, 5 * pi / 6, pi / 6, false);
      c.closePath();
      c.fill();
    },

    Finger: function (ctx, width, ax, ay, bx, by) {
      this.ctx = ctx;
      this.width = width;
      this.ax = ax;
      this.ay = ay;
      this.bx = bx;
      this.by = by;

      this.isActive = false;

      this.setActive = function () {
        this.ctx.strokeStyle = 'skyblue';
        this.draw();
      };

      this.reset = function () {
        this.ctx.strokeStyle = 'grey';
        this.draw();
      };

      this.draw = function () {
        var c = this.ctx;
        c.beginPath();
        c.moveTo(this.ax, this.ay);
        c.lineTo(this.bx, this.by);
        c.lineWidth = this.width;
        c.lineCap = 'round';
        c.stroke();
      };
    }
  }
};
