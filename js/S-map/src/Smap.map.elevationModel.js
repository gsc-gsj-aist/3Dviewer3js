///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.mapelevationModel.js, 2016-04-22, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//	loadImagePixelはやめてloadImageを使って画像サイズも取得する必要あり
///////////////////////////////////////////////////////////////////////////////

'use strict';

( function( Smap ) {
	
//
//	関数: Smap.map.createElevationModel()
//		標高モデルの生成
//
	Smap.map.createElevationModel = function( anElevationModel ) {
		// anElevationModelにはオブジェクトのみが渡される

		// デフォルト値設定
		if ( typeof anElevationModel.resolution === 'undefined' ){
			anElevationModel.resolution = 1;
		}
		if ( typeof anElevationModel.dataMapSize === 'undefined' ){
			anElevationModel.dataMapSize = 256;
		}
		if ( typeof anElevationModel.maxZoom === 'undefined' ){
			anElevationModel.maxZoom = 14;
		}
		if ( typeof anElevationModel.hf === 'undefined' ){
			anElevationModel.hf = 1;
		}

		// getElevation()メソッド
		anElevationModel.getElevation = function( aLatLng, aZ ){
			var
				z = Math.min( Math.round( aZ ), this.maxZoom ),
				point = {},
				x,
				y,
				url,
				invalid = Math.pow( 2, 23 ),
				promise,
				ll = Smap.latLng( aLatLng );

			if ( this.projection === 'latlng' ) {
				point.x = ( 180 + ll.lng ) / 360 * Math.pow( 2, z + 8);
				point.y = (  90 - ll.lat ) / 360 * Math.pow( 2, z + 8);
			}else {
				point = Smap.latLngToPoint( Smap.latLng( aLatLng ), z );
			}

			x = Math.floor( point.x / 256 );
			y = Math.floor( point.y / 256 );

			// ここはもう少し真面目に
			url = this.url.replace( '{z}', z )
						.replace( '{y}', y ).replace( '{x}', x );

			promise = Smap.loadImage( url ).then( function( img ){
				var
					i = ( point.x % 256 ) / 256 * img.width,
					j = ( point.y % 256 ) / 256 * img.height;
//				console.log( url, i,j ) ;
//				alert( url + ' ' +  i + ' ' + j ) ;
				return Smap.loadImagePixel( url, i, j );
			} ).then( function( data ){
					var
						x,
						h;
					if ( data == null ) {
						return Smap.promise.reject();
					} else {
//						console.log( data );
//						alert( data );
						x = data[0] * 256 * 256 + data[1] * 256 + data[2];
						// PNG標高タイル v.0.7.0及び0.6.3以前に対応
						if ( data[ 3 ] === 0 || x === invalid ) {
							return Smap.promise.reject();
						} else {
							h = ( x < invalid ) ? x : x - invalid * 2;
							return h * anElevationModel.resolution;
						}
					}
			} );
		
/* pngzipモードには非対応
				if ( params && params.pngzip ) {
					Smap.loadPngZip( url.replace( '.png', '.zip' ) ).then( function( img ) {
						var
							canvas = document.createElement( 'canvas' ),
							ctx = canvas.getContext( '2d' ),
							data,
							x;
						if ( i < 0 || i > img.width || j < 0 || j > img.height ) {
							resolve( null );
						} else {
							canvas.width = img.width;
							canvas.height = img.height;
							canvas.globalCompositeOperation = 'copy';	// 不透明度を正確に取得するため
							ctx.drawImage( img, 0, 0 );
							data = ctx.getImageData( i, j, 1, 1 ).data;
							resolve( data );
						}
					}, function( error ){ error } );	// loadPngZip のエラー時
				} else {
*/
			return promise;
		}

		// マップエンジン固有の生成メソッドの呼び出し
		if ( typeof anElevationModel.map._createElevationModel !== 'undefined' ) {
			return anElevationModel.map._createElevationModel( anElevationModel );
		}
		return anElevationModel;
	}

} ) ( Smap );
