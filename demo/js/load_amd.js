require(['js/jquery.gridList.js'], function() {
  var lanesSize = 3;
  $(window).resize(function() {
    $('#grid').gridList('reflow');
  });

  var flashItem = function($item) {
    // Hack to flash changed items visually
    $item.addClass('changed')
    setTimeout(function() {
      $item.removeClass('changed');
    }, 50);
  }

  $.ajax({
    url: "demo.json",
    success: function(resp) {
      $('#grid').gridList({
          initialItems: resp,
          direction: 'horizontal',
          lanes: 3,
          widthHeightRatio: 264 / 294,
          onChange: function(changedItems, _newItems) {
            console.log("onChange:" + changedItems);
          }
        },
        {
          cancel: '.content'
        });
    },
    error: function() {
      alert("error");
    }
  })

  $(".add-item").click(function(e) {
    var ele = e.target;
    switch ($(ele).attr("widgetType")) {
      case 'refreshFromOutSide':
        break;
      case 'iframe':
        var url = "http://www.baidu.com";
        var id = "id_" + new Date().getTime();
        var item = {w: 2, h: 2, x: 1000, y: 0, widgetType: 'iframe', url: url, id: id};
        $('#grid').gridList('addItem', item);
        break;
      case 'url':
        var url = "widgets/widget_1.html?param1=a";
        var id = "id_" + new Date().getTime();
        var item = {w: 2, h: 2, x: 1000, y: 0, widgetType: 'url', url: url, id: id, data: {"param2": "b"}};
        $('#grid').gridList('addItem', item, {});
        break;
    }
  })
  //
  $('.add-row').click(function(e) {
    e.preventDefault();
    $('#grid').gridList('resize', ++lanesSize);
  });
  $('.remove-row').click(function(e) {
    e.preventDefault();
    $('#grid').gridList('resize', --lanesSize);
  });
})

//$(function() {
//
//});
