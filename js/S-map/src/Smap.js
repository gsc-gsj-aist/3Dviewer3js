///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.js, 2016-11-17, 西岡 芳晴 ( NISHIOKA Yoshiharu ),
//		Smap名前空間，定数・汎用関数用
//		S-map内では最初にロードされる必要がある．
///////////////////////////////////////////////////////////////////////////////

'use strict';

// Smap : 名前空間，S-map全体を表す名前空間
// GSJ, GSJMap : 下位互換のための別名．ただしすでに定義されているときは使用しない
// 	※GSJ, GSJMapは廃止予定
if ( typeof Smap === 'undefined' ) {
	var
		Smap = {};
}
Smap.engine = {};

if ( typeof GSJ === 'undefined' ) {
	var
		GSJ = Smap;
}
if ( typeof GSJMap === 'undefined' ) {
	var
		GSJMap = Smap;
}

( function( Smap ) {

//
//	定数: 
//
	Smap.DEFAULT_BASE = {			// デフォルトのベースマップ，地理院地図(標準)
		id: 'CHIRIIN_STD',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/{type}/{z}/{x}/{y}.png',
		title: '地理院地図(標準)',
		attribution: '国土地理院',
		attributionUrl: 'http://maps.gsi.go.jp/development/ichiran.html',
		attribution_url: 'http://maps.gsi.go.jp/development/ichiran.html', // 廃止予定
		minZoom: 0,
		maxZoom: 18,
		type: 'std',
	};
	Smap.DEFAULT_ELEVATION
//			= 'http://gsj-seamless.jp/labs/elev/{type}/{z}/{y}/{x}.png?errorpng=on';
			= 'http://gsj-seamless.jp/labs/elev2/elev/{z}/{y}/{x}.png?errorpng=on&res={type}';
											// デフォルト標高レイヤーのURL, 廃止予定
	Smap.DEFAULT_ELEVATION_MODEL = {
		url: 'http://gsj-seamless.jp/labs/elev2/elev/{z}/{y}/{x}.png?size=129&errorpng=on',
		dataMapSize: 65,
		maxZoom: 14,
//		resolution: 1,						// デフォルト値なので本来設定不要
//		hf: 1,								// デフォルト値なので本来設定不要
	};										// デフォルト標高モデル
	Smap.DEFAULT_ENGINE 		= 'leaflet';	// デフォルトエンジン名
	Smap.DEFAULT_GEOCODER 	= 'csis';		// デフォルトジオコーダー
	Smap.EARTH_R = 6378137;			// 地球の長半径（単位ｍ），WGS84
	Smap.ZOOM_LIMIT = 24;			// このライブラリで利用できるズームレベルの限界値
	Smap.URL_RE =					// URL確認用正規表現
		/^(https?|ftp):\/\/[-_.!~*\'()a-zA-Z0-9\/?:\@&=+\$,%#{}]+$/; 
	Smap.BLANK_MAP = {
		id: 'BLANK_MAP',
		title: '無地の背景',
    	minZoom: 0,
    	maxZoom: Smap.ZOOM_LIMIT,
    	fillStyle: '#ffffff',
		drawTile: function( canvas, coord ) {
	        var
	        	ctx =canvas.getContext( '2d' );
	        ctx.fillStyle = this.fillStyle;
	        ctx.fillRect( 0, 0, 256, 256 );
		}
	};

//
//	関数: Smap.latLng()
//		LatLngオブジェクトの生成
//
	Smap.latLng = function( aPoint ) {
		var
			newPoint = null;
		if ( arguments.length === 1 ) {
			if ( typeof aPoint === 'string' ) {
				aPoint = aPoint.split( ',' );
			};
			if ( aPoint instanceof Array && aPoint.length > 1 ){
				aPoint = { lat: aPoint[ 0 ], lng: aPoint[ 1 ] };
			}
		} else if ( arguments.length > 1 ) {
			aPoint = { lat: arguments[ 0 ], lng: arguments[ 1 ] };
		}

		if ( aPoint && ( typeof aPoint.lat !== 'undefined' ) && ( typeof aPoint.lng !== 'undefined' ) ) {
			newPoint = { lat: Number( aPoint.lat ), lng: Number( aPoint.lng ) };
		}
		return newPoint
	}

//
//	関数: Smap.point() 
//		Pointオブジェクトの生成
//
	Smap.point = function( aPoint ) {
		var
			newPoint = null;

		if ( arguments.length === 1 ) {
			if ( typeof aPoint === 'string' ) {
				aPoint = aPoint.split( ',' );
			};
			if ( aPoint instanceof Array && aPoint.length > 1 ){
				aPoint = { x: aPoint[ 0 ], y: aPoint[ 1 ] };
			}
		} else if ( arguments.length > 1 ) {
			aPoint = { x: arguments[ 0 ], y: arguments[ 1 ] };
		}
		newPoint ={ x: Number( aPoint.x ), y: Number( aPoint.y ) };
		return newPoint;
	}

//
//	関数: Smap.bounds() 
//		Boundsオブジェクトの生成
//
	Smap.bounds = function( bounds ) {
		var
			newBounds = null;

		if ( arguments.length > 1 ) {
			bounds =  Array.prototype.slice.call( arguments );
		}
		if ( bounds instanceof Array ) {
			if ( bounds.length > 1 && bounds.length < 4 ){
				bounds = { sw: bounds[ 0 ], ne: bounds[ 1 ] };
			} else{
				bounds = { sw: [ bounds[ 0 ], bounds[ 1 ] ], ne: [ bounds[ 2 ], bounds[ 3 ] ] };
			};
		}
		if ( bounds && bounds.sw && bounds.ne ) {
			newBounds = { sw: Smap.latLng( bounds.sw ), ne: Smap.latLng( bounds.ne ) }
		};
		return newBounds;
	}

//
//	関数: Smap.latLngToPoint()
//		緯度経度をポイント座標に変換します
//		ここでのポイント座標とは，そのズームレベルにおいて256ピクセルのタイルを使用した場合の座標です．
//		左上を原点，右及び下をX, Y座標の正としたものです
//
	Smap.latLngToPoint = function( aLatLng, aZoom ) {
		var
			ll = Smap.latLng( aLatLng ),
			w = Math.pow( 2, aZoom ) * 128,
			yrad = Math.log( Math.tan( Math.PI * ( 90 + ll.lat ) / 360) );
		return { x: Math.round( ( ll.lng / 180 + 1 ) * w ), y: Math.round( ( 1 - yrad / Math.PI) * w) };
	};

//
//	関数: Smap.pointToLatLng()
//		ポイント座標を緯度経度に変換します
//		ここでのポイント座標とは，そのズームレベルにおいて256ピクセルのタイルを使用した場合の座標です．
//		左上を原点，右及び下をX, Y座標の正としたものです
//
	Smap.pointToLatLng = function( aPoint, aZoom ) {
		var
			w = Math.pow( 2, aZoom ) * 256,	// 世界全体のピクセル幅
			yy = Math.atan( Math.pow( Math.E, ( 0.5 - aPoint.y / w ) * 2 * Math.PI ) );
		return { lat: yy / Math.PI * 360 - 90, lng: aPoint.x / w * 360 - 180 };
	};


//
//	関数: Smap.contains()
//		緯度経度範囲が位置を含むか否かを返します
//		矩形枠上の位置は含まれると判断します．
//		bounds.sw.lat <= bounds.ne.latでなければなりません
//		bounds.sw.lng > bounds.ne.lngの場合は子午線をはさんだ範囲となります
	Smap.contains = function( bounds, latLng ) {
		var
			lTest,
			b = Smap.bounds( bounds ),
			ll = Smap.latLng( latLng );

		if ( b.sw.lng <= b.ne.lng ) {
			lTest = b.sw.lng <= ll.lng && b.ne.lng >= ll.lng;
		} else {
			lTest = b.sw.lng >= ll.lng && b.ne.lng <= ll.lng;
		}
		return ( lTest && b.sw.lat <= ll.lat && b.ne.lat >= ll.lat );
	};

//
//	関数: Smap.zoomToScale()
//		ズームレベルをスケール(m/ピクセル)に変換します．
//
	Smap.zoomToScale = function( aZoom, aLat ){
		return 2 * Math.PI * Smap.EARTH_R * Math.cos( aLat / 180 * Math.PI ) / 256 / Math.pow( 2, aZoom )
	}

//
//	関数: Smap.scaleToZoom()
//		ズームレベルをスケール(m/ピクセル)に変換します．
//
	Smap.scaleToZoom = function( aScale, aLat ){
		var
			scale0 = 2 * Math.PI * Smap.EARTH_R * Math.cos( aLat / 180 * Math.PI ) / 256;

		return Math.LOG2E * Math.log( scale0 / aScale )
	}

//
//	関数: Smap.zyToScale()
//		ズームレベルとピクセルY座標をスケール(m/ピクセル)に変換します．
//
	Smap.zoomYToScale = function( aZoom, aY ){
		var
			w = Math.pow( 2, aZoom ) * 256,	// 世界全体のピクセル幅
			yy = Math.atan( Math.pow( Math.E, ( 0.5 - aY / w ) * 2 * Math.PI ) );
		return 2 * Math.PI * Smap.EARTH_R * Math.sin( yy * 2 ) / w
	}

//
//	関数: Smap.elevationLayer()
//		ElevationLayerオブジェクトを生成します．
//
	Smap.elevationLayer = function( url ){
		var
			elevationLayer = {};

		elevationLayer.url = ( url ) ? url : Smap.DEFAULT_ELEVATION;
		elevationLayer.getElevation = function( aLatLng, aZ, params ) {
			var
				point = Smap.latLngToPoint( Smap.latLng( aLatLng ), aZ ),
				x = Math.floor( point.x / 256 ),
				y = Math.floor( point.y / 256 ),
				i = point.x % 256,
				j = point.y % 256,
				url,
				type = 'm',
				invalid = Math.pow( 2, 23 ),
				promise,
				p2;

			if ( params && ( params.type === 'cm' ) ){
				type = 'cm';
			}
			
			url = this.url.replace( '{type}', type ).replace( '{z}', aZ )
						.replace( '{y}', y ).replace( '{x}', x );

			p2 = Smap.promise( function( resolve, reject ) {
				if ( params && params.pngzip ) {
					Smap.loadPNGZip( url.replace( '.png', '.zip' ) ).then( function( img ) {
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
					}, function( error ){ error } );	// loadPNGZip のエラー時
				} else {
					Smap.loadImagePixel( url, i, j ).then( function( data ){
						resolve( data );
					}, function( error ){ error } );	// loadImagePixelのエラー時
				}
			} );

			promise = Smap.promise( function( resolve, reject ) {
				p2.then( function( data ) {
					var
						x,
						h;
					if ( data == null ) {
						reject();
					} else {
						x = data[0] * 256 * 256 + data[1] * 256 + data[2];
						if ( x === invalid ) {
							reject();
						} else {
							h = ( x < invalid ) ? x : x - invalid * 2;
							resolve( ( type === 'm' ) ? h : h / 100 );
						}
					}
				}, function(){} );	//標高タイルロード失敗時
			} );
			return promise;
		}
		return elevationLayer;
	}

//
//	関数: Smap.getElevation()
//		標高所得プロミスを発行します
//
	Smap.getElevation = function( aLatLng, aZ, params ) {
		return Smap.elevationLayer().getElevation( aLatLng, aZ, params );
	}

//
//	関数: Smap.getEngineNames()
//		使用できるマップエンジン名のリストを取得します．
//
	Smap.getEngineNames = function() {
		var
			engines = [];

		for ( var engine in Smap.engine ) {
			engines.push( engine );
		}
		return engines;
	}

	// 以下，互換用，廃止予定
	Smap.promiseAll =Smap.promise.all;
	Smap.promiseFinishing = Smap.promise.finishing;
	Smap.loadUrl = Smap.loadURL;
	Smap.loadXml = Smap.loadXML;
	Smap.loadBlob = Smap.loadBLOB;
	Smap.loadPngZip = Smap.loadPNGZip;

// *
// *　関数: Smap.saveURL()
// *　　　URLをファイルへ保存
// *
	Smap.saveURL = function( aUrl, aFileName) {
		if( navigator.msSaveOrOpenBlob ) {	// Internet Explorerの場合
			// 以下はdata:スキーマとbase64指定が前提
			var
		    	tmp = aUrl.split( ',' ),
		    	data = atob( tmp[1] ),
				mime = tmp[0].split( ':' )[1].split( ';' )[0],
				arr = new Uint8Array( data.length );

			for ( var i = 0; i < data.length; i++ ) {
				arr[i] = data.charCodeAt( i );
			}
			navigator.msSaveOrOpenBlob( new Blob( [arr], { type: mime } ), aFileName );
		} else {									// Internet Explorer以外
			var
				a = document.createElement( 'a' ),
				evt = document.createEvent( 'MouseEvents' );
			a.href = aUrl;
			a.download= aFileName;
			evt.initMouseEvent( 'click', true, true, window, 0, 0, 0, 0, 0, 
					false, false, false, false, 0, null );
			a.dispatchEvent( evt );
		}
	};

	Smap.saveBLOB = function( blob, aFileName ){
		if( navigator.msSaveOrOpenBlob ) {	// Internet Explorerの場合
			navigator.msSaveOrOpenBlob( blob, aFileName );
		} else {
			var
				url = ( window.URL || window.webkitURL ).createObjectURL( blob );
			Smap.saveURL( url, aFileName );
		}
	}
	Smap.saveBlob = Smap.saveBLOB;

// *
// *　関数: Smap.mapToKMZ()
// *　　　Canvasに描かれた地図をKMZへ保存
// *　　　JSZipが必要
// *
	Smap.mapToKMZ =function( aCanvas, bounds, aFileName, params ) {
		var
			template = '<?xml version="1.0" encoding="UTF-8"?>' + '\n'
					+ '<kml xmlns="http://www.opengis.net/kml/2.2">'
					+ '<Document><GroundOverlay><name>{%name}</name><description>{%description}</description>'
					+ '<Icon><href>map.png</href></Icon><LatLonBox>'
					+ '<south>{%s}</south><west>{%w}</west><north>{%n}</north><east>{%e}</east>'
					+ '</LatLonBox></GroundOverlay></Document></kml>',
			name = ( params && params.name ) ? params.name : '',
			description = ( params && params.description ) ? params.description : '',
			zip = new JSZip(),
			base64 = aCanvas.toDataURL().split( 'base64,' )[1],
			head = 'data:application/vnd.google-earth.kmz;base64,';

		template = template.replace( '{%name}', name )
			.replace( '{%description}', description )
			.replace( '{%n}', bounds.ne.lat )
			.replace( '{%s}', bounds.sw.lat )
			.replace( '{%e}', bounds.ne.lng )
			.replace( '{%w}', bounds.sw.lng );
		zip.file( 'map.kml', template );
	    zip.file( 'map.png', base64, { base64: true } );
		Smap.saveURL( head  + zip.generate() , aFileName );
	};

//
//	関数: Smap.geocoder()
//		ジオコーダオブジェクトの生成
//
	Smap.geocoder =function( geocoder ) {
		var
			newGeocoder =  { geocoders: [] };

		newGeocoder.geocode = function( addr, params ) {		// デフォルトのgeocode()処理
			var
				ps = [],
				p;
			this.geocoders.forEach( function( gc ) {
				if ( params && params.bounds ) {
					params.bounds = Smap.bounds( params.bounds );
				}
				ps.push( gc.geocode( addr, params ) );
			} );
			p = Smap.promiseFinishing( ps ).then( function( data ){
				var
					results;

				results = data.reduce( function( pv, cv ){
					Array.prototype.push.apply( pv, cv.results );
					return pv;
				}, [] );
				return( { results: results } );
			} );
//			p = ps[ 0 ];
			return p;
		}

		if ( typeof geocoder === 'undefined' || geocoder === null ){ // 引数がないなら，デフォルト検索
			newGeocoder = Smap.geocoder[ Smap.DEFAULT_GEOCODER ]();
			newGeocoder.id = Smap.DEFAULT_GEOCODER;
		} else if ( typeof geocoder === 'string' ) {	 		// 引数が文字列なら，ID
			if ( Smap.geocoder[ geocoder ] ) {
				newGeocoder = Smap.geocoder[ geocoder ]();
			}
			newGeocoder.id = geocoder;
		} else if ( typeof geocoder === 'function' ) { 			// 引数が関数なら，geocode()メソッド
			newGeocoder.geocode = geocoder;
		} else if ( typeof geocoder.length !== 'undefined' ) {	// 引数が配列なら，geocodersプロパティ
			geocoder.forEach( function( gc ) {
				this.geocoders.push( Smap.geocoder( gc ) );
			}, newGeocoder );
		} else {												// 引数はオブジェクトとみなして
			newGeocoder =geocoder;
		}

		newGeocoder.add = function( geocoder ) {
			this.geocoders.push( Smap.geocoder( geocoder ) );
		}

		return newGeocoder;
	}

//
//	オブジェクト: Smap.base64url()
//		mBase64関連のメソッドを管理するオブジェクト
//
	Smap.base64url = {
		encodeBaseStr : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
		encode : function ( array ) {
					var result = '';
					for ( var i = 0; i < Math.ceil( array.length / 6 ); i++ ) {
						var x = 0;
						for ( var j = 0; j < 6; j++ ) {
							x = x * 2;
							if ( ( i * 6 + j < array.length ) && ( array[ i * 6 + j ] ) ) {
								x += 1;
							}
						}
						result += this.encodeBaseStr.charAt( x );
					}
					return result;
				},
		decode : function ( str ) {
					var result = [];
					for ( var i = 0; i < str.length; i++ ) {
						for ( var z = 5; z >= 0; z-- ) {
							result.push( ( this.encodeBaseStr.indexOf( str[ i ] ) >> z ) & 1 );
						}
					}
					return result;
				}
		
	};

} ) ( Smap );

