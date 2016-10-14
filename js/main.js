/* global $ callbackOptionChange */
var _options = {
  showKBRow: true
};

$(document).ready(function () {
  $('#btnOptions').click(function () {
    $('#modalOptions').modal('show');
  });

  setOptionModalAttributes();
});

function setOptionModalAttributes () {
  $('#modalOptions').on('shown', function () {
    $('#optKBRow').attr('checked', _options.showKBRow);
  });

  $('#option-cancel').click(function () {
    $('#modalOptions').modal('hide');
  });

  $('#option-submit').on('click', function (e) {
    e.preventDefault();
    $('#option-form').submit();
  });

  $('#option-form').on('submit', function () {
    _options.showKBRow = $('#optKBRow').is(':checked');
    callbackOptionChange(); // Take actions based on new options
    $('#modalOptions').modal('hide');
    return false;
  });
}

