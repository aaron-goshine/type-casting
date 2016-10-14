/* global $ KBHMan  selectedCategoryId selectedCategoryId:true currentStringId:true jQuery
currentString:true _options lessonListAjax_url
*/
var STATE = {
  INITIAL: {value: 0, label: 'Start typing or press [Esc] to skip lesson'},
  TYPING: {value: 1, label: 'Press [ESC] to pause'},
  FINISHED: {value: 2, label: 'Press [ENTER] to continue or [R] to restart'},
  PAUSED: {value: 3, label: 'Resume typing or press [Esc] to skip lesson'},
  MODAL: {value: 4, label: '[ENTER]: Continue_____[R]: Restart _____[ESC]: Close'},
  END: {value: 5, label: 'Course complete!'}
};

var categories = {
  BASIC: '1',
  PRAC: '2',
  PROG: '3'
};

var stringPosition = 0;
var stringMaxPosition = 0;
var skipSpecialKey = [];
var start = null;
var lastPause = null;
var time = null;
var errorCount = 0;
var intervalObject = null;
var eState = null;
var lessonList = [];
var remainingStrings = [];
var sizeClass;
var typableChars = [];

$(document).ready(function () {
  changeState(STATE.INITIAL);
  KBHMan.init();

  loadLessonListForCategory(selectedCategoryId);

  setupAttributes();
  $('#category_' + selectedCategoryId).trigger('click');
});

function setupAttributes () {
  $(document).keyup(function (event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    return onKeyUp(event, keycode);
  }).keydown(function (event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    return onKeyDown(event, keycode);
  }).keypress(function (event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    return onKeyPress(event, keycode);
  });

  $(window).resize(function () {
    onResizeWindow();
  });

  $('.category').click(function () {
    if (!$(this).hasClass('active')) {
      var elementId = $(this).attr('id').split('_');
      var categoryId = elementId[1];
      selectedCategoryId = categoryId;
      loadLessonListForCategory(selectedCategoryId);
    }
    setCurrentButtonActive();
  });

  $('#modalLessonComplete').on('shown', function () {
    changeState(STATE.MODAL);
  }).on('hidden', function () {
    console.log(eState === STATE.MODAL);
    if (eState === STATE.MODAL) {
      changeState(STATE.FINISHED);
    }
  });

  $('#modalKey').html(formatLabel(STATE.MODAL.label));
}

function setCurrentButtonActive () {
  $('.category').each(function () {
    $(this).removeClass('active');
  });
  $('button #category_' + selectedCategoryId).addClass('active');
}

function onKeyPress (event, keycode) {
  event.preventDefault();
  if (keycode === 27) return;

  if (eState === STATE.END) {
    return;
  } else if (eState === STATE.INITIAL) {
    resetCounters();
    startTimer();
  } else if (eState === STATE.PAUSED) {
    resumeTimer();
  } else if (eState === STATE.FINISHED) {
    if (keycode === 13) { // Enter pressed
      proceedToNextString();
    } else if (keycode === 82 || keycode === 114) { // R pressed
      resetCounters();
      startTimer();
    } else {
      animateInfoLabel();
    }
    return;
  } else if (eState === STATE.MODAL) {
    if (keycode === 13) { // Enter pressed
      $('#modalLessonComplete').modal('hide');
      proceedToNextString();
    } else if (keycode === 27) { // Esc pressed
      $('#modalLessonComplete').modal('hide');
      changeState(STATE.FINISHED);
    } else if (keycode === 82 || keycode === 114) { // R pressed
      $('#modalLessonComplete').modal('hide');
      resetCounters();
      changeState(STATE.INITIAL);
    } else if (keycode === 76 || keycode === 108) { // L pressed
      $('#modalLessonComplete').modal('hide');
      currentStringId === 9999; // Hack to force moving into next lesson
      proceedToNextString();
    }
    return;
  }

  if ($.inArray(keycode, skipSpecialKey) < 0) {
    if (keycode === Number($('#character_' + stringPosition).attr('ascii'))) {
      addClassCorrect(stringPosition);
    } else {
      errorCount++;
      addClassIncorrect(stringPosition);
    }

    getTime(start);
    updateStats();

    if (stringPosition === stringMaxPosition) {
      stopTimer(intervalObject);
      showCompletionMessage();
      changeState(STATE.FINISHED);
    }

    removeCurrentCharacter(stringPosition);

    if (eState === STATE.FINISHED) return;

    do {
      stringPosition++;
    } while (typableChars.indexOf(stringPosition) < 0);
    setCurrentCharacter(stringPosition);
    KBHMan.setActive(getCharacterAscii(getCurrentCharacter(stringPosition)));
    return false;
  }
}

function onKeyUp (event, keycode) {
  event.preventDefault(); // necessary?
  KBHMan.unpressKey(keycode);
  if (eState === STATE.INITIAL || eState === STATE.PAUSED) {
    if (keycode === 27) { // Esc pressed
      proceedToNextString();
      return false;
    }
  }

  if (eState === STATE.TYPING) {
    if (keycode === 27) { // Esc pressed
      updateStats();
      stopTimer(intervalObject);
      changeState(STATE.PAUSED);
      return false;
    } else if (keycode === 8) { // Backspace pressed
      if (stringPosition === 0) return;
      stringPosition--;
      KBHMan.setActive(getCharacterAscii(getCurrentCharacter(stringPosition)));
      // set typingText
      removeCurrentCharacter(stringPosition + 1);
      setCurrentCharacter(stringPosition);
      // update stats
      getTime(start);
      updateStats();
      return false;
    }
  }
}

function onKeyDown (event, keycode) {
  KBHMan.pressKey(keycode);
  if (keycode === 8) return;
}

function changeState (state) {
  eState = state;
  $('#top_label').html(formatLabel(state.label));
  if (state === STATE.FINISHED || state === STATE.END) {
    KBHMan.setActive(0); // Remove the active key
  }
}

function resetCounters () {
  stringPosition = 0;
  errorCount = 0;

  setSkipSpecialKey();
  populateSpans(currentString);
  setCurrentCharacter(stringPosition);
  KBHMan.setActive(getCharacterAscii(getCurrentCharacter(stringPosition)));
  stopTimer(intervalObject);

  $('#timer').text('00:00');
}

function updateStats () {
  $('#wpm').text(getWordsPerMinute());
  $('#accuracy').text(getAccuracy() + '%');
}

function getErrorCount () {
  return errorCount;
}

function getCharacterCount () {
  return getStringPosition();
}

function getWordCount () {
  return getCharacterCount() / 5;
}

function startTimer () {
  start = new Date();

  intervalObject = setInterval(function () {
    $('#timer').text(getTime(start));
    updateStats();
  }, 1000);

  changeState(STATE.TYPING);
}

function stopTimer (intervalObject) {
  lastPause = new Date();
  clearInterval(intervalObject);
}

function resumeTimer () {
  var now = new Date();
  start = now - (lastPause - start);

  intervalObject = setInterval(function () {
    $('#timer').text(getTime(start));
    updateStats();
  }, 1000);

  changeState(STATE.TYPING);
}

function getTime (startTime) {
  var now = new Date();
  time = ((now - startTime) / 1000).toFixed(2);
  var minutes = Math.floor(((now - startTime) / 1000).toFixed(0) / 60);
  var seconds = ((now - startTime) / 1000).toFixed(0) % 60;
  return ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);
}

function setSkipSpecialKey () {
  skipSpecialKey[0] = 8; // backspace
}

function getStringPosition () {
  return stringPosition;
}

function setStringPosition (position) {
  stringPosition = position;
}

function resetLastKeyType (position) {
  if (position > 0) {
    position--;
  }
  return position;
}

function getWordsPerMinute () {
  var wordsPerMinute = 0;
  if (time > 0) {
    wordsPerMinute = ((getWordCount() * 60) / time).toFixed(0);
  }
  return wordsPerMinute;
}

function getAccuracy () {
  var accuracy = 0;
  if (getStringPosition() > 0) {
    accuracy = 100 - (getErrorCount() * 100 / getCharacterCount());
  }
  return accuracy < 0 ? 0 : accuracy.toFixed(0);
}

function showCompletionMessage () {
  $('#modalWPM').text(getWordsPerMinute() + ' words per minute');
  $('#modalAccuracy').text(getAccuracy() + '%');
  updateTweetButton();

  if (getAccuracy() >= 95) {
    $('#modalError').hide();
  } else {
    $('#modalError').show();
  }

  $('#modalKey').html(formatLabel(STATE.MODAL.label));
  $('#modalLessonComplete').modal('show');
}

function populateSpans (str) {
  $('#typingText').empty(); // Remove old text, if any
  typableChars = [];

  for (var i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    if (c === '¶') {
      addNewline(i);
    } else if (c === '¬') {
      addTab();
    } else {
      addSpan(c, i);
    }
  }
  stringMaxPosition = str.length - 1;
};

function addSpan (ch, id) {
  jQuery('<span/>', {
    id: 'character_' + id,
    class: sizeClass,
    ascii: getCharacterAscii(ch),
    text: ch
  }).appendTo('#typingText');
  typableChars.push(id);
}

function addNewline (id) {
  jQuery('<span/>', {
    id: 'character_' + id,
    class: 'newline',
    ascii: 13,
    text: '↩'
  }).appendTo('#typingText');
  jQuery('<br/>').appendTo('#typingText');
  typableChars.push(id);
}

function addTab () {
  $('#typingText').append('&nbsp;&nbsp;&nbsp;&nbsp;');
}

function addClassCorrect (position) {
  var $element = $('#character_' + position);
  $element.removeClass('incorrect current');
  $element.addClass('correct');
}

function addClassIncorrect (position) {
  var $element = $('#character_' + position);
  if ($element.text() === ' ') {
    $element.css('text-decoration', 'underline');
  }
  $element.removeClass('correct current');
  $element.addClass('incorrect');
}

function getCurrentCharacter (position) {
  return currentString.charAt(position);
};

function setCurrentCharacter (position) {
  var $element = $('#character_' + position);
  $element.removeClass('correct pending');
  $element.addClass('current');

  if ($element.hasClass('incorrect')) {
    errorCount--;
    $element.removeClass('incorrect');
  }

  $element.css('text-decoration', 'none');

  $('#character_' + (position + 1)).addClass('pending');
}

function removeCurrentCharacter (position) {
  $('#character_' + position).removeClass('current');
}

function getCharacterAscii (character) {
  return character.charCodeAt(0);
}

function loadLessonListForCategory (categoryId) {
  var result;
  $('#typingText').html('');
  $('#typingText').addClass('ac_loading');
  $.ajax({
    type: 'GET',
    url: lessonListAjax_url + '0' + categoryId + '.json',
    data: '',
    dataType: 'json',
    success: function (data) {
      generateLessonDropDown(data);
      callbackOptionChange(); // reload options
      $('#typingText').removeClass('ac_loading');
    }
  });
}

function generateLessonDropDown (data) {
  var dropDown = '<select id="' + 'lesson' + '">';
  $.each(data, function (i, item) {
    lessonList[i] = item.lessonString;
    dropDown = dropDown + '<option value="' + i + '">' + item.name + '</option>';
  });
  dropDown = dropDown + '</select>';
  $('#top_left').html(dropDown);

  // Show/hide keyboard row
  if (selectedCategoryId === categories.PROG) {
    $('#keyboardContainerRow').hide();
    $('#typingText').css('text-align', 'left').css('font-family', '"Courier New",Courier,monospace');
    sizeClass = 'pending sizeb';
  } else {
    $('#keyboardContainerRow').show();
    $('#typingText').css('text-align', 'center').css('font-family', 'inherit');
    sizeClass = 'pending sizea';
  }

  $('#lesson').prop('selectedIndex', 0); // Select the first option in the dropdown
  currentStringId = -1;
  remainingStrings = [];
  proceedToNextString();

  $('#lesson').bind('change', function () {  // On lesson dropdown change
    var selectedLesson = $('#lesson').val();
    currentStringId = -1;
    remainingStrings = [];
    proceedToNextString();
    $(this).blur(); // To remove focus from dropdown
  });
}

function setCurrentString (stringNumber, string) {
  currentStringId = stringNumber;
  currentString = string;
  resetCounters();
  resetStatus();
  onResizeWindow();
  changeState(STATE.INITIAL);
}

function resetStatus () {
  $('#wpm').text('-');
  $('#accuracy').text('-');
}

function proceedToNextString () {
  var selectedLesson = $('#lesson').val();
  var lessonStringCount = lessonList[parseInt(selectedLesson, 10)].length;

  // Learn mode -- change string sequentially
  if (selectedCategoryId === categories.BASIC) {
    var nextStringId = currentStringId + 1;
    if (lessonStringCount > nextStringId) {
      setCurrentString(nextStringId, lessonList[selectedLesson][nextStringId].text);
    } else { // proceed to next level
      var curVal = $('#lesson').val();
      if (curVal !== $('#lesson option:last-child').val()) {
        $('#lesson').prop('selectedIndex', parseInt(curVal, 10) + 1);
        setCurrentString(0, lessonList[parseInt(curVal, 10) + 1][0].text);
      } else {
        changeState(STATE.END);
      }
    }
  } else if (selectedCategoryId >= categories.PRAC) {
    if (remainingStrings.length < 1) {
      remainingStrings = lessonList[selectedLesson].slice(0); // Populate from lessonList
    }
    var nextStrId = Math.floor(Math.random() * remainingStrings.length);
    setCurrentString(nextStrId, remainingStrings[nextStrId].text);
    remainingStrings.splice(nextStrId, 1); // Remove used string
  }
}

// Nobody uses this fn atm. Leaving in case it'd be of use later.
function getNextLessonName () {
  // Returns "" if there's no next lesson
  return $("#lesson option[value='" + (parseInt($('#lesson').val(), 10) + 1) + "']").text();
}

function formatLabel (label) {
  return label.replace(/\[/g, "<strong class='label'>").replace(/\]/g, '</strong>').replace(/_/g, '&nbsp;');
}

function onResizeWindow () {
  if ($(document).width() < 1200) {
    $('.span2').hide();
    $('#keyboardContainerRow').addClass('colapsedKeyBoard');
  } else {
    $('.span2').show();
    $('#keyboardContainerRow').removeClass('colapsedKeyBoard');
  }

  // Control footer position
  if ($(window).height() < 620) {
    if (selectedCategoryId === categories.PROG) { // Code mode needs special care
      var $txt = $('div.span8');

      var tmp = $txt.css('overflow'); // Hack for Firefox (scrollHeight behavior)
      $txt.css('overflow', 'scroll');
      var x = parseInt($txt[0].scrollHeight, 10) - parseInt($txt.height(), 10);
      var y = $(window).height() - parseInt($txt.offset().top, 10) - parseInt($txt.height(), 10);
      $txt.css('overflow', tmp);

      if (x < y) {
        x = y - 50; // When $txt.height is low, stick footer to bottom
      }

      $('#footer').css('position', 'static').css('margin-top', x);
    } else if (_options.showKBRow) {
      $('#footer').css('position', 'relative').css('margin-top', '20px');
    } else {
      $('#footer').css('position', 'absolute').css('margin-top', '-40px');
    }
  } else {
    $('#footer').css('position', 'absolute').css('margin-top', '-40px');
  }
}

function animateInfoLabel () {
  var lbl = $('#top_label');
  lbl.stop().animate({ width: '95%'}, 150, function () {
    lbl.animate({ width: '100%'}, 150, function () {
      lbl.animate({ width: '95%'}, 150, function () {
        lbl.animate({ width: '100%'}, 150, function () {
          lbl.animate({ width: '95%'}, 150, 1);
        }).removeClass('label-important').addClass('label-info');
      });
    });
  }).removeClass('label-info').addClass('label-important');
}

function updateTweetButton () {
}

function callbackOptionChange () {
  var o = _options;
  if (o.showKBRow) {
    if (selectedCategoryId !== categories.PROG) {
      $('#keyboardContainerRow').show();
    }
  } else {
    $('#keyboardContainerRow').hide();
  }
  onResizeWindow();
}
