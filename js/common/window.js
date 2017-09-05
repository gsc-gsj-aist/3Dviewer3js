$( document ).ready(function(){
	/********************************************************************************/
	/* メニューボタンオンマウス時の動作（PCのみ） */
	(function(){
		//ツールチップの定義
		var tooltip;
		
		//マウスオーバー時のツールチップ表示
		$( 'nav ul li a img' ).mouseover(function(){
			//表示中のツールチップがあれば削除する
			if ( tooltip ) {
				tooltip.remove();
			}
			//表示位置を決めるための情報を取得する
			var position = $( this ).position();
			var imgWidth = $( this ).width();
			var imgHeight = $( this ).height();
			
			//画面が横長の時だけ表示
			//if ( app.client.window.orientation() === 'landscape' ) {
				//ツールチップを構築する
				tooltip = $( document.createElement('div') )
									.addClass( 'tooltip' )
									.text( $(this).attr('alt') );
				
				//ツールチップのスタイルを決めてDOM追加する
				tooltip.css({
								"top" : String( position.top + $('header').height() ) + 'px',
								"left" : String( position.left + imgWidth ) + 'px',
								"height" : String( imgHeight - 2 ) + 'px',
								"line-height" : String( imgHeight ) + 'px',
							}).appendTo( $('body') );
				//ツールチップの幅を決定し、背景を着色する
				tooltip.css({
								"width" : String( tooltip.get(0).offsetWidth + 10 ) + 'px',
								"padding" : '0 10px',
								"background-color" : '#ddd'
							});
				
				tooltip.hide();
				tooltip.fadeIn();
			//}
		});
		$( 'nav ul li a img' ).mouseout(function(){
			if ( tooltip ) {
				tooltip.remove();
			}
		});
		$( 'nav ul li a img' ).click(function(){
			if ( tooltip ) {
				tooltip.remove();
			}
		});
	})();
	
	/********************************************************************************/
	/* メニューボタンクリック時の動作 */
	(function(){
		var submenu;
		$( 'nav ul li.operation div a.openmenu' ).click(function(){
			submenu = $( this ).parent().next();
			submenu
				.show()
				.animate({"left" : 0}, 300);
			return false;
		});
		$( '#map, img.closeSubmenu' ).on( 'click', function(){
			if ( submenu ) {
				submenu.animate({"left" : '-280px'}, 250, 'swing', function(){
						submenu = undefined;
					});
			}
		});
	})();
	
	/********************************************************************************/
	/* 地図の高さ調整（メニューの高さも同時に調整） */
	(function(){
		var resize = function () {
			var windowHeight = $( window ).height();
			var headerHeight = $( 'header' ).height() - 1;
			var height = windowHeight - headerHeight;
			$( '#webgl' ).css({ 'height' : String( height ) + 'px' });
			$( 'nav form' ).css({ 'height' : String( height-1 ) + 'px' });
			
			$( '#modal' ).css({ 'height' : String( height ) + 'px' });
		};
		resize();
		$( window ).on( 'orientationchange resize', function(){
			resize();
		});
	})();
});
