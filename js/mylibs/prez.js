/*!
 * prez.
 * https://github.com/Takazudo/prez.
 * Author: Takeshi Takatsudo
 * version: 0
 */
(function($, window, document, undefined){

var $win = $(window);
var $document = $(document);

/* namespace */
$.prez = {};
$.prez.utils = {};
$.prez.widgets = {};

/* vars */
$.prez.totalPageCount = 0;

/* model, collection instances */
$.prez.models = {
	info: null,
	pageStorage: null
};

/**
 * utils
 */
/* convert '1' to 1 */
$.prez.utils.numberifyStr = function(str){
	if(!_.isNumber(str)){
		str = str*1;
		if(_.isNaN(str)){
			return false;
		}
	}
	return str*1;
};
/* convert html for overView */
$.prez.utils.simplifyHtml = function(html){
	var $div = $('<div />');
	$div.html(html);
	$div.find('h1:eq(0)').each(function(){
		var $h1 = $(this);
		var text = $h1.text();
		text = '__xxx#xxx__b__xxx#xxx__' + text + '__xxx#xxx__/b__xxx#xxx__';
		$h1.text(text);
	});
	return $div.text().replace('__xxx#xxx__b__xxx#xxx__','<b>').replace('__xxx#xxx__/b__xxx#xxx__','</b>');
};

/**
 * keyBinder
 */
$.prez.keyBinder = (function(){
	var _allowKeyboardAccess = true;
	var pub = {};
	pub.init = function(){
		/* forbid keyboardAccess while text input */
		$('input,textarea').live('focus', function(){
			_allowKeyboardAccess = false;
		}).live('blur', function(){
			_allowKeyboardAccess = true;
		});
	};
	pub.bind = function(key, fn){
		$document.bind('keydown', key, function(){
			if(!_allowKeyboardAccess){ return; }
			fn();
		});
		return pub;
	};
	return pub;
})();

/**
 * pager
 */
$.prez.pager = (function(){
	var pub = {};
	function getCurrentPageNum(){
		var href = location.href;
		var ary = href.split('#page/');
		if(ary.length !== 2){
			return 0;
		}
		var res = $.prez.utils.numberifyStr(ary[1]);
		return res || 0;
	}
	pub.to = function(pageNum){
		if(!$.prez.models.pageStorage.pageExist(pageNum)){
			return;
		}
		location.href = '#page/' + pageNum;
	};
	pub.prev = function(){
		var num = getCurrentPageNum();
		num--;
		pub.to(num);
	};
	pub.next = function(){
		var num = getCurrentPageNum();
		num++;
		pub.to(num);
	};
	pub.first = function(){
		pub.to(0);
	};
	pub.last = function(){
		pub.to($.prez.totalPageCount-1);
	};
	pub.nextPageInGroup = function(){
		var page = $.prez.models.pageStorage.getNextPageInGroup();
		if(!page){ return; }
		pub.to(page.get('pageNum'));
	};
	pub.prevPageInGroup = function(){
		var page = $.prez.models.pageStorage.getPrevPageInGroup();
		if(!page){ return; }
		pub.to(page.get('pageNum'));
	};
	pub.nextGroup = function(){
		var page = $.prez.models.pageStorage.getNextGroupFirstPage();
		if(!page){ return; }
		pub.to(page.get('pageNum'));
	};
	pub.prevGroup = function(){
		var page = $.prez.models.pageStorage.getPrevGroupFirstPage();
		if(!page){ return; }
		pub.to(page.get('pageNum'));
	};
	return pub;
})();

/**
 * Backbone.js models, collections
 */
/* info */
$.prez.Info = Backbone.Model.extend({
	initialize: function(){
		//log('info!');
	}
});
/* page structure */
/*
	These handle data like below
	{
		groups: [
			{
				pages: [
					{
						html: xxxxx,
						simpleHtml: xxxxx,
						pageNum: xxxxx,
						....
					},
					{
						html: xxxxx,
						simpleHtml: xxxxx,
						pageNum: xxxxx,
						....
					}
					....
				]
			},
			....
		]
	}
*/
$.prez.Page = Backbone.Model.extend({
	defaults: {
		html: '',
		simpleHtml: '',
		pageNum: null,
		firstInGroup: false,
		lastInGroup: false,
		selected: false
	},
	initialize: function(){
		$.prez.totalPageCount++;
		//log('page!');
	},
	select: function(){
		this.set({ selected: true });
	},
	deselect: function(){
		this.set({ selected: false });
	}
});
$.prez.Pages = Backbone.Collection.extend({
	model: $.prez.Page,
	initialize: function(){
		//log('pages!');
	}
});
$.prez.PageGroup = Backbone.Model.extend({
	defaults: {
		pages: null
	},
	initialize: function(attributes){
		this.pages = new $.prez.Pages(attributes.pages);
	}
});
$.prez.PageGroups = Backbone.Collection.extend({
	model: $.prez.PageGroup,
	initialize: function(){
		//log('pageGroups!');
	}
});
$.prez.PageStorage = Backbone.Model.extend({
	defaults: {
		groups: null
	},
	initialize: function(attributes){
		this.groups = new $.prez.PageGroups(attributes.groups);
		this._allPageModels = this.getAllPageModels();
	},
	getAllPageModels: function(){
		var res = [];
		this.groups.each(function(group){
			group.pages.each(function(page){
				res.push(page);
			});
		});
		return res;
	},
	pagesSize: function(){
		return this._allPageModels.length;
	},
	pageExist: function(num){
		num = $.prez.utils.numberifyStr(num);
		if(num===false || num<0){
			return false;
		}
		if(this.pagesSize()-1 < num){
			return false;
		}
		return true;
	},
	pageAt: function(index){
		if(!this.pageExist(index)){
			return null;
		}
		return this._allPageModels[index];
	},
	select: function(index){
		var nextPage = this.pageAt(index);
		if(nextPage){
			var otherPages = _.without(this._allPageModels, nextPage);
			_.each(otherPages, function(page){
				page.deselect();
			});
			nextPage.select();
			return true;
		}else{
			return false;
		}
	},

	getSelectedPage: function(){
		return _.detect(this._allPageModels, function(page){
			return page.get('selected');
		});
	},
	getNextPageInGroup: function(){
		var index = this.getSelectedPage().get('pageNum') + 1;
		var nextPage = this.pageAt(index);
		if(!nextPage){
			return null;
		}
		if(!nextPage.get('firstInGroup')){
			return nextPage;
		}
		return null;
	},
	getPrevPageInGroup: function(){
		var index = this.getSelectedPage().get('pageNum') - 1;
		var nextPage = this.pageAt(index);
		if(!nextPage){
			return null;
		}
		if(!nextPage.get('lastInGroup')){
			return nextPage;
		}
		return null;
	},
	getNextGroupFirstPage: function(){
		var index = this.getSelectedPage().get('pageNum') + 1;
		var pages = this._allPageModels;
		for(var i=index, l=this.pagesSize(), page; i<l; i++){
			page = this.pageAt(i);
			if(!page){
				return null;
			}
			if(page.get('firstInGroup')){
				return page;
			}
		}
		return null;
	},
	getPrevGroupFirstPage: function(){
		var index = this.getSelectedPage().get('pageNum');
		var pages = this._allPageModels;
		for(var i=index, page, closestFirstFound=false; i>=0; i--){
			page = this.pageAt(i);
			if(!page){
				return null;
			}
			if(page.get('firstInGroup')){
				if(closestFirstFound){
					return page;
				}
				closestFirstFound = true;
			}
		}
		return null;
	}
});

/**
 * presenView widgets
 */
$.widget('prez.presenView', {
	_transformVals: null,
	_$all: null,
	_create: function(){
		/* $all is a big canvas.
		   moving this to change page */
		this._$all = $('>.prez-presenView-all', this.element);
		this._initElems();
		this._eventify();
	},
	_initElems: function(){
		var $el = this.element;
		var self = this;
		var transformVals = (self._transformVals = []);
		/* adjust the groups and pages position */
		$('.prez-presenView-group', $el).each(function(i){
			var leftVal = i*100 + '%';
			var $group = $(this).css('left', leftVal);
			$('.prez-presenView-page', $group).each(function(j){
				var topVal = j*100 + '%';
				$(this).css('top', topVal);
				transformVals.push(self._calcTranslate3dVal(leftVal, topVal));
			});
		});
	},
	_eventify: function(){
		this.element.delegate('.prez-presenView-showOverView', 'click', function(e){
			e.preventDefault();
			$.prez.widgets.overView.show();
		});
	},
	/* calc offset from given page's left, top val. */
	_calcTranslate3dVal: function(leftVal, topVal){
		var x = (leftVal === '0%') ? '0' : '-' + leftVal;
		var y = (topVal === '0%') ? '0' : '-' + topVal;
		var val = 'translate(' + x + ',' + y + ')';
		return val;
	},
	slideTo: function(pageNum){
		if(!$.prez.models.pageStorage.pageExist(pageNum)){
			return;
		}
		pageNum = pageNum*1;
		this._$all.css('transform', this._transformVals[pageNum]);
	}
});
$.prez.presenView.create = function(){
	var src = '#tmpl-presenView';
	var data = $.prez.models.pageStorage.toJSON();
	return $(src).tmpl(data).presenView();
};

/**
 * overView widgets
 */
$.widget('prez.overView_page', {
	options: {
		model: null, // model instance must be specified.
		class_selected: 'prez-overView-page-selected'
	},
	_create: function(){
		this.widgetEventPrefix = 'page.';
		var o = this.options;
		if(!o.model){
			return;
		}
		o.model.bind('change:selected', $.proxy(this._modelSelectChangeHandler, this));
		this.element.click(function(){
			setTimeout(function(){
				$.prez.widgets.overView.hide();
			}, 400);
		});
		if(o.model.get('selected')){
			this.select();
		}
	},
	_modelSelectChangeHandler: function(model, selected){
		if(selected){
			this.select();
		}else{
			this.deselect();
		}
	},
	select: function(){
		this.element.addClass(this.options.class_selected);
		this._trigger('select');
	},
	deselect: function(){
		this.element.removeClass(this.options.class_selected);
	},
	triggerSelectEventIfSelected: function(){
		if(!this.options.model.get('selected')){
			return;
		}
		this._trigger('select');
	}
});

$.widget('prez.overView', {
	_visible: false,
	_$pages: null,
	_$bd: null,
	_$container: null,
	_create: function(){
		this.element.hide();
		this._$container = $('.prez-overView-groups', this.element);
		this._$bd = $('.prez-overView-bd', this.element);
		this._createPages();
		this._eventify();
		this._attachOverscroll();
	},
	_attachOverscroll: function(){
		this._$bd.overscroll({
			showThumbs: true,
			direction: 'horizontal'
		});
	},
	_createPages: function(){
		var pageModels = $.prez.models.pageStorage.getAllPageModels();
		var self = this;
		self._$pages = $();
		$('.prez-overView-page', this.element).each(function(){
			var $page = $(this).overView_page({
				model: pageModels.shift()
			});
			self._$pages = self._$pages.add($page);
		});
	},
	_eventify: function(){
		var self = this;
		this.element.delegate('.prez-overView-close', 'click', function(e){
			e.preventDefault();
			self.hide();
		});
		this._$pages.bind('page.select', function(e, data){
			var $page = $(this);
			var offset = self._calcOffset($page);
			self._$bd.stop().scrollTo(offset, {duration:200});
		});
	},
	_calcOffset: function($target){
		var $el = this.element;
		var offset_container = this._$container.offset();
		var offset_target = $target.offset();
		var top = offset_target.top - offset_container.top - $win.height()/2;
		var left = offset_target.left - offset_container.left - $win.width()/2 - 10;
		return {
			top: top,
			left: left
		};
	},
	toggle: function(){
		if(this._visible){
			this.hide();
		}else{
			this.show();
		}
	},
	hide: function(){
		if(!this._visible){
			return this;
		}
		this.element.fadeOut();
		this._visible = false;
		return this;
	},
	show: function(){
		if(this._visible){
			return this;
		}
		var self = this;
		this.element.fadeIn(function(){
			/* need to trigger select event
			   because offset does not work when the element is not in view */
			self._$pages.overView_page('triggerSelectEventIfSelected');
		});
		this._visible = true;
		return this;
	}
});
$.prez.overView.create = function(){
	var src = '#tmpl-overView';
	var data = $.extend({}, $.prez.models.pageStorage.toJSON(), $.prez.models.info.toJSON());
	return $(src).tmpl(data).overView();
};


/**
 * Controller
 */
$.prez.Controller = Backbone.Controller.extend({
	routes: {
		'page/:page': 'page'
	},
	page: function(pageNum){
		var res = $.prez.models.pageStorage.select(pageNum);
		if(res){
			$.prez.widgets.presenView.slideTo(pageNum);
		}else{
			$.prez.pager.first();
		}
	}
});

/**
 * init
 */
$.prez.init = (function(){
	
	function preparePresentationInfo(){
		var $el = $('#prez-info');
		$.prez.models.info = new $.prez.Info({
			title: $('.title', $el).text(),
			note: $('.note', $el).text()
		});
	}

	function preparePageStorage(){
		var whole = { groups: [] };
		var pageNum = 0;
		$('#prez-pageStorage .prez-group').each(function(i){
			var $group = $(this);
			var group = { pages: [] };
			var $pages = $('.prez-page', $group);
			$pages.each(function(j){
				var $page = $(this);
				var html = $page.html();
				//var simpleHtml = $.prez.utils.simplifyHtml(html);
				var simpleHtml = $page.text();
				group.pages.push({
					html: html,
					simpleHtml: simpleHtml,
					pageNum: pageNum,
					firstInGroup: (j===0),
					lastInGroup: (j===$pages.size()-1),
					selected: (i===0 && j===0) // true if first page
				});
				pageNum++;
			});
			whole.groups.push(group);
		});
		$.prez.models.pageStorage = new $.prez.PageStorage(whole);
	}

	function bindKeys(){
		$.prez.keyBinder
			.bind('return', function(){ $.prez.widgets.overView.toggle(); })
			.bind('esc', function(){ $.prez.widgets.overView.toggle(); })
			.bind('o', function(){ $.prez.widgets.overView.toggle(); })
			.bind('home', function(){ $.prez.pager.first(); })
			.bind('0', function(){ $.prez.pager.first(); })
			.bind('end', function(){ $.prez.pager.last(); })
			.bind('$', function(){ $.prez.pager.last(); })
			.bind('left', function(){ $.prez.pager.prevGroup(); })
			.bind('right', function(){ $.prez.pager.nextGroup(); })
			.bind('up', function(){ $.prez.pager.prevPageInGroup(); })
			.bind('down', function(){ $.prez.pager.nextPageInGroup(); })
			.bind('j', function(){ $.prez.pager.next(); })
			.bind('k', function(){ $.prez.pager.prev(); })
			.bind('h', function(){ $.prez.pager.prevGroup(); })
			.bind('l', function(){ $.prez.pager.nextGroup(); });
	}

	/* fetch data from DOM */
	preparePresentationInfo();
	preparePageStorage();

	/* prepare widgets */
	var $overView = $.prez.overView.create().appendTo('#prez-canvas-overView');
	$.prez.widgets['overView'] = $overView.data('overView');
	var $presenView = $.prez.presenView.create().appendTo('#prez-canvas-presenView');
	$.prez.widgets['presenView'] = $presenView.data('presenView');

	/* start Backbone.js controller */
	new $.prez.Controller();
	Backbone.history.start();

	/* handle keyboard shortcuts */
	$.prez.keyBinder.init();
	bindKeys();

}); // end of $.prez.init

})(jQuery, this, this.document);
