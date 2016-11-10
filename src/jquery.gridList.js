// It does not try to register in a CommonJS environment since jQuery is not
// likely to run in those environments.
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'gridlist'], factory);
  } else {
    factory(jQuery, GridList);
  }
}(function($, GridList) {

  var DraggableGridList = function(element, options, draggableOptions) {
    this.options = $.extend({}, this.defaults, options);
    this.draggableOptions = $.extend(
      {}, this.draggableDefaults, draggableOptions);

    this.$element = $(element);
    this.$preparedChangingItem = null;
    this.items = [];
    this._buildElements();
    this._init();
    this._bindEvents();
  };

  DraggableGridList.prototype = {

    defaults: {
      lanes: 5,
      direction: "horizontal",
      itemSelector: 'li[data-w]',
      widthHeightRatio: 1,
      dragAndDrop: true
    },

    draggableDefaults: {
      zIndex: 2,
      scroll: false,
      containment: "parent",
      cancel: '.content'
    },

    _buildElements: function() {
      var _this = this;

      this.$zoom = $('<div class="zoom"> <a class="resize" data-w="1" data-h="1">1x1</a>' +
        '<a class="resize" data-w="1" data-h="2">1x2</a>' +
        '<a class="resize" data-w="1" data-h="3">1x3</a>' +
        '<a class="resize" data-w="2" data-h="1">2x1</a>' +
        '<a class="resize" data-w="2" data-h="2">2x2</a>' +
        '<a class="resize" data-w="2" data-h="3">2x3</a>' +
        '<a class="resize" data-w="3" data-h="1">3x1</a>' +
        '<a class="resize" data-w="3" data-h="2">3x2</a>' +
        '<a class="resize" data-w="3" data-h="3">3x3</a>' +
        '</div>');

      $(document.body).append(this.$zoom);

      for (var i = 0; i < this.options.initialItems.length; i++) {
        var item = this.options.initialItems[i];
        var $item = this._createElement(item);
        this.items.push({
          $element: $item,
          x: Number(item.x),
          y: Number(item.y),
          w: Number(item.w),
          h: Number(item.h),
          id: item.id,
          widgetType: item.widgetType,
          url: item.url,
          data: item.data
        })
        this.$element.append($item);
        switch (item.widgetType) {
          case 'url':
            _this._addUrlContent(item, $item);
            break;
          case 'iframe':
            _this._addIframeContent(item, $item);
            break;
          default:
            break;
        }
      }
    },

    destroy: function() {
      this._unbindEvents();
      this.$zoom.remove();
      this.$zoom = null;
      this.$items.remove();
      this.$items = null;
    },

    _init: function() {
      // Read items and their meta data. Ignore other list elements (like the
      // position highlight)
      this.$items = this.$element.children(this.options.itemSelector);
      //this.items = this._generateItemsFromDOM();
      this._widestItem = Math.max.apply(
        null, this.items.map(function(item) {
          return item.w;
        }));
      this._tallestItem = Math.max.apply(
        null, this.items.map(function(item) {
          return item.h;
        }));

      // Used to highlight a position an element will land on upon drop
      this.$positionHighlight = this.$element.find('.position-highlight').hide();

      this._initGridList();
      this.reflow();

      if (this.options.dragAndDrop) {
        // Init Draggable JQuery UI plugin for each of the list items
        // http://api.jqueryui.com/draggable/
        this.$items.draggable(this.draggableOptions);
      }
    },

    _initGridList: function() {
      // Create instance of GridList (decoupled lib for handling the grid
      // positioning and sorting post-drag and dropping)
      this.gridList = new GridList(this.items, {
        lanes: this.options.lanes,
        direction: this.options.direction
      });
    },

    _bindMethod: function(fn) {
      /**
       * Bind prototype method to instance scope (similar to CoffeeScript's fat
       * arrow)
       */
      var that = this;
      return function() {
        return fn.apply(that, arguments);
      };
    },

    _bindEvents: function() {
      this._onStart = this._bindMethod(this._onStart);
      this._onDrag = this._bindMethod(this._onDrag);
      this._onStop = this._bindMethod(this._onStop);
      //this.$items.on('dragstart', this._onStart);
      //this.$items.on('drag', this._onDrag);
      //this.$items.on('dragstop', this._onStop);

      this.$element.on('dragstart', 'li[data-id]', this._onStart);
      this.$element.on('drag', 'li[data-id]', this._onDrag);
      this.$element.on('dragstop', 'li[data-id]', this._onStop);

      this._removeItem = this._bindMethod(this._removeItem);
      this.$element.on('click', 'li .icon.close', this._removeItem);

      this._showZoom = this._bindMethod(this._showZoom);
      this.$element.on('click', 'li .icon.resize', this._showZoom);

      this._hideZoom = this._bindMethod(this._hideZoom);
      $(document.body).on('click', this._hideZoom);

      this._resizeItem = this._bindMethod(this._resizeItem);
      $('body .zoom .resize').on('click', this._resizeItem);

      this._refreshItem = this._bindMethod(this._refreshItem);
      this.$element.on('click', 'li .icon.refresh', this._refreshItem);

      this._openSettings = this._bindMethod(this._openSettings);
      this.$element.on('click', 'li .icon.settings', this._openSettings);
    },

    _unbindEvents: function() {
      //this.$items.off('dragstart', this._onStart);
      //this.$items.off('drag', this._onDrag);
      //this.$items.off('dragstop', this._onStop);

      this.$element.off('dragstart', 'li[data-id]', this._onStart);
      this.$element.off('drag', 'li[data-id]', this._onDrag);
      this.$element.off('dragstop', 'li[data-id]', this._onStop);

      this.$element.off('click', 'li .icon.close', this._removeItem);
      this.$element.off('click', 'li .icon.resize', this._showZoom);
      $(document.body).off('click', this._hideZoom);
      $('body .zoom .resize').off('click', this._resizeItem);
      this.$element.off('click', 'li .icon.refresh', this._refreshItem);
      this.$element.off('click', 'li .icon.settings', this._openSettings);
    },

    _resizeItem: function(e) {
      e.preventDefault();
      var itemElement = this.$preparedChangingItem,
        itemWidth = $(e.currentTarget).data('w'),
        itemHeight = $(e.currentTarget).data('h');
      this.resizeItem(itemElement, {
        w: itemWidth,
        h: itemHeight
      })

    },

    _hideZoom: function(e) {
      var ele = e.target;
      if (ele.className.indexOf("zoom") == -1) {
        $("body .zoom").css("display", "none");
      }
    },

    _showZoom: function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.$preparedChangingItem = $(e.currentTarget).closest('li');
      this.$zoom.css({
        left: e.pageX,
        top: e.pageY + 20,
        display: 'block'
      });
    },

    _onStart: function(event, ui) {
      console.log("drag start");
      // Create a deep copy of the items; we use them to revert the item
      // positions after each drag change, making an entire drag operation less
      // distructable
      this._createGridSnapshot();

      // Since dragging actually alters the grid, we need to establish the number
      // of cols (+1 extra) before the drag starts

      this._maxGridCols = this.gridList.grid.length;
    },

    _onDrag: function(event, ui) {
      var item = this._getItemByElement(ui.helper),
        newPosition = this._snapItemPositionToGrid(item);

      if (this._dragPositionChanged(newPosition)) {
        this._previousDragPosition = newPosition;

        // Regenerate the grid with the positions from when the drag started
        GridList.cloneItems(this._items, this.items);
        this.gridList.generateGrid();

        // Since the items list is a deep copy, we need to fetch the item
        // corresponding to this drag action again
        item = this._getItemByElement(ui.helper);
        this.gridList.moveItemToPosition(item, newPosition);

        // Visually update item positions and highlight shape
        this._applyPositionToItems();
        this._highlightPositionForItem(item);
      }
    },

    _onStop: function(event, ui) {
      this._updateGridSnapshot();
      this._previousDragPosition = null;

      // HACK: jQuery.draggable removes this class after the dragstop callback,
      // and we need it removed before the drop, to re-enable CSS transitions
      $(ui.helper).removeClass('ui-draggable-dragging');

      this._applyPositionToItems();
      this._removePositionHighlight();
    },

    _createElement: function(item) {
      var srDiv = '';
      if(item.showRefresh) {
        srDiv +=  '<div title="Refresh" class="icon refresh"></div>';
      }
      if(item.showSettings) {
        srDiv +=  '<div title="Settings" class="icon settings"></div>';
      }

      return $(
        '<li>' +
        '<div class="inner">' +
        '<div class="controls">' +
        '<div title="Close" class="icon close"></div>' +
        '<div title="Resize" class="icon resize"></div>' +
        srDiv +
        '</div>' +
        '<div class="content">' +
        '</div>' +
        '</div>' +
        '</li>'
      ).attr({
        'data-w': item.w,
        'data-h': item.h,
        'data-x': item.x,
        'data-y': item.y,
        'data-id': item.id,
        'widgetType': item.widgetType,
        'url': item.url
      })
    },

    _addCard: function(item, $item) {
      this.$element.append($item);
      if (this.options.dragAndDrop) {
        $item.draggable(this.draggableOptions);
      }
      //this._unbindEvents();
      this.$items.push($item.get(0));
      //this.items.push({
      //  $element: $item,
      //  x: Number($item.attr('data-x')),
      //  y: Number($item.attr('data-y')),
      //  w: Number($item.attr('data-w')),
      //  h: Number($item.attr('data-h')),
      //  id: $item.attr('data-id'),
      //  widgetType: $item.attr('widgetType'),
      //  url: $item.attr('url'),
      //  data: item.data
      //})

      this.items.push({
        $element: $item,
        x: Number(item.x),
        y: Number(item.y),
        w: Number(item.w),
        h: Number(item.h),
        id: item.id,
        widgetType: item.widgetType,
        url: item.url,
        data: item.data
      })
      //this._bindEvents();
      this.resize(this.options.lanes);
      this.reflow();
    },

    _addUrlContent: function(item, $item) {
      var _this = this;

      $.ajax({
        url: item.url,
        success: function(resp) {
          var data = item.data || {};
          var reg = new RegExp("{id}", "g");

          if (item.url && item.url.indexOf("?") != -1) {
            var search = item.url.substring(item.url.indexOf("?") + 1);
            var params = search.split("&");
            for (var i = 0, l = params.length; i < l; i++) {
              var p = params[i].split("=");
              data[p[0]] = p[1];
            }
          }

          if (item.data) {
            for (var key in item.data) {
              data[key] = item.data[key];
            }
          }

          for (var key in data) {
            var pattern = "{" + key + "}";
            resp = resp.replace(new RegExp(pattern, "g"), data[key]);
          }
          resp = resp.replace(reg, item.id);
          var widgetContent = $(resp);
          $item.find(".content").append(widgetContent);
          _this.$element.append($item);
        },
        error: function() {
          console.error("_addUrlContent");
        }
      })
    },

    _addIframeContent: function(item, $item) {
      var $iframe = $("<iframe style='border-width: 0px; width: 100%; height: 100%; box-sizing: border-box; position: absolute; left: 0px; top: 0px;' src=" + item.url + "/>");
      $item.find(".content").append($iframe);
    },

    addItem: function(item, options) {

      var maxXW = 0, maxYH = 0;
      for (var i = 0; i < this.items.length; i++) {
        var itemC = this.items[i];
        if (maxXW < itemC.w + itemC.x) {
          maxXW = itemC.w + itemC.x;
        }
        if (maxYH < itemC.h + itemC.y) {
          maxYH = itemC.y + itemC.h;
        }
      }

      if (this.options.direction == 'horizontal') {
        item.x = maxXW;
        item.y = 0;
      } else {
        item.y = maxYH;
        item.x = 0
      }

      var _this = this;
      if (item) {
        var $item = this._createElement(item);
        switch (item.widgetType) {
          case 'iframe':
            _this._addIframeContent(item, $item);
            break;
          case 'url':
            _this._addUrlContent(item, $item);
            break;
          case 'table':
            var $table = $('<table cellpadding="0" cellspacing="0" border="0" class="display sDashboardTableView table table-bordered"></table>')
            $item.find(".content").append($table);
            var tableDef = {};
            if (options && options.data) {
              $.extend(tableDef, options && options.data ? options.data : {});
              tableDef["bJQueryUI"] = true;
              $table.dataTable(tableDef);
            } else {
              //$.ajax({
              //  url: item.url,
              //  success: function(resp) {
              //    resp["bJQueryUI"] = true;
              //    $table.dataTable(resp);
              //  }
              //})
              _this._addTableContent(item, $item);
            }
            break;
          default:
            break;
        }
        _this._addCard(item, $item);

        //if (this.options.dragAndDrop) {
        //  // Init Draggable JQuery UI plugin for each of the list items
        //  // http://api.jqueryui.com/draggable/
        //  $element.draggable(this.draggableOptions);
        //}
        //this.destroy();
        //this.$items.push($element.get(0));
        //this.items.push({
        //  $element: $element,
        //  x: Number($element.attr('data-x')),
        //  y: Number($element.attr('data-y')),
        //  w: Number($element.attr('data-w')),
        //  h: Number($element.attr('data-h')),
        //  id: Number($element.attr('data-id'))
        //})
        //this._bindEvents();
        //this.resize(this.options.lanes);
      }
    },

    _removeItem: function(e) {
      e.preventDefault();
      var $element = $(e.currentTarget).closest('li');
      $element.remove();
      for (var i = this.$items.length - 1; i >= 0; i--) {
        var $item = $(this.$items[i]);
        if ($item.attr("data-id") == $element.attr("data-id")) {
          this.$items.splice(i, 1);
          break;
        }
      }
      for (var i = this.items.length - 1; i >= 0; i--) {
        var item = this.items[i];
        if (this.items[i].id == $element.attr("data-id")) {
          this.items.splice(i, 1);
          break;
        }
      }
      delete dashboard_widget[$element.attr("data-id")];
      //this.$items = _this.$element.children(_this.options.itemSelector);
      //this.items = _this._generateItemsFromDOM();
      //this.gridList.items = _this.items;
      this.resize(this.options.lanes);
    },

    _openSettings: function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $itemElement = $(e.currentTarget).closest('li');
      if ($itemElement.attr("widgetType") == "url") {
        var $dialog = this.$element.children("#dialog");
        if ($dialog.length == 0) {
          this.$element.append($("<div id='dialog' style='display: none;'></div>"))
          $dialog = this.$element.children("#dialog");
        }
        var _this = this;
        $.get($itemElement.attr("url").substring(0, $itemElement.attr("url").indexOf(".html")) + "_settings.html", function(html) {
          var id = $itemElement.attr("data-id") + "_settings";
          html = html.replace(new RegExp("{id}", "g"), $itemElement.attr("data-id") + "_settings");
          $dialog.html();
          $dialog.append($(html));
          $dialog.dialog({
            autoOpen: true,
            width: 500,
            height: 300,
            modal: true,
            close: function() {
              $(this).remove()
            },
            buttons: {
              "OK": function() {
                var data = $("#" + id).triggerHandler("submit")
                _this.refreshItem($itemElement, data)
                $(this).dialog("close");
              },
              "cancel": function() {
                $(this).dialog("close");
              }
            }
          })
        })
      } else {
        this.refreshItem($itemElement);
      }
    },

    _refreshItem : function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $itemElement = $(e.currentTarget).closest('li');
      if ($itemElement.attr("widgetType") == "url") {
        this.refreshItem($itemElement);
      }
    },

    refreshItem: function($liElement, data) {
      var id = $liElement.attr("data-id");

      if(data) {
        for (var i = 0; i < this.items.length; i++) {
          if (this.items[i].id == id) {
            this.items[i].data = data;
            break;
          }
        }

        if (typeof(this.options.onChange) != 'function') {
          return;
        }
        this.options.onChange.call(
          this, null, this.items);
      }

      $("#" + id).trigger("onRefresh", data || {'param1': "p1", "param2": "p2"});

    },

    //remove
    resize: function(lanes) {
      if (lanes) {
        this.options.lanes = lanes;
      }
      this._createGridSnapshot();
      this.gridList.resizeGrid(this.options.lanes);
      this._updateGridSnapshot();

      this.reflow();
    },

    resizeItem: function(element, size) {
      /**
       * Resize an item.
       *
       * @param {Object} size
       * @param {Number} [size.w]
       * @param {Number} [size.h}
       */

      this._createGridSnapshot();
      this.gridList.resizeItem(this._getItemByElement(element), size);
      this._updateGridSnapshot();

      this.render();
    },

    reflow: function() {
      this._calculateCellSize();
      this.render();
    },

    render: function() {
      this._applySizeToItems();
      this._applyPositionToItems();
    },

    _generateItemsFromDOM: function() {
      /**
       * Generate the structure of items used by the GridList lib, using the DOM
       * data of the children of the targeted element. The items will have an
       * additional reference to the initial DOM element attached, in order to
       * trace back to it and re-render it once its properties are changed by the
       * GridList lib
       */
      var _this = this,
        items = [],
        item;
      this.$items.each(function(i, element) {
        items.push({
          $element: $(element),
          x: Number($(element).attr('data-x')),
          y: Number($(element).attr('data-y')),
          w: Number($(element).attr('data-w')),
          h: Number($(element).attr('data-h')),
          id: $(element).attr('data-id'),
          widgetType: $(element).attr('widgetType'),
          url: $(element).attr('url')
        });
      });
      return items;
    },

    _getItemByElement: function(element) {
      // XXX: this could be optimized by storing the item reference inside the
      // meta data of the DOM element
      for (var i = 0; i < this.items.length; i++) {
        if (this.items[i].$element.is(element)) {
          return this.items[i];
        }
      }
    },

    _calculateCellSize: function() {
      if (this.options.direction === "horizontal") {
        this._cellHeight = Math.floor(this.$element.height() / this.options.lanes);
        this._cellWidth = this._cellHeight * this.options.widthHeightRatio;
      } else {
        this._cellWidth = Math.floor(this.$element.width() / this.options.lanes);
        this._cellHeight = this._cellWidth / this.options.widthHeightRatio;
      }
      if (this.options.heightToFontSizeRatio) {
        this._fontSize = this._cellHeight * this.options.heightToFontSizeRatio;
      }
    },

    _getItemWidth: function(item) {
      return item.w * this._cellWidth;
    },

    _getItemHeight: function(item) {
      return item.h * this._cellHeight;
    },

    _applySizeToItems: function() {
      for (var i = 0; i < this.items.length; i++) {
        this.items[i].$element.css({
          width: this._getItemWidth(this.items[i]),
          height: this._getItemHeight(this.items[i])
        });
      }
      if (this.options.heightToFontSizeRatio) {
        this.$items.css('font-size', this._fontSize);
      }
    },

    _applyPositionToItems: function() {
      // TODO: Implement group separators
      for (var i = 0; i < this.items.length; i++) {
        // Don't interfere with the positions of the dragged items
        if (this.items[i].move) {
          continue;
        }
        this.items[i].$element.css({
          left: this.items[i].x * this._cellWidth,
          top: this.items[i].y * this._cellHeight
        });
      }
      // Update the width of the entire grid container with enough room on the
      // right to allow dragging items to the end of the grid.
      if (this.options.direction === "horizontal") {
        this.$element.width(
          (this.gridList.grid.length + this._widestItem) * this._cellWidth);
      } else {
        this.$element.height(
          (this.gridList.grid.length + this._tallestItem) * this._cellHeight);
      }
    },

    _dragPositionChanged: function(newPosition) {
      if (!this._previousDragPosition) {
        return true;
      }
      return (newPosition[0] != this._previousDragPosition[0] ||
      newPosition[1] != this._previousDragPosition[1]);
    },

    _snapItemPositionToGrid: function(item) {
      var position = item.$element.position();

      position[0] -= this.$element.position().left;

      var col = Math.round(position.left / this._cellWidth),
        row = Math.round(position.top / this._cellHeight);

      // Keep item position within the grid and don't let the item create more
      // than one extra column
      col = Math.max(col, 0);
      row = Math.max(row, 0);

      if (this.options.direction === "horizontal") {
        col = Math.min(col, this._maxGridCols);
        row = Math.min(row, this.options.lanes - item.h);
      } else {
        col = Math.min(col, this.options.lanes - item.w);
        row = Math.min(row, this._maxGridCols);
      }

      return [col, row];
    },

    _highlightPositionForItem: function(item) {
      this.$positionHighlight.css({
        width: this._getItemWidth(item),
        height: this._getItemHeight(item),
        left: item.x * this._cellWidth,
        top: item.y * this._cellHeight
      }).show();
      if (this.options.heightToFontSizeRatio) {
        this.$positionHighlight.css('font-size', this._fontSize);
      }
    },

    _removePositionHighlight: function() {
      this.$positionHighlight.hide();
    },

    _createGridSnapshot: function() {
      this._items = GridList.cloneItems(this.items);
    },

    _updateGridSnapshot: function() {
      // Notify the user with the items that changed since the previous snapshot
      this._triggerOnChange();
      GridList.cloneItems(this.items, this._items);
    },

    _triggerOnChange: function() {
      if (typeof(this.options.onChange) != 'function') {
        return;
      }
      this.options.onChange.call(
        this, this.gridList.getChangedItems(this._items, '$element'), this.items);
    }

  };

  $.fn.gridList = function(options, draggableOptions) {
    var instance,
      method,
      args;
    if (typeof(options) == 'string') {
      method = options;
      args = Array.prototype.slice.call(arguments, 1);
    }
    this.each(function() {
      instance = $(this).data('_gridList');
      // The plugin call be called with no method on an existing GridList
      // instance to re-initialize it
      if (instance && !method) {
        instance.destroy();
        instance = null;
      }
      if (!instance) {
        window.dashboard_widget = {};
        instance = new DraggableGridList(this, options, draggableOptions);
        $(this).data('_gridList', instance);
      }
      if (method) {
        instance[method].apply(instance, args);
      }
    });
    // Maintain jQuery chain
    return this;
  };

}));
