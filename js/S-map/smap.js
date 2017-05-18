/* ********************************************* */ 
/* smap.js by 西岡 芳晴 ( NISHIOKA Yoshiharu )     */ 
/*        version: 0.2.2.1                       */ 
/*        build: 2017/01/25 16:31:15.21          */          
/* ********************************************* */ 
/*
本ライブラリの著作権は，産業技術総合研究所 地質調査総合センターが保有しています．
また，本ライブラリはApache License 2.0 に基づいてライセンスされます．

Copyright 2015-2016 Geological Survey of Japan (GSJ),
National Institute of Advanced Industrial Science and Technology (AIST)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
///////////////////////////////////////////////////////////////////////////////
//	モジュール : promise.js, 2016-11-29, 西岡 芳晴 ( NISHIOKA Yoshiharu )
//		Promiseの実装
//		Promiseが既に定義されていればそれが利用されます
///////////////////////////////////////////////////////////////////////////////

( function() {
	'use strict';

	// 名前空間名,名前空間略号名の設定
	var
		NAME_SPACE 			= 'Smap';		// 名前空間名
//		NAME_SPACE_SHORT	= 'Smap';		// 名前空間略号名

	// NAME_SPACEで一意の名前空間名(変数名）を指定します．
	// 　すでに作成されている場合は，それが使用されます．
	// NAME_SPACE_SHORTで名前空間の別名を指定します．
	// 　すでに作成されている場合は，何もしません．

	if ( typeof window[ NAME_SPACE ] === 'undefined' ) {
		window[ NAME_SPACE ] = {};
	}

	if ( ( typeof NAME_SPACE_SHORT !== 'undefined' ) &&
			( typeof window[ NAME_SPACE_SHORT ] === 'undefined' ) ) {
		window[ NAME_SPACE_SHORT ] = window[ NAME_SPACE ];
	}

	// 名前空間用ローカル変数にコピーします．
	// 実装が公開用名前空間に依存しないようにするためです．
	var
		SmapPromise = window[ NAME_SPACE ];

//
//	関数: SmapPromise.promoise()
//		プリミティブなプロミスオブジェクトの生成
//
	SmapPromise.promise = function( starter ) {
		if ( typeof starter === 'undefined' ) {
			return SmapPromise.promise( function( resolve ) { resolve(); } );
		}
		if ( typeof Promise !== 'undefined' ) { 
									// Promiseが実装されて入ればそれを使用する
			return new Promise( starter );
		}
		var p = {
			state: 0, // 0: 未完了，1: 完了，2: 拒否
			success: [],
			error: [],
			then: function( onSuccess, onError ) {
				var
					that = this,
					p2;

				p2 = SmapPromise.promise( function( resolve, reject ) {
					that.success.push( function( value ) {
						var
							v;
						if ( onSuccess ) {
							// 2015-03-17 この付近のアルゴリズムがおかしい．
							// エラーが正しく伝搬しない
							if ( value !== null && typeof value !== 'undefined'
									&& value.then ){
								value.then( function( v ){
									resolve( onSuccess( v ) );
								}, function( error ) {
									reject( error );
								} );
							} else {
								v = onSuccess( value );
								if ( v !== null && typeof v !=='undefined' && v.then ) {
									v.then( function( v2 ) {
										resolve( v2 );
									}, function( error ){
										reject( error );
									} );
								} else {
									resolve( v );
								}
//								resolve( v );
							}
						} else {
//							resolve();
							resolve( value );
						}
					} );
					if ( onSuccess && ( that.state == 1 ) ){
						if ( that.resolveValue !== null &&
								typeof that.resolveValue !== 'undefined' &&
								typeof that.resolveValue.then !== 'undefined' ){
							that.resolveValue.then( function( v){
								resolve( onSuccess( v ) );
							} );
						} else {
							resolve( onSuccess( that.resolveValue ) );
						}
					}
					that.error.push( function( value ) {
						if ( onError ) {
							resolve( onError( value ) );
//							reject( onError( value ) );
						} else {
//							resolve();
							reject( value );
						}
					} );
					if ( onError && ( that.state == 2 ) ) {
//						resolve( onError( that.errorValue ) );
						reject( onError( that.errorValue ) );
					}
				} );
				return p2;
			},
			resolve: function( value ) {
//				var
//					args = arguments;
				this.resolveValue = value;
				this.success.forEach( function( aSuccess ) {
//					aSuccess.apply( null, args )
					aSuccess( value )
				} );
				this.state = 1;
			},
//			reject: function() {
			reject: function( value ) {
//				var
//					args = arguments;
				this.errorValue = value;
				this.error.forEach( function( aError ) {
//					aError.apply( null, args );
					aError( value );
				} );
				this.state = 2;
			},
			catch : function( onRejected ){
				this.then( undefined, onRejected );
			}
		};
		if ( starter ) {
			setTimeout( starter(
				function( value ) { p.resolve( value ) },
				function( value ) { p.reject( value ) }
			), 0 );
		}
		return p
	}

//	関数: SmapPromise.promise.resovle()
//		ただちに成功するプロミスを生成する
//
	SmapPromise.promise.resolve = function( value ){
		var
			p;

		if ( typeof Promise !== 'undefined' ) { // Promiseが実装されて入ればそれを使用する
			p = Promise.resolve( value );
		} else {
			p =	SmapPromise.promise( function( resolve ) {
				if ( typeof value !== 'undefined' && value.then ){	// thenableならば
					value.then( function( v ){
						resolve( v );
					} );
				} else {
					resolve( value );
				}
			} );
		}
		return p;
	};

//	関数: SmapPromise.promise.reject()
//		ただちに失敗するプロミスを生成する
//
	SmapPromise.promise.reject = function( value ){
		var
			p;

		if ( typeof Promise !== 'undefined' ) { // Promiseが実装されて入ればそれを使用する
			p = Promise.reject( value );
		}else {
			p =	SmapPromise.promise( function( undefined, reject ) {
				reject( value );
			} );
		}
		return p;
	};

//	関数: SmapPromise.promise.race()
//		引数にプロミスの配列を指定し，いずれかが最初に成功または失敗したときにその結果を返します
//		race()の返すプロミスが固定しても，プロミスリスト内のプロミスの実行は影響を受けません
	SmapPromise.promise.race = function( aPromiseList ){
		var
			promise,
			state = 0;	//プロミスの状態 0: Pending

		promise = SmapPromise.promise( function( resolve, reject ) {
			aPromiseList.forEach( function( aPromise ) {
				aPromise.then( function( value ){
					if ( state === 0 ){				// Pendingならば
						state = 1;					// Fulfilledに変更
						resolve( value );
					}
				}, function( error ) {
					if ( state === 0 ){		// Pendingならば
						state = 2;					// エラーに変更
						reject( error );
					}
				} );
			} );
		} );
		return promise;
	};

//	関数: SmapPromise.promise.all()
//		すべての子プロミスが成功したときに成功となるプロミスの生成
//		すべて成功したとき，結果は全てのプロミスから得られた値の配列として渡されます
//		いずれかが失敗したとき、直ちに失敗したプロミスの結果をもって失敗となり，他の結果は無視されます
//
	SmapPromise.promise.all = function ( aPromiseList ) {
		var
			count = aPromiseList.length,
			promise;

		if ( typeof aPromiseList.length === 'undefined' ) { // 引数が配列でないならば
			count = arguments.length;
			aPromiseList = [];
			for ( var i = 0; i < count; i++ ) {
				aPromiseList[i] = arguments[i];
			}
		}

		promise = SmapPromise.promise( function( resolve, reject ) {
			var
				results = [];

			if ( count === 0 ) {
				resolve( results );
				return;
			};
			aPromiseList.forEach( function( aPromise, index ) {
				aPromise.then( function( data ) {
					results[ index ] = data;
					count--;
					if ( count == 0 ) {
						resolve( results );
					}
				}, function( error ) {
					reject( error );
				} );
			} );
		});

		return promise;
	}
//
//	関数: SmapPromise.promise.finishing()
//	関数: SmapPromise.promiseFinishing()	// 廃止予定
//		すべての子プロミスの終了を監視するプロミスの生成
//		各プロミスの完了/拒否は問わない．
//		このプロミス自体が拒否状態になることはない．
//		この仕様は，一つでも拒否状態になれば拒否を返すES6のallとはことなります．
//
	SmapPromise.promise.finishing = function ( aPromiseList ) {
		var
			count = aPromiseList.length,
			promise;

		if ( typeof aPromiseList.length === 'undefined' ) { // 引数が配列でないならば
			count = arguments.length;
			aPromiseList = [];
			for ( var i = 0; i < count; i++ ) {
				aPromiseList[i] = arguments[i];
			}
		}

		promise = SmapPromise.promise( function( resolve, reject ) {
			var
				results = [];

			if ( count === 0 ) {
				resolve( results );
				return;
			}
			aPromiseList.forEach( function( aPromise, index ) {
				aPromise.then( function( data ) {	// 成功時
					results[ index ] = data;
				}, function(){ 						// 失敗時
						// 本来ならこの行はいらないはずだが，ChromeのPromiseでは
						// 失敗時の処理を何も記述しないと，次のthenメソッドで指定した処理が
						// 実行されない
				} ).then( function() { // 成功・拒否かかわらず実行
					count--;
					if ( count === 0 ) {
						resolve( results );
					}
				} );
			} );
		});

		return promise;
	}

	SmapPromise.allPromise = function ( aPromiseList ) {
		var
			count = aPromiseList.length,
			promise;

		if ( typeof aPromiseList.length === 'undefined' ) { // 引数が配列でないならば
			count = arguments.length;
			aPromiseList = [];
			for ( var i = 0; i < count; i++ ) {
				aPromiseList[i] = arguments[i];
			}
		}

		promise = SmapPromise.promise( function( resolve, reject ) {
			aPromiseList.forEach( function( aPromise ) {
				aPromise.then().then( function() { // 成功・拒否かかわらず実行
					count--;
					if ( count == 0 ) {
						resolve();
					}
				} );
			} );
		});

		return promise;
	}

//
//	関数: SmapPromise.loadImage()
//		画像ファイルのロードプロミスの生成
//
	SmapPromise.loadImage = function( url, params ) {
		var
			img = new Image(),
			promise = SmapPromise.promise( function( resolve, reject ) {
				// data:スキーマでない場合にのみ'anonymous'を設定
				// Firefoxではdata:スキーマで設定してしまうとCORSエラーで読み込めない
				if ( url.substring( 0, 5 ) !== 'data:' ) {	
					img.crossOrigin = 'anonymous';  		
				}
				if ( params ) {
					for ( var key in params ) {
						img[ key ] = params[ key];
					}
				}
				img.onload = function() {
					resolve( this );
				};
				img.onerror = function() {
					reject( { msg: 'Error : image load error ' } );
				}
				img.src = url;
			} );
		return promise;
	}

//
//	関数: SmapPromise.loadImagePixel()
//		画像ファイル指定ピクセルのデータロードプロミスの生成
//
	SmapPromise.loadImagePixel = function( aUrl, i, j ) {
/*
		var
			promise = Smap.promise( function( resolve, reject ) {
				Smap.loadImage( aUrl ).then(
					function( img ) {
						var
							canvas = document.createElement( 'canvas' ),
							ctx = canvas.getContext( '2d' ),
							d;

						if ( i < 0 || i > img.width || j < 0 || j > img.height ) {
								resolve( null );
						} else {
							canvas.width = img.width;
							canvas.height = img.height;
							canvas.globalCompositeOperation = 'copy';	// 不透明度を正確に取得するため
							ctx.drawImage( img, 0, 0 );
							d = ctx.getImageData( i, j, 1, 1 ).data;
//							alert( i + ' ' + j );
							resolve( Array.prototype.slice.apply( d ) );
						}
					},
					function( error ) {
						reject( error );
					}
				) 
			} )
*/

		var
			promise = SmapPromise.loadImage( aUrl ).then( function( img ) {
				var
					canvas = document.createElement( 'canvas' ),
					ctx = canvas.getContext( '2d' ),
					d;

				if ( i < 0 || i > img.width || j < 0 || j > img.height ) {
						return null;
//						resolve( null );
				} else {
					canvas.width = img.width;
					canvas.height = img.height;
					canvas.globalCompositeOperation = 'copy';
											// 不透明度を正確に取得するため
					ctx.drawImage( img, 0, 0 );
					d = ctx.getImageData( i, j, 1, 1 ).data;
					return( Array.prototype.slice.apply( d ) );
				}
			} ).then( null, function( error ) {
				return SmapPromise.promise.reject( error );
			} ) ;

		return promise;
	}

//
//	関数: SmapPromise.loadURL()
//		XMLHttpRequestを追加った汎用的なファイルロードプロミスの生成
//
	SmapPromise.loadURL = function( url, type, headers ) {
		var
		promise = SmapPromise.promise( function( resolve, reject ) {
				var
					req = new XMLHttpRequest();

				req.onreadystatechange = function (){
					if ( req.readyState === 4 ) {
						if( req.status == 0 ){
							reject( { msg: 'Error : SmapPromise.loadURL, XHR Connection Error', statuscode: 0 } );
						} else {
							if( ( 200 <= req.status && req.status < 300 ) || ( req.status == 304 ) ){
								resolve( req.response );
							}else{
								reject( { msg: 'Error: SmapPromise.loadURL, Request Error', statuscode: req.status  } );
							}
						}
					}
				};
//				req.open( 'POST' , url );
//				2015-02-11 POSTだとキャッシュが効かないためGETに変更
//				問題が生じるようなら引数を追加してGETとPOSTを切り替えられるようにする
				req.open( 'GET' , url );
				for ( var key in headers ) {
					req.setRequestHeader( key, headers[ key ] );
				}
				// Firefoxでは以下の1文をより前方で行うとエラーを出さず動作が停止する．
				req.responseType = ( type ) ? type : '';
				req.send( 'send' );
			} );
		return promise;
	}

//
//	関数: SmapPromise.loadXML()
//		XMLファイルのロードプロミスの生成
//
	SmapPromise.loadXML = function( url, headers ) {
		return SmapPromise.loadURL( url, 'document', headers );
	}

//
//	関数: SmapPromise.loadBLOB()
//		XMLファイルのロードプロミスの生成
//
	SmapPromise.loadBLOB = function( url, headers ) {
		return SmapPromise.loadURL( url, 'blob', headers );
	}

//
//	関数: SmapPromise.loadArrayBuffer()
//		XMLファイルのロードプロミスの生成
//
	SmapPromise.loadArrayBuffer = function( url, headers ) {
		return SmapPromise.loadURL( url, 'arraybuffer', headers );
	}

//
//	関数: SmapPromise.loadText()
//		テキストファイルのロードプロミスの生成
//
	SmapPromise.loadText = function( url, headers ) {
		return SmapPromise.loadURL( url, 'text', headers );
	}

//
//	関数: SmapPromise.loadJSON()
//		JSONファイルのロードプロミスの生成
//
	SmapPromise.loadJSON = function( url, headers ) {
/*
			var
			promise = Smap.promise( function( resolve, reject) {
				Smap.loadText( url, headers ).then(
					function( text ) {
						resolve( JSON.parse( text ) );
					},
					function( error ) {
						reject( error );
					}
				);
			});
*/
		var
			promise = SmapPromise.loadText( url, headers ).then(
				function( text ) {
					return JSON.parse( text );
				}
			).then( null, function( error ) {
				return SmapPromise.promise.reject( error );
			} );
		return promise;
	}

//
//	関数: SmapPromise.loadCSV()
//		CSVファイルのロードプロミスの生成
//
	SmapPromise.loadCSV = function( url, separator, headers ) {
/*
		var
			promise = Smap.promise( function( resolve, reject ) {
				separator = ( separator ) ? separator : ',' ;
				Smap.loadText( url, headers ).then(
					function( text ) {
						var
		    				result = [];
						text.split( '\n' ).forEach( function( line ) {
							result.push( line.split( separator ) );
						} );
						resolve( result );
					},
					function( error ) {
						reject( error );
					}
				);
			});
/*/
		var
			separator = ( separator ) ? separator : ',' ,
			promise = SmapPromise.loadText( url, headers ).then(
				function( text ) {
					var
	    				result = [];
					text.split( '\n' ).forEach( function( line ) {
						result.push( line.split( separator ) );
					} );
					return result;
				}
			).then( null, function( error ) {
				return SmapPromise.promise.reject( error );
			} );
		return promise;
	};

//
//	関数: SmapPromise.loadPNGZip()
//		PNGZIP(zip圧縮したPNGファイル)のロードプロミスの生成
//
	SmapPromise.loadPNGZip = function( url, headers ) {
/*		var
			promise = Smap.promise( function( resolve, reject ) {
				Smap.loadURL( url, 'arraybuffer', headers ).then(
					function( data ) {
						var
							blob,
							zip,
							img = new Image(),
							keys;

						if( data.byteLength == 0) {
							reject( 'Error: Smap.loadPNGZip, data length = 0' );
						} else {
							zip = new JSZip( data );
							keys = Object.keys( zip.files );
							if ( keys.length > 0 ) {
								blob = new Blob( [ zip.file( keys[ 0 ] ).asArrayBuffer() ], { type: 'image/png' } );
								SmapPromise.loadImage( URL.createObjectURL( blob ) ).then( function( img ) {
 									resolve( img );
								}, function() {
									reject( 'Error: Smap.loadPNGZip, create img url error' );
								} );
							} else {
								reject( 'Error: zip file empty' );
							}
						}
					},
					function( error ) {
						reject( error );
					}
				);
			} );
*/
		var
			promise = SmapPromise.loadURL( url, 'arraybuffer', headers ).then(
				function( data ) {
					var
						blob,
						zip,
						p,
						keys;

					if( data.byteLength == 0) {
						p = SmapPromise.promise.reject( 'Error: SmapPromise.loadPNGZip, data length = 0' );
					} else {
						zip = new JSZip( data );
						keys = Object.keys( zip.files );
						if ( keys.length > 0 ) {
							blob = new Blob( [ zip.file( keys[ 0 ] ).asArrayBuffer() ], { type: 'image/png' } );
							p = SmapPromise.loadImage( URL.createObjectURL( blob ) ).then( function( img ) {
								return img;
							} ).then( null,  function( err ) {
								return SmapPromise.promise.reject( 'Error: Smap.loadPNGZip, create img url error' );
							} );
						} else {
							p = SmapPromise.promise.reject( 'Error: zip file empty' );
						}
					}
					return p;
				}
			).then( null, function( error ) {
				return SmapPromise.promise.reject( error );
			} );
		return promise;
	};

} ) ();
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

///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.map.js, 2016-10-26, 西岡 芳晴 ( NISHIOKA Yoshiharu ),
//		Smap.map()関数を提供，S-mapのコア部分
///////////////////////////////////////////////////////////////////////////////

'use strict';

( function( Smap ) {

//
//	関数: Smap.map()
//		map生成用ファクトリー関数
//
	Smap.map = function( aMap ) {
		var
			mapFactory = Smap.engine[ Smap.DEFAULT_ENGINE ], // デフォルトマップエンジン
			newMap = {
				bases: [ Smap.DEFAULT_BASE ],
				center: { lat: 0, lng: 0 },
				minZoom: 0,
				markers: [],
				maxZoom: Smap.ZOOM_LIMIT,
				overlays: [],
				owner: document.body,
				zoom: 0,
				controls: [ 'attribution', 'scale', 'zoom' ],
				controllers: [],
				draggable: true,
				elevationModel: Smap.DEFAULT_ELEVATION_MODEL,
			},
			promise,
			geolocationId = null,		// Geolocation用のIDとハンドラー
			locationFound = null,
			locationError = null;

		function getClassName( object ) { // 内部関数，objectの”クラス”名称を識別
			var
				className = null;
			if ( typeof object.latLngs !== 'undefined' ) { // latLngsプロパティがあればPolyline
				className = 'Polyline';
			} else if ( typeof object.latLng !== 'undefined' ) { // latLngプロパティがあり
				if ( typeof object.content !== 'undefined' ){ // contentプロパティがあればポップアップ
					className = 'Popup';
				} else {                                        // contentプロパティがなければマーカー
					className = 'Marker';
				}
			} else if ( typeof object.url !== 'undefined' || typeof object.drawTile !== 'undefined' ) {
														 // urlプロパティまたはdrawTileメソッドがあればレイヤー
				className = 'Layer';
			} else if ( typeof object.check !== 'undefined' ) { // checkメソッドがあればController
				className = 'Controller';
			} else if ( typeof object.geometries !== 'undefined' ) { // geometriesプロパティがあればGeometryGroup
				className = 'GeometryGroup';
			}
			return className;
		}

		if ( typeof aMap === 'string' ) {
			newMap.owner = document.getElementById( aMap );
		} else{
			for ( var key in aMap ) {
				if ( key === 'owner' ) {	//ownerの場合はコピーを取らない
					newMap[ key ] = aMap[ key ];
				} else {
					newMap[ key ] = Smap.copy( aMap[ key ] );
				}
			}
			if ( typeof aMap !== 'undefined' &&	typeof aMap.hf !== 'undefined' ){
				newMap.elevationModel.hf = aMap.hf
			}
		}
		if ( typeof newMap.owner === 'string' ) {
			newMap.owner = document.getElementById( newMap.owner );
		}
		if ( typeof newMap.overlays === 'undefined' ) {
			newMap.overlays = [];
		}

		// レイヤー生成メソッド
		newMap.layer = function( aLayer ) {
			aLayer.map = this;
			return Smap.map.layer( aLayer );	// レイヤー生成は外部ファイルSmap.map.layer.jsに分離
		}

		newMap.createElevationModel = function( anElevationModel ) {
			var
				newElevationModel = {};

			if( typeof anElevationModel === 'string' ) {
				// 文字列ならばurlと解釈
				newElevationModel = { url: anElevationModel }
			} else {
				// 文字列でないならばオブジェクトと解釈，そのままコピー
				for ( var key in anElevationModel ) {
					newElevationModel[ key ] = anElevationModel[ key ];
				}
			}
			newElevationModel.map = this;
			return Smap.map.createElevationModel( newElevationModel );	// 生成は外部ファイルに分
		}
		
		// デフォルト処理メソッドの追加
		// 一般的にはパラメータ処理を行った後，各エンジンが用意する内部関数を呼び出す．
		// これらは，各マップエンジンで書き換えられる可能性がある

		newMap.add = function( object ) {
			switch ( getClassName( object ) ) {
				case 'Controller': return this.addController( object );
				case 'Polyline': return this.addPolyline( object );
				case 'Popup': return this.addPopup( object );
				case 'Marker': return this.addMarker( object );
				case 'Layer': 
					if ( object.base ) {
						return this.addBase( object );
					} else {
						return this.addOverlay( object );
					}
				case 'GeometryGroup': return this.addGeometryGroup( object );
			}
		}

		newMap.addBase = function( aLayer ) {
			var
				newLayer;
			if ( typeof this._addBase !== 'undefined' ) {
				newLayer = this.layer( aLayer );
//				aLayer.map = this;
//				newLayer = Smap.map.layer( aLayer );
				newLayer.base = true;
				this.bases.push( newLayer );
				return this._addBase( newLayer );
			}
		}

		newMap.addControl = function( id, position, contents ){
			var
				control = id,					// 引数処理用，第1引数がオブジェクトと仮定して代入
				newControl = {					// return用オブジェクト
					className: 'control',
					position: 'bottomright',
				};

			// 引数の型により，controlオブジェクトを設定
			if ( typeof arguments[0].id === 'undefined' ) { 
				// 第1引数がidフィールドを持たないオブジェクトならば
				control = { id: id };
				if ( typeof position !== 'undefined' ) {
					control.position = position;
				};
				if ( typeof contents !== 'undefined' ) {
					control.contents = contents;
				};
			};

			//positionのデフォルト値の変更
			newControl.position = ( control.id === 'layer' ) ? 'topright'   : newControl.position;
			newControl.position = ( control.id === 'scale' ) ? 'bottomleft' : newControl.position;

			// 引数処理用からreturn用オブジェクトへプロパティを転写
			for( key in control ) {
				switch ( key ) {
					default:	newControl[ key ] = control[ key ];
				}
			}
			
			if ( newControl.contents && ( typeof newControl.contents === 'string' ) ) {
				var
					cts = document.getElementById( newControl.contents );
				newControl.contents =  ( cts ) ? cts : newControl.contents;
			}

			// controlsに追加
			newMap.controls.push( newControl );

			// 地図描画エンジン固有のコントロールメソッドを呼び出す
			if ( typeof this._control !== 'undefined' ) {
				this._control( newControl );
			}
			return newControl;
		}

		newMap.addController = function( aController ) {
			var
				newController = null;

			if ( typeof aController === 'string' ) {
				for ( var key in Smap.controller ) {
					if ( key === aController ) {
						newController = Smap.controller[ key ]();
					}
				}
			} else {
				newController = aController;
			}
			if ( newController ) {
				newController.map = this;
				this.controllers.push( newController );
			}
			return newController;
		}

		newMap.addGeometryGroup = function( geometries ) {
			return this.createGeometryGroup( geometries );
		}

		newMap.createGeometryGroup = function( geometries ) {
			var
				geometryGroup,				// 引数処理用
				newGeometryGroup = {
					className: 'GeometryGroup',
					geometries: [],
					visibility: true
				};

			// 引数の型により，geometryGroupオブジェクトを設定
			if  ( !geometries ) {
				geometryGroup = { geometries: [] };
			} else if ( geometries.geometries ) {
				geometryGroup = geometries;
			} else {
				geometryGroup = { geometries: geometries };
			}

			// geometryGroupからnewGeometryGroupへプロパティ(geometriesは除く)を転写
			for( key in geometryGroup ) {
				switch ( key ) {
					case 'visibility':
					default:		 	newGeometryGroup[ key ] = geometryGroup[ key ];
				}
			}

			newGeometryGroup.add = function( object ) {
				var
					newObject;

				switch ( getClassName( object ) ) {
					case 'Polyline':		newObject = newMap.polyline( object );				break;
					case 'Popup':	 		newObject = newMap.createPopup( object );			break;
					case 'Marker': 			newObject = newMap.marker( object );				break;
					case 'Layer':			newObject = newMap.image( object );			 		break;
									// Layerの場合は画像のみ対応
					case 'GeometryGroup': 	newObject = newMap.createGeometryGroup( object );	break;
				}
				this.geometries.push( newObject );
				return newObject;
			}
			newGeometryGroup.remove = function( object ) {
				if ( typeof object !== 'undefined' ) {
					var
						n = this.geometries.indexOf( object );
					if ( n >= 0 ) {
						newMap.remove( object );
						newGeometryGroup.geometries.splice( n, 1 );
					}
				}	else	{
					this.geometries.forEach( function( aGeometry ) {
						newMap.remove( aGeometry );
					} );
					newGeometryGroup.geometries = [];
				}
			}
			newGeometryGroup.setVisibility = function( aVisibility ) {
				if ( typeof aVisibility !== 'undefined' ) {
					this.visibility = aVisibility;
					this.geometries.forEach( function( aGeometry ) {
						aGeometry.setVisibility( aVisibility );
					} );
				}
				return this.visibility;
			}
			newGeometryGroup.getVisibility = newGeometryGroup.setVisibility;
			geometryGroup.geometries.forEach( function( aGeometry ) {
				newGeometryGroup.add( aGeometry );
			} );
			return newGeometryGroup;
		};
/*
		newMap.addImage = function( aUrl, bounds, params ) {
			return this.image( aUrl, bounds, params );
		}
*/
		newMap.image = function( aUrl, bounds, params ) {
			var
				image = aUrl,
				newImage = { 
					className: 'Image',
					visibility: true,
					opacity: 1,
				};

			// 入力値用imageオブジェクトセット
			if ( typeof image.url === 'undefined' ) { 
				// 第1引数がurlフィールドを持たないオブジェクトならば引数から再構築
				image = params ? params : {};
				image.url = aUrl;
				image.bounds = bounds;
			};

			// imageから，必要に応じて整形しながらnewImageへプロパティを転送
			for ( key in image ) {
				switch ( key ) {
					case 'bounds':	newImage[ key ] = Smap.bounds( image.bounds ); break;
					default: 		newImage[ key ] = image[ key ];
				}
			}

			newImage.getPixel = function( latLng, zoom ){
				var
					p,
					pt = Smap.latLngToPoint( latLng, zoom ),
					sw = Smap.latLngToPoint( this.bounds.sw, zoom ),
					ne = Smap.latLngToPoint( this.bounds.ne, zoom );
				
					function get( img ) {
						var
							d,
							i = Math.floor( ( pt.x - sw.x ) / ( ne.x - sw.x ) * img.width ),
							j = Math.floor( ( pt.y - ne.y ) / ( sw.y - ne.y ) * img.height ),
							canvas = document.createElement( 'canvas' ),
							ctx = canvas.getContext( '2d' );

						if ( i < 0 || i > img.width || j < 0 || j > img.height ) {
							return null;
						} else {
							canvas.globalCompositeOperation = 'copy';	// 不透明度を正確に取得するため

							canvas.width = 1;
							canvas.height = 1;
							ctx.drawImage( img, i, j, 1, 1, 0, 0, 1, 1 );
							// 以下の書式は簡簡潔だが，Androidで不要なディザがかかる可能性あり
//							ctx.drawImage( img, -i, -j );
							d = ctx.getImageData( 0, 0, 1, 1 ).data;

							// 以下の書式は無駄な転送が入るが不要なディザはかかりにくい
//							canvas.width = img.width;
//							canvas.height = img.height;
//							ctx.drawImage( img, 0, 0 );
//							d = ctx.getImageData( i, j, 1, 1 ).data;

							return Array.prototype.slice.apply( d );
						}
					}

				if ( newImage.image ) {
					p = Smap.promise( function( resolve, reject ) {
						resolve( get( newImage.image ) );
					} );
				} else {
					p = Smap.loadImage( newImage.url ).then( function( img ) {
						newImage.image = img;
						return get( img );
					} );
				}
				return p;
			}

			newImage.setVisibility = function( aVisibility ) {
				if ( typeof aVisibility !== 'undefined' ) {
					this.visibility = aVisibility;
				}
				if ( typeof this._setVisibility !== 'undefined' ) {
					this.visibility = this._setVisibility( aVisibility );
				}
				return this.visibility;
			}
			newImage.getVisibility = 	newImage.setVisibility;


			// マップエンジン固有の生成メソッドの呼び出し
			if ( typeof this._image !== 'undefined' ) {
				this._image( newImage );
			}
			return newImage;
		}

		newMap.addMarker = function( aLatLng, params ){
			var
				marker =this.marker( aLatLng, params );
			this.markers.push( marker );
			return marker;
		}

		newMap.marker = function( aLatLng, params ){
			var
				marker = aLatLng, // 入力値用
				newMarker = { className: 'Marker', visibility: true, draggable: false, opacity: 1 };

			// 入力値用markerオブジェクトセット
			if ( typeof marker.latLng === 'undefined' ) { 
				// 第1引数がlatLngフィールドを持たないオブジェクトならば
				marker = params ? params : {};
				marker.latLng = aLatLng;
			};

			// markerから，必要に応じて整形しながらnewMarkerへプロパティを転送
			for ( key in marker ) {
				switch ( key ) {
					case 'latLng':	newMarker[ key ] = Smap.latLng( marker.latLng ); break;
					default: 		newMarker[ key ] = marker[ key ];
				}
			}

			// メソッドの実装
			newMarker.closePopup = function() {
				if ( typeof this._closePopup !== 'undefined' ) {
					this._closePopup();
				}
				return this;
			}

			newMarker.on = function( aType, aHandler ) {
				if ( typeof this._on !== 'undefined' ) {
					return this._on( aType, aHandler );
				}
			}
			newMarker.addEventListener = newMarker.on;

			newMarker.openPopup = function() {
				if ( typeof this._openPopup !== 'undefined' ) {
					this._openPopup();
				}
				return this;
			}

			newMarker.set = function( key, value ){
				switch ( key ) {
					case 'latLng': return this.setLatLng( value ); break;
					case 'opacity': return this.setOpacity( value ); break;
					case 'popup': return this.setPopup( value ); break;
					case 'visibility': return this.setVisibility( value ); break;
					default: this[ key ] = value;
				}
			};
			newMarker.get = newMarker.get;

			newMarker.setLatLng = function( aLatLng ) {
				if ( typeof aLatLng !== 'undefined' ) {
					this.latLng = Smap.latLng( aLatLng );
				}
				if ( typeof this._setLatLng !== 'undefined' ) {
					this.latLng = this._setLatLng( aLatLng );
				}
				return this.latLng;
			}
			newMarker.getLatLng = newMarker.setLatLng;

			newMarker.setOpacity = function( anOpacity ) {
				if ( typeof anOpacity !== 'undefined' ) {
					this.opacity = anOpacity;
				}
				if ( typeof this._setOpacity !== 'undefined' ) {
					this.opacity = this._setOpacity( anOpacity );
				}
				return this.opacity;
			};
			newMarker.getOpacity = newMarker.setOpacity;

			newMarker.setPopup = function( aPopup ) {
				if ( typeof aPopup !== 'undefined' ) {
					if ( typeof aPopup === 'string' ) {
						aPopup = { content: aPopup }
					}
					aPopup.latLng = this.latLng;
					this.popup = newMap.createPopup( aPopup );
					if ( typeof this._setPopup !== 'undefined' ) {
						this._setPopup( this.popup );
					}
				}
				return this.popup;
			}
			newMarker.getPopup = newMarker.setPopup;

			newMarker.setVisibility = function( aVisibility ) {
				if ( typeof aVisibility !== 'undefined' ) {
					this.visibility = aVisibility;
				}
				if ( typeof this._setVisibility !== 'undefined' ) {
					this.visibility = this._setVisibility( aVisibility );
				}
				return this.visibility;
			}
			newMarker.getVisibility = 	newMarker.setVisibility;

			// マップエンジン固有の生成メソッドの呼び出し
			if ( typeof this._marker !== 'undefined' ) {
				this._marker( newMarker );
			}

			// Popupの生成
			if ( newMarker.popup ) {
				newMarker.setPopup( newMarker.popup );
			}
//			newMarker.original.bindPopup( newMarker.popup.original );

			return newMarker;
		}

		newMap.addOverlay = function( aLayer ){
			var
				newLayer

			if ( typeof this._addOverlay !== 'undefined' ) {
				newLayer = this.layer( aLayer );
//				aLayer.map = this;
//				newLayer = Smap.map.layer( aLayer );
				this.overlays.push( newLayer );
				return this._addOverlay( newLayer );
			}
		}

		newMap.addPolyline = function( latLngs, close, style ){
			// 2014-11-18現在，そのままpolylineに渡しています．
			// newMap内の，何らかのリストで管理するように変更予定
			return this.polyline( latLngs, close, style );
		}

		newMap.polyline = function( latLngs, close, style ){
			var
				polyline = latLngs, // 引数処理用，第1引数がオブジェクト仮定して代入
				newPolyline = {
					className: 'Polyline',
					close: false,
					latLngs: [],
					visibility: true,
					style: {
						stroke: '#000',
						strokeOpacity: 1,
						strokeWidth: 1,
						fillColor: 'none',
						fillOpacity: 1
					},
				};

			// 引数の型により，polylineオブジェクトを設定
			if ( typeof arguments[0].latLngs === 'undefined' ) { 
				// 第1引数がlatLngsフィールドを持たないオブジェクトならば
				polyline = { latLngs: latLngs, close: close, style: style };
			};

			// polylineから整形しながらnewPolylineへプロパティを転写
			for( key in polyline ) {
				switch ( key ) {
					case 'latLngs':
						polyline[ key ].forEach( function( latLng, index ){
							newPolyline.latLngs[ index ] = Smap.latLng( latLng  );
						} );
						break;
					case 'style':
						for ( var key2 in polyline[ key ] ) {
							newPolyline.style[ key2 ] = polyline[ key ][ key2 ];
						};
						break;
					case 'close':
					case 'visibility':
					default:	 	newPolyline[ key ] = polyline[ key ];
				}
			}

			// newPolyineにメソッドを実装
			newPolyline.addLatLng = function( aLatLng ) {
				var
					latLng = Smap.latLng( aLatLng );

				this.latLngs.push( latLng );
				if ( typeof this._addLatLng !== 'undefined' ) {
					return this._addLatLng( latLng );
				}
				return latLng;
			}
			newPolyline.on = function ( aType, aHandler ) {
				if ( typeof this._on !== 'undefined' ) {
					return this._on( aType, aHandler );
				}
			};
			newPolyline.addEventListener = newPolyline.on;
			newPolyline.set = function( key, value ){
				switch ( key ) {
					case 'latLngs': 	return this.setLatLngs( value );
					case 'visibility':	return this.setVisibility( value );
					default: 			this[ key ] = value; return value;
				}
			};
			newPolyline.get = newPolyline.set;
			newPolyline.setLatLngs = function( latLngs ) {
				if ( typeof latLngs !== 'undefined' ) {
					this.latLngs = [];
					
					latLngs.forEach( function( latLng ){
						newPolyline.latLngs.push( Smap.latLng( latLng  ) );
					} );
					if ( typeof this._setLatLngs !== 'undefined' ) {
						this._setLatLngs( latLngs );
					}
				}
				return this.latLngs;
			}
			newPolyline.getLatLngs = newPolyline.setLatLngs;
			newPolyline.setVisibility = function( visibility ) {
				if ( typeof this._setVisibility !== 'undefined' ) {
					this.visibility = this._setVisibility( visibility );
					return this.visibility;
				}
			};
			newPolyline.getVisibility = newPolyline.setVisibility;

			// (存在すれば)エンジン固有の_polyline()を実行
			if ( typeof this._polyline !== 'undefined' ) {
				this._polyline( newPolyline );	// _polyline()は戻り値を返さない
			};
			return newPolyline;
		}

		newMap.addPopup = function( aPopup, aContent ){
			// 引数の型により，popupオブジェクトを設定
			if ( typeof arguments[0].latLng === 'undefined' ) { 
				// 第1引数がlatLngフィールドを持つオブジェクトでないならば
				aPopup = { latLng: aPopup, content: aContent }
			}
			this.popup = this.createPopup( aPopup );

			this.popup.setOpen( true );
//			this.popup.original.openOn( this.original );

			return this.popup;
		}

		newMap.createPopup = function( aPopup ){
			var
				newPopup = {};

			// aPopupから整形しながらnewPopupへプロパティを転写
			for( key in aPopup ) {
				switch ( key ) {
					case 'latLng':	newPopup.latLng = Smap.latLng( aPopup.latLng ); break;
					default:	 	newPopup[ key ] = aPopup[ key ];
				}
			};

			newPopup.isOpen = function() {
				if ( typeof this._isOpen !== 'undefined' ) { 
					return this._isOpen();
				}
//				console.log( 'isOpen' );
			}

			newPopup.setContent = function( aContent ) {
				if ( typeof this._setContent !== 'undefined' ) {
					return this._setContent( aContent );
				};
			}
			newPopup.getContent = newPopup.setContent;
			
			newPopup.setOpen = function( open ) {
				if ( typeof this._setOpen !== 'undefined' ) {
					return this._setOpen( open );
				};
			}
			newPopup.getOpen = newPopup.setOpen;

			// (存在すれば)エンジン固有の_createPopup() を実行
			if ( typeof this._createPopup !== 'undefined' ) {
				this._createPopup( newPopup );
			}
			return newPopup;
		}

		newMap.findBase = function( aLayer ) {
			var
				newLayer = null;

			if ( typeof aLayer === 'undefined' ) {
				newLayer = [];
				for ( var i = 0; i < this.bases.length; i++ ) {
					newLayer.push( this.bases[ i ] );
				}
			} else if ( typeof aLayer === 'string' ) {
				for ( var i = 0; i < this.bases.length; i++ ) {
					if ( this.bases[ i ].id === aLayer ) {
						newLayer = this.bases[ i ];
						break;
					}
				}	
				if ( newLayer == null ) {
					for ( var i = 0; i < this.bases.length; i++ ) {
						if ( this.bases[ i ].title === aLayer ) {
							newLayer = this.bases[ i ];
							break;
						}
					}
				}
			} else { // aLayerがオブジェクトの時
				for ( var i = 0; i < this.bases.length; i++ ) {
					if ( this.bases[ i ] === aLayer ) {
						newLayer = this.bases[ i ];
						break;
					}
				}
			}
			return newLayer;
		}

		newMap.cutImage = function( bounds, aZoom, aFileName, params ) {
			var
				pList = [],
				b = ( bounds ) ? Smap.bounds( bounds ) : this.setBounds(),
				p;

			pList.push( this.setBase().cutImage( b, aZoom ) );
			this.overlays.forEach( function( overlay ) {
				if ( overlay.cutImage && overlay.visibility ) {
					pList.push( overlay.cutImage( b, aZoom ) );
				}
			} );
			p = Smap.promiseFinishing( pList ).then( function( canvasList ) {
				var
					canvas = document.createElement( 'canvas' ),
					ctx = canvas.getContext( '2d' );
				canvas.width = canvasList[0].width;
				canvas.height = canvasList[0].height;
				canvasList.forEach( function( aCanvas ) {
					if( aCanvas ) { // レイヤーでエラーが発生するとnullが返される
						ctx.drawImage( aCanvas, 0, 0 );
					}
				} );
				if ( aFileName ){
					if ( aFileName.split( '.' ).pop() === 'kmz' ) {
						Smap.mapToKMZ( canvas, b, aFileName, params );
					} else {
						Smap.saveURL( canvas.toDataURL(), aFileName );
					}
				}
				return canvas;
			} );
			return p;
		}

		newMap.findControl = function( aControl ) {
			var
				newControl = null;

			for ( var i = 0; i < this.controls.length; i++ ) {
				if ( this.controls[ i ].id === aControl ) {
					newControl = this.controls[ i ];
					break;
				}
			}
			return newControl;
		}

		newMap.findOverlay = function( aLayer ) {
			var
				newLayer = null;

			if ( typeof( aLayer ) === 'undefined' ) {
				newLayer = [];
				for ( var i = 0; i < this.overlays.length; i++ ) {
					newLayer.push( this.overlays[ i ] );
				}	
			} else if ( typeof aLayer === 'string' ) {
				for ( var i = 0; i < this.overlays.length; i++ ) {
					if ( this.overlays[ i ].id === aLayer ) {
						newLayer = this.overlays[ i ];
						break;
					}
				}	
				if ( newLayer == null ) {
					for ( var i = 0; i < this.overlays.length; i++ ) {
						if ( this.overlays[ i ].title === aLayer ) {
							newLayer = this.overlays[ i ];
							break;
						}
					}
				}
			} else { // aLayerがオブジェクトの時
				for ( var i = 0; i < this.overlays.length; i++ ) {
					if ( this.overlays[ i ] === aLayer ) {
						newLayer = this.overlays[ i ];
						break;
					}
				}
			}
			return newLayer;
		}

		newMap.layerControl = function( show ){
			if ( show ) {
				this.addControl( 'layer' )
			} else {
				this.removeControl( 'layer' );
			}
			return show;
		}

		newMap.off = function( aType, aHandler ){
			if ( typeof this._off !== 'undefined' ) {
				return this._off( aType, aHandler );
			}
		}
		newMap.removeEventListener = newMap.off;

		newMap.on = function( aType, aHandler ){
			switch ( aType ){						// 共通ベント処理
				case 'locationfound':
					locationFound = aHandler;		// 常に1つのハンドラーしか扱えない
					break;
				case 'locationerror':
					locationError = aHandler;		// 常に1つのハンドラーしか扱えない
					break;
			}
			if ( typeof this._on !== 'undefined' ) {
				return this._on( aType, aHandler );
			}
		}
		newMap.addEventListener = newMap.on;

		newMap.redraw = function( object ) {
			if ( this.setBase().redraw ) {
				this.setBase().redraw();
			}
			this.overlays.forEach( function( layer ) {
				if ( layer.redraw ) {
					layer.redraw();
				}
			} );
			return this;
		};

		newMap.remove = function( object ) {
			switch ( getClassName( object ) ) {
				case 'Controller' : this.removeController( object ); break;
				case 'Polyline' : this.removePolyline( object ); break;
				case 'Popup' : this.removePopup( object ); break;
				case 'Marker' : this.removeMarker( object ); break;
				case 'Layer' : 
					if ( this.findOverlay( object ) ) {
						this.removeOverlay( object );
					} else if ( this.findBase( object ) ){
						this.removeBase( object );
					}
					break;
				case 'GeometryGroup' : this.removeGeometryGroup( object ); break;
			}
		}

		newMap.removeImage = function( anImage ) {
			if ( typeof this._removeImage !== 'undefined' ) {
				this._removeImage( anImage );
			}
		}

		newMap.removeBase = function( aLayer ) {
			var
				currentBase = this.setBase();

			aLayer = this.findBase( aLayer );
			if ( aLayer ) { // aLayerが背景レイヤーの場合のみ
				for ( var i = 0; i < this.bases.length; i++ ) {
					if ( this.bases[ i ] === aLayer ) {
						this.bases.splice( i, 1 );
						if ( currentBase === aLayer ) {
							this._setBase( this.bases[ this.bases.length - 1 ] );
						}
						if ( typeof this._removeBase !== 'undefined' ) {
							this._removeBase( aLayer );
						}
						break;
					};
				}
			}
		}

		newMap.removeControl = function( id ){
			this.controls.forEach( function( control, i) {
				if ( control.id === id || control.id === id.id ) {
											// 後半はidがオブジェクトの場合
					control.done();
					newMap.controls.splice( i, 1 );
				}
			});
		}

		newMap.removeController = function( aController ) {
			this.controllers.forEach( function( controller, key, controllers ) {
				if ( controller === aController || controller.id === aController ) {
					controllers.splice( key, 1 );
				}
			} );
		}

		newMap.removeGeometryGroup = function( aGeometryGroup ) {
			aGeometryGroup.geometries.forEach( function( geometry ) {
				switch ( getClassName( geometry ) ) {
					case 'Polyline' : 		newMap.removePolyline( geometry );		break;
					case 'Popup' : 			newMap.removePopup( geometry );			break;
					case 'Marker' :
						if ( typeof newMap._removeMarker !== 'undefined' ) {
							newMap._removeMarker( geometry );
						};
						break;
					case 'Layer' : 			newMap._removeOverlay( geometry );		break;
					case 'GeometryGroup' :	newMap.removeGeometryGroup( geometry );	break;
				}
			} );
		};

		newMap.removeOverlay = function( aLayer ){
			if ( typeof this._removeOverlay !== 'undefined' ) {
				if ( typeof aLayer === 'undefined' ) {
					this.overlays.forEach( function( layer ) {
						newMap._removeOverlay( layer ); //thisでは呼べないのでnewMap
					} );
					this.overlays = [];
				} else {
					aLayer = this.findOverlay( aLayer );
					if ( aLayer ) {
						for ( var i = 0; i < this.overlays.length; i++ ) {
							if ( this.overlays[ i ] === aLayer ) {
								this.overlays.splice( i, 1 );
								if ( aLayer.geometries ) {
									// leafletのKMLレイヤーの場合独自実装なので，追加したgeometryを削除する
									aLayer.geometries.forEach( function( geometry ){
										switch ( geometry.className ) {
											case 'Marker': 		newMap._removeMarker( geometry ); break;
											case 'Polyline': 	newMap._removePolyline( geometry ); break;
											case 'Image':		newMap._removeImage( geometry ); break;										break;
										}
									} );
									aLayer.geometries = [];
								}
								return this._removeOverlay( aLayer );
							}
						}
					}
				}
			}
		}

		newMap.removeMarker = function( aMarker ) {
			if ( this.markers.length > 0 ) {
				if ( typeof this._removeMarker !== 'undefined' ) {
					if ( typeof aMarker === 'undefined' ) {
						this.markers.forEach( function( marker ) {
							newMap._removeMarker( marker ); //thisでは呼べないのでnewMap
							} );
						this.markers = [];
					} else {
						this._removeMarker( aMarker );
					}
				}
			}
		}

		newMap.removePolyline = function( object ) {
			if ( typeof this._removePolyline !== 'undefined' ) {
				if ( typeof object.latLngs !== 'undefined' ) { // latLngsプロパティがあればPolyline
					return this._removePolyline( object );
				}
			}
		}

		newMap.removePopup = function( aPopup ) {
			if ( typeof this._removePopup !== 'undefined' ) {
				if ( typeof aPopup === 'undefined' ) {
					if ( this.popup ) {
						this._removePopup( this.popup );
						this.popup = null;
					}
				}else {
					this._removePopup( aPopup );
				}
			}
		}

		// 廃止予定
		newMap.scaleControl = function( show ){
			if ( show ) {
				this.addControl( 'scale' );
			} else {
				this.removeControl( 'scale' );
			}
			return( show );
		}

		newMap.set = function( key, value ){
			switch ( key ) {
				case 'bounds':		return this.setBounds( value );
				case 'draggable':	return this.setDraggable( value );
				case 'center':		return this.setCenter( value );
				case 'visibility':	return this.setVisibility( value );
				case 'zoom':		return this.setZoom( value );
				default:			this[ key ] = value; return value;
			}
		}
		newMap.get = newMap.set;

		newMap.setBase = function( aLayer ) {
			var
				newLayer = null;
			if ( typeof( aLayer ) === 'undefined' ) {
				if ( typeof this._setBase !== 'undefined' ) {
					newLayer = this._setBase();
				}
			} else {
				if ( typeof( aLayer ) === 'object' ) {
					newLayer = aLayer;
				} else if ( typeof( aLayer ) === 'number' && this.bases.length > aLayer ) {
					newLayer = this.bases[ aLayer ];
				} else {
					newLayer = this.findBase( aLayer );
				}
				if ( typeof this._setBase !== 'undefined' ) {
/*
					if ( maps[ '2d' ] ) {
						console.log( maps[ '2d' ].bases[ 0 ].original );
					}
*/
					this._setBase( newLayer );
				}
			}
			return newLayer;
		}
		newMap.getBase = newMap.setBase;

		newMap.setBounds = function( bounds ) {
			var
				newBounds = Smap.bounds( bounds );
			if ( typeof this._setBounds !== 'undefined' ) {
				if ( arguments.length === 0 ) {
					newBounds = this._setBounds();
				} else { // arguments.length > 1
					newBounds = this._setBounds( newBounds );
				}
			} else {
				// _setBounds()が実装されていない場合
				// 現在は簡易処理で，中心と横幅のみを考慮
				if ( arguments.length === 0 ) {
					var
						z = this.setZoom(),
						p = Smap.latLngToPoint( this.setCenter(), z ),
						rect = this.owner.getClientRects()[0],
						sw = Smap.pointToLatLng( { x: p.x - rect.width / 2, y: p.y + rect.height / 2 }, z ),
						ne = Smap.pointToLatLng( { x: p.x + rect.width / 2, y: p.y - rect.height / 2 }, z );
					newBounds = Smap.bounds( sw, ne );
				} else {
					var
						lat = ( newBounds.ne.lat + newBounds.sw.lat ) / 2,
						lng = ( newBounds.ne.lng + newBounds.sw.lng ) / 2,
						wRad = Math.abs( newBounds.ne.lng - newBounds.sw.lng ) / 180 * Math.PI,
						w = wRad * Smap.EARTH_R * Math.cos( lat / 180 * Math.PI ),
						scale = w / this.owner.getClientRects()[0].width;
					this.setView( { center: [ lat, lng ], zoom: Smap.scaleToZoom( scale, lat) } );
				}
			}
			return newBounds;
		}
		newMap.getBounds = newMap.setBounds;

		newMap.setCenter = function( aCenter, params ) {
			if ( typeof this._setCenter !== 'undefined' ) {
				if ( typeof aCenter !== 'undefined' ) {
					return this._setCenter( Smap.latLng( aCenter ), params );
				} else {
					return this._setCenter();
				}
			} else if ( typeof this._setView !== 'undefined' ) {
				return this._setView( aCenter ? { center: aCenter } : undefined, params ).center;
			}
		}
		newMap.getCenter = newMap.setCenter;

		newMap.setDraggable = function( aDraggable ) {
			if ( typeof aDraggable !== 'undefined' ) {
				this.draggable = aDraggable;
				if ( typeof this._setDraggable !== 'undefined' ) {
					this._setDraggable( aDraggable );
				}
			}
			return this.draggable;
		}
		newMap.getDraggable = newMap.setDraggable;

		newMap.setHf = function( aHf ) {
			if ( typeof this._setHf !== 'undefined' ) {
				return this._setHf( aHf );
			}
		}
		newMap.getHf = newMap.setHf;

		newMap.setHome = function( aHome ) {
			if ( typeof aHome !== 'undefined' ) {
				this.home = aHome;
			}
			return this.home;
		};
		newMap.getHome = newMap.setHome;

//		newMap.setScale = function( aScale ) { // m/ピクセル
		newMap.setScale = function( aScale, params ) { // m/ピクセル
			// paramsが使われない？
			if ( typeof this._setScale !== 'undefined' ) {
				return this._setScale( aScale );
			} else if ( typeof this._setZoom !== 'undefined' ) {

					lat = ( this.setCenter() ) ? this.setCenter().lat : this.center.lat,
					z;
				if ( typeof aScale === 'undefined' ) {
					z = ( this._setZoom() ) ? this._setZoom() : this.zoom;
				}	 else 	{
					z = this._setZoom( Smap.scaleToZoom( aScale, lat ) );
				}
				return Smap.zoomToScale( z, lat )
			} else if ( typeof this._setView !== 'undefined' ) {
				var
					lat = ( this.setCenter() ) ? this.setCenter().lat : this.center.lat,
					z;
				if ( typeof aScale !== 'undefined' ) {
					z = Smap.scaleToZoom( aScale, lat );
				}
//				return Smap.zoomToScale( this._setView( { zoom: z }, params ).zoom, lat );
// 2016-01-08　以下を変更．より昔はこの上の行で，なぜ変えたのかわからない
//				return Smap.zoomToScale( this._setView( ).zoom, lat );
				return Smap.zoomToScale( this._setView( { zoom: z } ).zoom, lat );
			}
		}
		newMap.getScale = newMap.setScale;

		newMap.setView = function( aView, params ) {
			if ( typeof this._setView !== 'undefined' ) {
/*				if ( typeof params === 'undefined' ) {
					params = {};
				}
				if ( typeof params.pitch === 'undefined' ) {
					params.pitch = -90;
				}
*/				return this._setView( aView, params );
			} else if ( typeof this._setCenter !== 'undefined' ) {
				if ( typeof aView !== 'undefined' ) {
					var
						animate = ( typeof params === 'undefined' ) || params.animate;
					if ( typeof aView.zoom !== 'undefined' ) {
//						newMap._setZoom( aView.zoom, { animate: animate } );
					}
					if ( typeof aView.center !== 'undefined' ) {
						newMap._setCenter( aView.center, null, { animate: animate }  );
					}
				}
				return { center: newMap._setCenter(), zoom: newMap._setZoom() }
			}
		}
		newMap.getView = newMap.setView;

		newMap.setVisibility = function( aVisibility ) {
			if ( typeof aVisibility !== 'undefined' ) {
				this.owner.style.visibility = aVisibility ? 'visible' : 'hidden';
				// displayに'none'を設定するとLeafletエラーが出て，Cesiumはblockにしても表示されない．
//				this.owner.style.display = aVisibility ? 'block' : 'none';
				if ( typeof this._setVisibility !== 'undefined' ) {
					this._setVisibility( aVisibility );
				}
			} else {
				aVisibility = ( this.owner.style.visibility !== 'hidden' );
			}
			return aVisibility;
		}
		newMap.getVisibility = newMap.setVisibility;

		newMap.setZoom = function( aZoom, params ) {
			if ( typeof this._setZoom !== 'undefined' ) {
				return this._setZoom( aZoom, params );
			} else if ( typeof this._setScale !== 'undefined' ) {
				var
					lat = ( this.setCenter() ) ? this.setCenter().lat : this.center.lat,
					z = ( typeof aZoom !== 'undefined' ) ? Smap.zoomToScale( aZoom, lat ) : null;

					return Smap.scaleToZoom( this._setScale( z, params ), lat )
			} else if ( typeof this._setView !== 'undefined' ) {
				return this._setView( aZoom ? { zoom: aZoom } : undefined, params ).zoom;
			}
		}
		newMap.getZoom = newMap.setZoom;

		// 内部利用メソッド
		// カメラから注視点までのピクセル距離を返す．
		newMap.getRangePx = function() {
			return this.owner.getClientRects()[0].width / 2 / Math.tan( this.fov / 2 / 180 * Math.PI );
		}

		// コントローラ用メソッド
		var
			nearWork = 0; // newMap.near用変数

		newMap.move = function( dx, dy, dz ) {
			if ( typeof this._move === 'undefined' ) { //デフォルト処理
				// 経度の移動量はきちんと計算していないしていない
				// setCenterを使うのはオーバーヘッドがおおきそう
				var
					c = this.setCenter(),
					f= 360 / Math.pow( 2, this.setZoom() ) / 256;
				this.setCenter( [ c.lat - dy * f, c.lng + dx * f * 1.3 ] );
				if ( typeof dz !== 'undefined' ) {
					this.near( dz );
				}
			} else { // エンジン固有の処理があれば呼び出す
				this._move( dx, dy, dz );
			}
		}

		newMap.roll = function( s, t ) {
			if ( typeof this._roll === 'undefined' ) { //デフォルト処理
				//　未実装
			} else { // エンジン固有の処理があれば呼び出す
				this._roll( s, t );
			}
		}

		newMap.rollCamera = function( s, t ) {
			if ( typeof this._rollCamera === 'undefined' ) { //デフォルト処理
				//　未実装
			} else { // エンジン固有の処理があれば呼び出す
				this._rollCamera( s, t );
			}
		}

		newMap.near = function( dz ) {
			if ( typeof this._near === 'undefined' ) { //デフォルト処理
				nearWork += dz;
				if ( nearWork > 1 ) {
					this.setZoom( Math.max( this.setZoom() - 1, this.minZoom ) );
					nearWork = 0;
				} else if ( nearWork < -1 ) {
					this.setZoom( Math.min( this.setZoom() + 1, this.maxZoom ) );
					nearWork = 0;
				}
			} else { // エンジン固有の処理があれば呼び出す
				this._near( dz );
			}
		}
/*
		newMap.up = function( dz ) {
			if ( typeof this._up === 'undefined' ) { //デフォルト処理
				nearWork += dz;
				if ( nearWork > 1 ) {
					this.setZoom( Math.max( this.setZoom() - 1, this.minZoom ) );
					nearWork = 0;
				} else if ( nearWork < -1 ) {
					this.setZoom( Math.min( this.setZoom() + 1, this.maxZoom ) );
					naerWork = 0;
				}
			} else { // エンジン固有の処理があれば呼び出す
				this._up( dz );
			}
		}
*/
		newMap.startLocate = function( params ) {
			var
				options = {},
				success = function( p ) {	// 成功時の関数
					var
						coords = p.coords,
						ll = { lat: coords.latitude, lng: coords.longitude },
						event = {
							original: p,
							latLng: ll,
							time: new Date( p.timestamp ),
							altitude: coords.altitude,
							accuracy: coords.accuracy,
							altitudeAccuracy: coords.altitudeAccuracy,
							heading: coords.heading,
							speed: coords.spped
						};

					locationFound( event );
					if ( newMap.automove ) {
						newMap.setCenter( ll );
					}
				},
				error = function( p ){	// 失敗時の関数
					var
						event = {
							original: p,
							code: p.code,
							message: p.message
						}

					if ( locationError ){
						locationError( event );
					}
				};

			this.automove = ( params.automove ) ? params.automove : false;
			if ( params.enabledHighAccuracy ) {
				options.enabledHighAccuracy =  params.enabledHighAccuracy;
			}
			if ( params.timeout ) {
				options.timeout =  params.timeout;
			}
			if ( params.maxiumumAge ) {
				options.maxiumumAge =  params.maxiumumAge;
			}

			if ( typeof this._startLocate === 'undefined' ) { //デフォルト処理
				if ( typeof navigator.geolocation !== 'undefined' 
						&& locationFound ){
					if ( params.watch ) {
						if ( geolocationId !== null ){
							navigator.geolocation.clearWatch( geolocationId );
						}
						geolocationId = navigator.geolocation.watchPosition(
								success, error, options );
					} else {
						navigator.geolocation.getCurrentPosition( success, error, options );
					}
				}
			} else { // エンジン固有の処理があれば呼び出す
				this._startLocate( params );
			}
			return this;
		}

		newMap.stopLocate = function() {
			if ( typeof this._stopLocate === 'undefined' ) { //デフォルト処理
				if ( typeof navigator.geolocation !== 'undefined' 
						&& ( geolocationId !== null ) ){
					navigator.geolocation.clearWatch( geolocationId );
					geolocationId = null;
				}
			} else { // エンジン固有の処理があれば呼び出す
				this._stopLocate();
			}
			return this;
		}

		newMap.reset = function() { //ビューをリセット
			this.setView( this.home );
			this.setHf( 1 );
			return this;
		}

		// Map.exe() actionを指定した速度で実行する
		newMap.exec = function( action, factor, timestamp ){
			var
				f, d;

        	if ( action ){
        		if ( action.command ) {	// commandプロパティが存在すればコマンド指定
					f = action.velocity * ( ( typeof factor === 'undefined' ) ? 1 : factor );
					d = f / ( ( this.fps ) ? this.fps : 60 );
            		switch ( action.command ) {
            			case 'near':		this.near( d );				break;
            			case 'moveX':		this.move( d, 0 );			break;
            			case 'moveY':		this.move( 0, d );			break;
            			case 'moveZ':		this.move( 0, 0, d );		break;
            			case 'rollX':		this.roll( d, 0 ); 	 		break;
            			case 'rollY':		this.roll( 0, d );			break;
            			case 'rollCameraX':	this.rollCamera( d, 0 );	break;
            			case 'rollCameraY':	this.rollCamera( 0, d );	break;
            			case 'resetView':	this.reset();				break;
		    	    }
				} else {	// 関数であるとみなして実行する
					// actionに渡す引数は2015-09-18現在検討中．LeapMotionとも整合性を取る？
					action( { factor: factor, timestamp: timestamp } );
				}
			}
		}


		// エンジンの選定
		if ( newMap.engine in Smap.engine ) {
			mapFactory = Smap.engine[ newMap.engine ];
		}

		// homeプロパティが設定されていなければ，現在のビューをホームに設定
		if ( !newMap.home ) {
			newMap.setHome( { 
				center: newMap.center, zoom: newMap.zoom
			} );
		}

		// ローカル関数: mapSetup エンジンによる初期化呼出し語に行う処理
		function mapSetup( newMap ) {
			var
				array;

			// 背景レイヤーの設定
			for ( var i = 0; i < newMap.bases.length; i++ ) {
//				newMap.bases[ i ] = newMap.layer( newMap.bases[ i ] )
				newMap.bases[ i ] = newMap.layer( newMap.bases[ i ], false )
			}

			newMap.setBase( newMap.bases[ newMap.bases.length - 1 ] );

			// オーバーレイレイヤーの設定
			for ( var i = 0; i < newMap.overlays.length; i++ ) {
				newMap.overlays[ i ] = newMap.layer( newMap.overlays[ i ] )
//				newMap.layer( newMap.overlays[ i ] )
//				console.log( newMap.overlays[ i ].original );
			}

			// 標高モデルの生成
			newMap.elevationModel = newMap.createElevationModel( 
				newMap.elevationModel
			);

			// コントロールの初期化
			array = newMap.controls.concat();
			newMap.controls = [];
			array.forEach( function( control ) {
				newMap.addControl( control );
			} );
		}

		// コントローラーチェック用ループ
		var
			checkTime = new Date().getTime();

		function checkLoop() {
			var
				time = new Date().getTime();

			newMap.fps = 1000 / ( time - checkTime );	
					// newMapのfpsプロパティに1秒当たりのフレーム数をセット
			checkTime = time;
			requestAnimationFrame( checkLoop );
			if ( newMap.getVisibility() ) {
				newMap.controllers.forEach( function( controller ) {
					if ( controller.check ) {
						controller.check();
					}
				} );
			}
		}
		checkLoop();

		// デフォルトコントローラーの追加
		if ( Smap.controller ) {
			if ( Smap.controller.gamepad ) {
						// ゲームパッドコントローラーがロードされていれば追加
				newMap.addController( Smap.controller.gamepad() );
			}
			if ( Smap.controller.leap ) { 
						// Leap Motionコントローラーがロードされていれば追加
				newMap.addController( Smap.controller.leap() );
			}
		}

		// エンジンが用意するmap作成関数を呼び出す．
		newMap = mapFactory( newMap ); 

		if ( newMap.promise ) {		// promiseプロパティがあればプロミスして取り扱う
			newMap.promise.then( function( aMap ) {
				mapSetup( aMap );
			} );
		} else {		// promiseプロパティがなければそのままmapSetup()を実行する
			mapSetup( newMap );
		}
		return newMap
	}

//
//	関数: Smap.createMap()
//		Mapオブジェクトを作成するプロミスを生成します
//
	Smap.createMap = function( aMap ) {
		var
			newMap = Smap.map( aMap ),
			promise = newMap.promise;
		
		if ( !promise ) {
			promise = Smap.promise( function( resolve, reject ) {
				resolve( newMap );
			} );
		}
		return promise;
	}

// 関数: Smap.copy()
//		オブジェクトをコピーします
//
	Smap.copy = function( src ){
		var
			result;

		if ( src instanceof Array ) {
			result = [];
			for ( var i = 0; i < src.length; i++  ) {
				result.push( src[ i ] );
			};
		} else if ( typeof src === 'object' ) {
			result = {}
			for ( var key in src ) {
				result[ key ] = Smap.copy( src[ key ] );
			}
		} else {
			result = src;
		}
		return result;
	}

} )( Smap );
///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.map.layer.js, 2016-11-28, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		Smap.map.layer()関数を提供．
//		Smap.map.jsから呼び出される
///////////////////////////////////////////////////////////////////////////////

'use strict';

( function( Smap ) {

//
//	関数: Smap.map.layer()
//		Layerオブジェクトを生成します．
//
	Smap.map.layer = function ( aLayer, addToOriginal ){
		var
			newLayer = {
				attribution: '',
				attribution_url: '',	// 廃止予定
				attributionUrl: '',
				maxNativeZoom: null,
				maxZoom: Smap.ZOOM_LIMIT,
				minZoom: 0,
				opacity: 1,
				title: '',
				url: '',
				visibility: true,
				tiling: ( typeof aLayer.url === 'undefined' ) || ( aLayer.url.indexOf( '{z}' ) >= 0 )
			};

		// Layerの種類に依存しないメソッドの実装
		newLayer.convertTile = null;

		newLayer.redraw = function() {
			if ( typeof this._redraw !== 'undefined') {
				this._redraw();
			}
			return this;
		}

		newLayer.set = function( params, aValue ) {
			var
				that = this;

			function setSingle( aKey, aValue ) {
				switch( aKey ) {
					case 'legend':		return that.setLegend( aValue );
					case 'opacity':		return that.setOpacity( aValue );
					case 'visibility':	return that.setVisibility( aValue );
					case 'url':		return that.setUrl( aValue );
					default: {	// maxZoom, maxNativeZoom, minZoomは有効
						if ( typeof aValue !== 'undefined' ) {
							that[ aKey ] = aValue;
						}
						return that._set( aKey, aValue );
					}
				}
			}
			if ( typeof params === 'string' ) {
				if ( typeof aValue !== 'undefined' ) {
					setSingle( params, aValue );
					this.redraw();
				}
				return setSingle( params );
			} else if ( typeof params === 'object' ) {
				for ( key in params ) { 
					setSingle( key, params[ key ] );
				}
				this.redraw();
				return this;
			}
		}
		newLayer.get = newLayer.set;

		newLayer.setLegend = function( aLegend ) {
			if ( typeof aLegend !== 'undefined' ) {
				if ( typeof aLayer.legend === 'string' ) {
					Smap.loadJSON( aLegend ).then( function( data ){
						this.legend = data;
					});						
				} else {
					this.legend = aLegend;
				}
			}
			return this.legend;
		}
		newLayer.getLegend = newLayer.setLegend;

		newLayer.setOpacity = function( aOpacity ) {
			if ( typeof aOpacity !== 'undefined' ) {
				this.opacity = aOpacity;
			}
			if ( typeof this._setOpacity !== 'undefined' ) {
				return this._setOpacity( aOpacity );
			}
		}
		newLayer.getOpacity = newLayer.setOpacity;

		newLayer.setUrl = function( aUrl ) {
			if ( typeof aUrl !== 'undefined' ) {
				this.url = aUrl;
			}
			if ( typeof this._setUrl !== 'undefined' ) {
				this._setUrl( aUrl );
			}
			return this.url;
		}
		newLayer.getUrl = newLayer.setUrl;
		
		newLayer.setVisibility = function( aVisibility ) {
			if ( this.map.findBase( this ) || this.map.findOverlay( this ) ) {
				// 背景レイヤまたはオバーレイレイヤに含まれるならば
				if ( typeof aVisibility !== 'undefined' ) {
					this.visibility = aVisibility;
					if ( typeof this._setVisibility !== 'undefined' ) { // _setVisibilityが実装されていれば
						this.visibility = this._setVisibility( aVisibility );
					} else {											// _setVisibilityが実装されてなければ
																		// KMLを想定
				 		this.geometries.forEach( function( g ) {
				 	 		g.setVisibility( aVisibility );
						} );
					}

				}
				return this.visibility;
			}
		}
		newLayer.getVisibility = newLayer.setVisibility;

		newLayer.getPixelRGB = function( latLng, zoom ) {
			var
				promise;

			promise = this.getPixel( latLng, zoom ).then( function( d ) {
				return ( d ) ? d[0] * 256 * 256 + d[1] * 256 + d[2] : null;
			} );	
			return promise;
		}

		newLayer.getPixelInfo = function( latLng, zoom, test ) {
			var
				result;

			if ( typeof test === 'undefined' ) {
				test = function( unit, rgb ) {
					var
						key = unit[ 'fill' ];
					return rgb == ( ( typeof key == 'string' ) ? parseInt( key, 16 ) : key );
				}
			}
			result = this.getPixelRGB( latLng, zoom ).then( function( rgb ) {
				var
					legendItem;

				if( newLayer.legend ) { // 凡例が読み込まれているならば
					newLayer.legend.some( function( unit ){
						if ( test( unit, rgb ) ) {
							legendItem = unit;
						}
						return test( unit, rgb );
					 } );
				}
				return legendItem;
			} );
			return result;
		}


		/* newLayerのプロパティに上書き */
		for ( var key in aLayer ) {
			switch ( key ) {
				case 'legend': newLayer.setLegend( aLayer.legend );	break;
				default:
					newLayer[ key ] = aLayer[ key ];
			}
		}

		/* Layerの種類に依存する処理 */
		if ( newLayer.tiling ) { // タイルレイヤー
			tileLayer( newLayer, addToOriginal );
		} else { // 単独レイヤー
			// ファイルタイプの自動判別
			if ( typeof newLayer.filetype === 'undefined' ) {
				switch ( newLayer.url.split( '.' ).pop() ) {
					case 'png' :		newLayer.filetype = 'png'; break;
					case 'gif' :		newLayer.filetype = 'gif'; break;
					case 'jpg' :
					case 'jpeg' :		newLayer.filetype = 'jpg'; break;
					case 'zvg' :
					case 'zvgz' : 		newLayer.filetype = 'svgz'; break;
					case 'kml' : 		newLayer.filetype = 'kml'; break;
					case 'kmz' :		newLayer.filetype = 'kmz'; break;
					case 'geojson' :	newLayer.filetype = 'geojson'; break;
					case 'topojson' :	newLayer.filetype = 'topojson'; break;
				}
			}
			switch ( newLayer.filetype ) {
				case 'kml' : kmlLayer( newLayer ); break;
				case 'kmz' : kmlLayer( newLayer ); break;
				case 'jpg': 
				case 'png':
				case 'gif': newLayer = newLayer.map.image( newLayer ); break;
				default: newLayer = newLayer.map.image( newLayer ); break;
			}
		}
		return newLayer;
	}

	// tileLayer: タイルレイヤーを描画する関数
	function tileLayer( aLayer, addToOriginal ) {
		aLayer.tileSize = ( aLayer.tileSize ) ? aLayer.tileSize : 256;
		aLayer.getPixel = function( latLng, zoom ) {
			var
				z = ( this.maxNativeZoom ) ? Math.min( zoom , this.maxNativeZoom ) : zoom,
				pt = Smap.latLngToPoint( latLng, Math.round( z ) ),
				x = Math.floor( pt.x / this.tileSize ),
				y = Math.floor( pt.y / this.tileSize ),
				url = this.getTileUrl( { x: x, y: y, z: Math.round( z ) } );

			return Smap.loadImagePixel( url, pt.x - x * this.tileSize,  pt.y - y * this.tileSize );
		}
		aLayer.cutImage = function( bounds, aZoom, aFileName, params ) {
			var
				p,
				pList = [],
				size = this.tileSize,
				b = ( bounds ) ? Smap.bounds( bounds ) : this.map.setBounds(),
				z = ( aZoom ) ? aZoom : this.map.setZoom(),
				sw = Smap.latLngToPoint( b.sw, z ),
				ne = Smap.latLngToPoint( b.ne, z ),
				canvas = document.createElement( 'canvas' ),
				ctx = canvas.getContext( '2d' );

			canvas.width = ne.x - sw.x;
			canvas.height = sw.y - ne.y;
			ctx.fillStyle = 'rgba(0, 0, 0, 0)';
			ctx.fillRect( 0, 0, canvas.width, canvas.height );
			ctx.globalAlpha = this.setOpacity();

		for( var x = Math.floor( sw.x / size ); x < ne.x / size; x++ ) {
				for( var y = Math.floor( ne.y / size ); y < sw.y / size; y++ ) {
					( function() {
						var
							p1,
							url,
							x2 = x * size - sw.x,
							y2 = y * size - ne.y;

						if ( aLayer.drawTile ) {
							p1 = Smap.promise( function( resolve, reject ) {
								var	
									p2,
									canvas2 = document.createElement( 'canvas' ),
									ctx2 = canvas2.getContext( '2d' );
								canvas2.width = size;
								canvas2.height = size;
								p2 = aLayer.drawTile( canvas2, { x: x, y: y, z: z } );
								( ( p2 ) ? p2 : Smap.promise() ).then( function() {
									ctx.drawImage( canvas2, x2, y2, canvas2.width, canvas2.height );
									resolve();
								}, function() {
									resolve();
								} );
							} );
						} else {
							url = aLayer.getTileUrl( { x: x, y: y, z: z } );
							p1 = Smap.loadImage( url ).then( function( img ) {
								var
									p2;

								if ( aLayer.convertTile ) {
									var	
										canvas2 = document.createElement( 'canvas' ),
										ctx2 = canvas2.getContext( '2d' );
									canvas2.width = img.width;
									canvas2.height = img.height;
									ctx2.drawImage( img, 0, 0 );
									p2 = aLayer.convertTile( canvas2, { x: x, y: y, z: z } );
									return ( ( p2 ) ? p2 : Smap.promise() ).then( function() {
										ctx.drawImage( canvas2, x2, y2, img.width, img.height );
									} );
								} else {
									ctx.drawImage( img, x2, y2, img.width, img.height );
									return Smap.promise();
								}
							}, function(){} );
						}
						pList.push( p1 );
//						pList.push( p2 );
					} ) ();
				}
			}
			p = Smap.promiseFinishing( pList ).then( function() {
				if ( aFileName ){
					if ( aFileName.split( '.' ).pop() === 'kmz' ) {
						Smap.mapToKMZ( canvas, b, aFileName, params );
					} else {
						Smap.saveURL( canvas.toDataURL(), aFileName );
					}
				}
				return canvas;
			} );
			return p;
		}

		if ( typeof aLayer.getTileUrl === 'undefined' ) {
			aLayer.getTileUrl = function( coord ) {
				var
					y = coord.y,
					z = coord.z,
					z2 = Math.pow( 2, z ),
					newUrl = this.url;

				coord.x -= Math.floor( coord.x / z2 ) * z2;
				for ( var key in coord ) {
					while ( newUrl.indexOf( '{' + key + '}' ) >= 0 ) {
						newUrl = newUrl.replace( '{' + key + '}', coord[ key ] );
					}
				};
				newUrl = newUrl.replace( '{ys}', z2 - y - 1 );
				newUrl = newUrl.replace( '{ye}', ( z ===  0 ) ? y : z2 / 2 - y - 1 );
				for ( var key in this ) {
					while ( newUrl.indexOf( '{' + key + '}' ) >= 0 ) {
						newUrl = newUrl.replace( '{' + key + '}', this[ key ] );
					}
				}
				return newUrl;
			}
		}
		// マップエンジン固有の生成メソッドの呼び出し
		if ( typeof aLayer.map._tileLayer !== 'undefined' ) {
/*			var
			  ll = aLayer.map._tileLayer( aLayer );
			console.log( map.overlays );
			return ll;
*/
			var
				ato = ( addToOriginal !== 'undefined' ) || addToOriginal;
			return aLayer.map._tileLayer( aLayer, ato );
		}
	}

	// ローカル関数: kmlLayer ... kmlレイヤーを描画する関数
	function kmlLayer( aLayer ) {
		var
			styles = {},
			stylemaps = {},
			xmlPromise;

		aLayer.geometries = [];
		if ( typeof aLayer.map._kmlLayer !== 'undefined' ) {
			return aLayer.map._kmlLayer( aLayer );
		} else {
			if( aLayer.filetype === 'kmz' ) {
				xmlPromise = Smap.loadURL( aLayer.url, 'arraybuffer' ).then( function ( data ) {
					var
						zip = new JSZip( data ),
						domParser = new DOMParser,
						text;

					text = zip.files[ 'doc.kml' ].asText();
					return domParser.parseFromString( text, 'application/xml' );
				} );
			} else {
				xmlPromise = Smap.loadXml( aLayer.url );
			}
		}
		xmlPromise.then( function( xml ) {
			var
				el = xml.querySelector( 'kml > *' );	// kml直下の最初の要素を取り出す

			switch ( el.tagName ) {
				case 'Document':		drawDocument( el ); break;
				case 'Placemark':		drawPlacemark( el ); break;
				case 'Folder':			drawFolder( el ); break;
				case 'GroundOverlay':	drawGroundOverlay( el); break;
			}
			aLayer.setVisibility( aLayer.visibility );
		} );

		// 以降KML描画用関数
		// ローカル関数: drawDocument
		function drawDocument( el ) {
			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				switch ( el2.tagName ) {
					case 'Placemark':	  drawPlacemark( el2 );     break;
					case 'GroundOverlay': drawGroundOverlay( el2 ); break;
					case 'Folder':        drawFolder( el2 );        break;
					case 'Document':	  drawDocument( el2 );      break;
					case 'Style':         drawStyle( el2 );         break;
					case 'StyleMap':      drawStyleMap( el2 );      break;
				}
			} );
		}

		// ローカル関数: getNodeValue
		// ある要素(parent)から，要素名nameのノード値を取り出す．
		// nameを省略するかnullにすると，parentのノード値を取り出す．
		//    ※この関数は外に出しても有効かもしれない
		function getNodeValue( parent, name, defaultValue ) {
			var
				el = ( name ) ? parent.getElementsByTagName( name )[0] : parent,
				el2 = ( el ) ? el.firstChild : null,
				cdata = ( el2 && el2.nodeName === '#cdata-section' ) ;

			return ( el2 ) ? ( ( cdata ) ? el2.textContent : el2.nodeValue ) : defaultValue;
		}
		

		// ローカル関数: drawStyle
		function drawStyle( el ) {
			var
			  	id = el.getAttribute( 'id' );

			styles[ id ] = {};
			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				switch ( el2.tagName ) {
				  case 'IconStyle':
				  	var
						icon = el2.getElementsByTagName( 'Icon' )[0],
						hotspot = el2.getElementsByTagName( 'hotSpot' )[0],
						x, y, xunits, yunits;
					styles[ id ].icon = {
						// KMLのデフォルトアイコンサイズは32pxのよう？（記述が見当たらない）
						size: [ 32, 32 ],
						url: getNodeValue( icon, 'href' )
					};
					if ( hotspot ) {
						x = hotspot.getAttribute( 'x' );
						y = hotspot.getAttribute( 'y' );
						switch (  hotspot.getAttribute( 'xunits' ) ) {
						  case 'fraction':     x = x * 32; break;
						  case 'pixcels':      x = x; break;
						  case 'insetPixcels': x = ( 32 - x ); break;
						}
						switch (  hotspot.getAttribute( 'yunits' ) ) {
						  case 'fraction':     y = ( 1 - y ) * 32; break;
						  case 'pixcels':      y = ( 32 - y ); break;
						  case 'insetPixcels': y = y; break;
						}
						styles[ id ].icon.anchor = { x: x, y: y };
					}
				  	break;
				  case 'LineStyle':
				  	var
						c = getNodeValue( el2, 'color' ),
						width = getNodeValue( el2, 'width' );
					if ( typeof c !== 'undefined' ) {
						styles[ id ].stroke = '#' + c.substr( 6, 2 ) + c.substr( 4, 2 ) + c.substr( 2, 2 );
						styles[ id ].strokeOpacity = parseInt( c.substr( 0, 2 ), 16 ) / 256;
					}
					if ( typeof width !== 'undefined' ) {
						styles[ id ].strokeWidth = width;
					}
				  	break;
				  case 'PolyStyle':
				  	var
						c = getNodeValue( el2, 'color' );

					if ( typeof c !== 'undefined' ) {
						styles[ id ].fill = '#' + c.substr( 6, 2 ) + c.substr( 4, 2 ) + c.substr( 2, 2 );
						styles[ id ].fillOpacity = parseInt( c.substr( 0, 2 ), 16 ) / 256;
					}
					if ( getNodeValue( el2, 'fill', 1 ) == '0' ) {
						styles[ id ].fill = 'none';
					}
					if ( getNodeValue( el2, 'outline', 1 ) == '0' ) {
						styles[ id ].stroke = 'none';
					}
				  	break;
				  case 'BalloonStyle':
					styles[ id ].balloonStyle = getNodeValue( el2, 'text' );
				  	break;
				}
			} );
		}

		// ローカル関数: drawStyleMap
		function drawStyleMap( el ) {
			var
			  	id = el.getAttribute( 'id' ),
				stylemap = {};

			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				switch ( el2.tagName ) {
					case 'Pair':
					  	stylemap[ getNodeValue( el2, 'key' ) ] = getNodeValue( el2, 'styleUrl' );
					    break;
				}
			} );
			stylemaps[ id ] = stylemap;
		}

		// ローカル関数: drawFolder
		function drawFolder( el ){
			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				switch ( el2.tagName ) {
					case 'Placemark':	    drawPlacemark( el2 );     break;
					case 'GroundOverlay':	drawGroundOverlay( el2 ); break;
					case 'Folder':			drawFolder( el2 );        break;
					case 'Document':	    drawDocument( el2 );      break;
					case 'Style':	        drawStyleMap( el2 );      break;
					case 'StyleMap':	    drawStyleMap( el2 );      break;
				}
			} );
		}

		// ローカル関数: drawPlacemark
		function drawPlacemark( el ){
			var
			  	style,
				context = {},
				visibility = true,
				open = false;

			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				var
				  	styleUrl;

				switch ( el2.tagName ) {
				  case 'Point':         drawPoint( el2, style, context, visibility, open ); break;
				  case 'LineString':    drawLineString( el2, style, context );    break;
				  case 'LinearRing':    drawLinearRing( el2, style, context );    break;
				  case 'Polygon':       drawPolygon( el2, style, context );       break;
				  case 'MultiGeometry': drawMultiGeometry( el2, style, context ); break;
				  case 'Style':	        drawStyleMap( el2 );      break;
				  case 'StyleMap':	    drawStyleMap( el2 );      break;
				  case 'visibility' :
				  	visibility = getNodeValue( el2 ) == 1;
				  	break;
				  case 'description' :
				  	context.contents = getNodeValue( el2 );
				  	break;
				  case 'styleUrl':
				  	styleUrl = getNodeValue( el2 );
					if ( styleUrl[0] === '#' ) {
						if ( styles[ styleUrl.substr( 1 ) ] ) {
							style = styles[ styleUrl.substr( 1 ) ];
						} else if ( stylemaps[ styleUrl.substr( 1 ) ] ) {
							var
								styleUrl2 = stylemaps[ styleUrl.substr( 1 ) ][ 'normal' ];
							if ( styles[ styleUrl2.substr( 1 ) ] ) {
								style = styles[ styleUrl2.substr( 1 ) ];
							}
						}
					}
				    break;
				  case 'open':
				  	open = getNodeValue( el2 ) === '1';
				  	break;
				  case 'name' :
				  	context.name = getNodeValue( el2 );
				  	break;
				}
			} );
		}

		// ローカル関数: drawPoint
		function drawPoint( el, style, context, visibility, open ) {
			var
				contents = context.contents,
				lnglat = getNodeValue( el, 'coordinates' ).split( ',' ),
				newMarker,
				marker = {
					latLng: Smap.latLng( lnglat[1], lnglat[0] ),
					visibility: ( typeof visibility !== 'undefined' ) ? visibility : 1
				};

			if ( style && style.icon ) {
				marker.icon = style.icon;
			}
			if ( contents !== null ) {
				if ( style && style.balloonStyle ) {
					marker.popup = style.balloonStyle.replace('$[description]', contents );
				} else {
					var 
						name = ( context.name ) ? context.name : '';
					marker.popup = '<b>' + name  + '</b><br />' + contents;
				}
			}
			newMarker = aLayer.map.marker( marker );
			if ( open ) {
				newMarker.openPopup();
			}
			aLayer.geometries.push( newMarker );
		}

		// ローカル関数: drawCoordinates
		function loadCoordinates( el ) {
			var
				latLngs = [],
				lngLats = getNodeValue( el ).split( ' ' );

			lngLats.forEach( function ( lngLat ) {
				var
					s = lngLat.split( ',' );

				if ( s.length > 1 ) {
					latLngs.push( Smap.latLng( s[1], s[0] ) );
				}
			} );
			return latLngs;
		}

		// ローカル関数: drawLineString
		function drawLineString( el, style, context ) {
		  	var
		  		latLngs = loadCoordinates( el.getElementsByTagName( 'coordinates' )[0] ),
				pl = aLayer.map.polyline( latLngs, false, style );

			aLayer.geometries.push( pl );
			if ( context.contents ) {
				pl.on( 'click', function( event ) {
					aLayer.map.addPopup( event.latlng, context.contents );
				} );
			}
		}

		// ローカル関数: drawLinearRing
		function drawLinearRing( el, style, context ) {
			var
				latLngs = loadCoordinates( el.getElementsByTagName( 'coordinates' )[0] ),
				pl = aLayer.map.polyline( latLngs, true, style );

			aLayer.geometries.push( pl );
			if ( context.contents ) {
				pl.on( 'click', function( event ) {
					aLayer.map.addPopup( event.latlng, context.contents );
				} );
			}
		}

		// ローカル関数: drawPolygon
		function drawPolygon( el, style, context ){
			var
				contents = context.contents;
			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				switch ( el2.tagName ) {
				  case 'outerBoundaryIs':
				  	drawLinearRing(  el2.getElementsByTagName( 'LinearRing' )[0], style, contents );
					break;
				  case 'innerBoundaryIs':
					console.log( 'innerBoundaryIs 未実装');
//				  	drawLinearRing(  el2.getElementsByTagName( 'LinearRing' )[0], style, contents );
					break;
				}
			} );
		}

		// ローカル関数: joinPath
		// 相対パスを解決して絶対パスに変換します(簡易版）
		// 「../」で、階層をさかのぼるもののみt対応
		function joinPath( base, path) {
		    if ( base.substr(base.length-1) != '/') {
		        base = base.split( '/' );
		        base.length--;
		        base = base.join( '/' );
		    } else {
		        base = base.substr( 0, base.length - 1 );
		    }
		    base = base.split( '\\' );
		    while( 0 == path.indexOf( '../' ) ) {
		        base.length--;
		        path = path.substr( 3 );
		    }
		    base = base.join( '/' );
		    return base + '/' + path;
		}

		// ローカル関数: drawGroundOverlay
		function drawGroundOverlay( el ){
			var
				image = {};

			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				var
					sw, ne;

				switch ( el2.tagName ) {
				  case 'Icon':
					image.url = joinPath( aLayer.url, getNodeValue( el2, 'href' ) );
					break;
				  case 'LatLonBox':
					sw = [ getNodeValue( el2, 'south' ), getNodeValue( el2, 'west' ) ];
					ne = [ getNodeValue( el2, 'north' ), getNodeValue( el2, 'east' ) ];
					image.bounds = Smap.bounds( [ sw, ne ] );
					break;
				  case 'Style':         drawStyle( el2 );         break;
				  case 'StyleMap':      drawStyleMap( el2 );      break;
				}
			} );
			aLayer.geometries.push( aLayer.map.image( image ) );
		}

		// ローカル関数: drawMultiGeometry
		function drawMultiGeometry( el, style, context ){
			Array.prototype.slice.call( el.childNodes ).forEach( function( el2 ) {
				switch ( el2.tagName ) {
				  case 'Point':         drawPoint( el2, style, context );         break;
				  case 'LineString':    drawLineString( el2, style, context );    break;
				  case 'LinearRing':    drawLinearRing( el2, style, context );    break;
				  case 'Polygon':       drawPolygon( el2, style, context );       break;
				  case 'MultiGeometry': drawMultiGeometry( el2, style, context ); break;
				}
			} );
		}

	}

} ) ( Smap );
///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.engine.leaflet.js, 2016-10-24, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		Smap.engine.leaflet()関数を提供．leaflet.jsのラッパー
///////////////////////////////////////////////////////////////////////////////
'use strict';

( function( Smap ) {

//
//	関数: Smap.engine.leaflet()
//		Leaflet用map生成ファクトリー関数．
//
	Smap.engine.leaflet = function( map ){ 
		var
			attributionControl,
			layerControl = null;

		// ライブラリ依存のmapオブジェクト作成とコントロールの初期化
//		layerControl = L.control.layers().addTo( original ),

		map.original = new L.Map( map.owner, {
			center: map.center,
			minZoom: map.minZoom,
			maxZoom: map.maxZoom,
			zoom: Math.round( map.zoom ),
			zoomControl: false,			// Mapに戻ってから追加します
			scaleControl: false,		// Mapに戻ってから追加します
			attributionControl: false,	// Mapに戻ってから追加します
		} );

		// 内部関数の実装
//		map._tileLayer = function( aLayer ) {
		map._tileLayer = function( aLayer, addToOriginal ) {
			var
				attr = aLayer.attribution;

			if ( aLayer.attributionUrl ) {
				attr = '<a href="' + aLayer.attributionUrl
						 + '" target="_blank">' +attr + '</a>';
			} else if ( aLayer.attribution_url ) {					// 廃止予定
				attr = '<a href="' + aLayer.attribution_url
						 + '" target="_blank">' +attr + '</a>';
			}
			if ( !aLayer.drawTile && !aLayer.convertTile ) {
				var
					options = {
						minZoom: aLayer.minZoom,
						maxZoom: aLayer.maxZoom,
						maxNativeZoom: aLayer.maxNativeZoom,
						attribution: attr,
						opacity: ( typeof aLayer.opacity !== 'undefined' ) ? aLayer.opacity : 1,
					};
				if ( typeof aLayer.tileSize !== 'undefined' ) {
					options.tileSize = aLayer.tileSize;
				};
				if ( typeof aLayer.bounds !== 'undefined' ) {
					var
						b = aLayer.bounds;
					options.bounds = L.latLngBounds( [ [ b.sw.lat, b.sw.lng ], [ b.ne.lat, b.ne.lng ] ] );
				}
//				new L.TileLayer( aLayer.url, options );
				aLayer.original = new L.TileLayer( aLayer.url, options );
			} else {
		  	  		aLayer.original = new L.TileLayer.Canvas( {
					minZoom: aLayer.minZoom,
					maxZoom: aLayer.maxZoom,
					maxNativeZoom: aLayer.maxNativeZoom,
					attribution: attr,
					opacity: ( typeof aLayer.opacity !== 'undefined' ) ? aLayer.opacity : 1, 
				} );
				aLayer.original.drawTile = function ( canvas, coord, zoom ) {
					coord.z = zoom; 
					// coord.xを，0 ～ Math.pow( 2, zoom )内に正規化する
					coord.x = coord.x - ( coord.x >> zoom ) *  Math.pow( 2, zoom );
					if ( aLayer.drawTile ) {
						var
				        	ts = aLayer.tileSize,
				        	nz = aLayer.maxNativeZoom,
				        	ctx = canvas.getContext( '2d' ),
				        	p;

				        if ( nz && nz < coord.z ) {
				        	var
				        		canvas2 = document.createElement( 'canvas' ),
				        		ctx2 = canvas.getContext( '2d' );

				        	canvas2.width = ts;
				        	canvas2.height = ts;
				        	canvas.width = ts * Math.pow( 2, coord.z - nz );
				        	canvas.height = ts * Math.pow( 2, coord.z - nz );
				        	p = aLayer.drawTile( canvas2, { x: coord.x, y: coord.y, z: nz } );
				        	p = ( ( p ) ? p :  Smap.promise() ).then( function() {
					        	ctx.drawImage( canvas2, 0, 0, ts, ts, 0, 0, canvas.width, canvas.height );
					        } );
					    } else {
							p = aLayer.drawTile( canvas, coord );
						}
						if ( aLayer.convertTile ) {
							( ( p ) ? p :  Smap.promise() ).then( function() {
								aLayer.convertTile( canvas, coord );
							} );
						}
					} else {
						Smap.loadImage( this.getTileUrl( coord ) ).then( function( img ) {
							// ロードした画像のサイズによりcanvasのサイズが変更されます．
							canvas.width = img.width;
							canvas.height = img.height
      						canvas.getContext( '2d' ).drawImage( img, 0, 0, canvas.width, canvas.height );
							aLayer.convertTile( canvas, coord );
						} );
					}
				}
			}

			aLayer.original.getTileUrl = function( coord ) { 
				return aLayer.getTileUrl( coord );
			}

			for ( var key in aLayer ) {
				if ( aLayer.url.indexOf( '{' + key + '}' ) >= 0 ) {
					aLayer.original.options[ key ] = aLayer[ key ]; 
				}
			};

			// mapへレイヤーを追加
//			if ( aLayer.visibility ) {
			if ( aLayer.visibility && addToOriginal ) {
				aLayer.original.addTo( map.original );
			}

			// layerのメソッドの実装
			aLayer._redraw = function() {
				this.original.redraw();
			}

			aLayer._set = function( aKey, aValue ) {
				if ( typeof aValue !== 'undefined' ) {
					this.original.options[ aKey ] = aValue;
				}
				return this.original.options[ aKey ];
			}

			aLayer._setOpacity = function( aOpacity ){
				if ( typeof aOpacity !== 'undefined' ) {
					this.original.setOpacity( aOpacity );
//					this.redraw();
				}
				return this.original.options.opacity;
			}

			aLayer._setVisibility = function( aVisibility ){
				// 2014-07-03現在，重ねる順序は無視している
				if ( typeof aVisibility !== 'undefined' ) {
					if ( map.original.hasLayer( this.original ) !== aVisibility ) {
						if ( aVisibility ) {
							map.original.addLayer( this.original );
						} else {
							map.original.removeLayer( this.original );
						}
					}
				}
				return map.original.hasLayer( this.original );
			}
			return aLayer;
		};

		map._image = function( aLayer ) {
			var
				attr = aLayer.attribution,
				bb =  L.latLngBounds( aLayer.bounds.sw, aLayer.bounds.ne ),
				params = { opacity: aLayer.visibility ? aLayer.opacity : 0, attribution: attr },
				url = aLayer.url;

			// Mac+Safari,dataURI使用時に色がずれる問題に対応するため
			if ( url.substr( 0, 21 ) == 'data:image/png;base64' ) {
				url = 'data:image/png;for=show;' + url.slice( 15 );
			} 

			if ( aLayer.attributionUrl ) {
				params.attribution = '<a href="' + aLayer.attributionUrl
						 + '" target="_blank">' +attr + '</a>';
			} else if ( aLayer.attribution_url ) {					// 廃止予定
				params.attribution = '<a href="' + aLayer.attribution_url
						 + '" target="_blank">' +attr + '</a>';
			}

			aLayer._setOpacity = function( aOpacity ){
				if ( typeof aOpacity !== 'undefined' ) {
					this.original.setOpacity( aOpacity );
				}
				return this.original.options.opacity;
			}

			aLayer._setVisibility = function( aVisibility ) {
				if ( typeof aVisibility !== 'undefined' ) {
					this.original.setOpacity( aVisibility ? 1 : 0 );
					this.visibility = aVisibility;
				};
				return this.visibility;
			};

			aLayer.original = new L.ImageOverlay( url, bb, params );
			this.original.addLayer( aLayer.original );
		};

		map._off = function( aType, aHandler ){
			this.original.removeEventListener( aType, aHandler.original );
		}
		
		map._on = function( aType, aHandler ){
			aHandler.original = function( event ) {
				var
					newEvent = { type: aType, original: event, map: map };

				for ( var key in event ){
					switch ( key ) {
						case 'originalEvent': newEvent.domEvent = event.originalEvent; break;
						case 'latlng': 		newEvent.latLng = { lat: event.latlng.lat, lng: event.latlng.lng }; break;
						case 'timestamp':	newEvent.time = new Date( event.timestamp );
						case 'target':
						case 'speed':
						case 'accuracy':
						case 'altitude':
						case 'altitudeAccuracy':
						case 'bounds':
						case 'headding':	newEvent[ key ]  = event[ key ]; break;
					}
				}
				aHandler( newEvent );
			};
			this.original.addEventListener( aType, aHandler.original );
			return this;
		}

		map._addBase = function( aLayer ) {
			for ( var i = 0; i < this.bases.length; i++ ) {
				if ( this.original.hasLayer( this.bases[ i ].original ) ) {
					this.original.removeLayer( this.bases[ i ].original );
				}
			}
			this.original.addLayer( aLayer.original, true );
			aLayer.original.bringToBack();
			if ( this.controls.layer ) {
				this.controls.layer.original.addBaseLayer( aLayer.original, aLayer.title );
			}
/*
			if ( this.layerControl.original ) {
				this.layerControl.original.addBaseLayer( aLayer.original, aLayer.title );
			}
*/
			return aLayer;
		};

		map._marker = function( aMarker ) {
			var
//				params = aMarker.params ? aMarker.params : {};
				params = {};

			// paramsの設定
			for ( var key in aMarker ) {
				switch ( key ) {
					case 'icon':
						var 
							p,
							icon = { iconUrl: aMarker.icon.url };
						if ( aMarker.icon.size ) {
							p = Smap.point( aMarker.icon.size );
							icon.iconSize = [ p.x, p.y ]
						}
						if ( aMarker.icon.anchor ) {
							p = Smap.point( aMarker.icon.anchor );
							icon.iconAnchor = [ p.x, p.y ]
						}
						params.icon = L.icon( icon );
						break;
					case 'visibility' :
						var
							opacity = aMarker.opacity ? aMarker.opacity : 1;
						params.opacity =  aMarker[ key ] ?  opacity : 0;
						break;
					case 'opacity':
						params.opacity =  aMarker.visibility ? aMarker[ key ] : 0;
						break;
					case 'draggable':
					case 'title':
						params[ key ] = aMarker[ key ]; break;
					default:			// 残りもとりあえずそのままコピー
						params[ key ] = aMarker[ key ]; break;
				}
			}

			// オリジナルオブジェクトの生成
			aMarker.original = L.marker( aMarker.latLng, params );
			aMarker.original.addTo( this.original );

			//メソッドの実装
			aMarker._closePopup = function() {
				this.original.closePopup();
			};

			aMarker._on = function( aType, aHandler ) {
				this.original.on( aType, function( event ) {
					var
						newEvent = { type: aType, original: event };
	
					for ( var key in event ){
						switch ( key ) {
							case 'latlng': 		newEvent.latLng = { lat: event.latlng.lat, lng: event.latlng.lng }; break;
							case 'originalEvent': newEvent.domEvent = event.originalEvent; break;
							case 'target':
							case 'distance':	newEvent[ key ] = event[ key ]; break;
						}
					}
					aHandler( newEvent );
				} );
				return this;
			}

			aMarker._openPopup = function() {
				this.original.openPopup();
			};

			aMarker._setLatLng = function( aLatLng ) {
				if ( typeof aLatLng !== 'undefined' ) {
  	  				this.original.setLatLng( aLatLng );
  	  			}
  	  			return Smap.latLng( this.original.getLatLng() );
			};

			aMarker._setOpacity = function( anOpacity ) {
				if ( typeof anOpacity !== 'undefined' ) {
  	  				this.original.setOpacity( anOpacity );
  	  			}
  	  			return this.opacity;
			};

			aMarker._setPopup = function( popup ) {
				if ( typeof popup !== 'undefined' ) {
  	  				this.original.bindPopup( popup.original );
  	  			}
  	  			return this.popup;
			};

			aMarker._setVisibility = function( aVisibility ) {
				if ( typeof aVisibility !== 'undefined' ) {
					this.original.setOpacity( aVisibility ? this.opacity : 0 );
  	  			}
  	  			return this.visibility;
			}
		}

		map._addOverlay = function( aLayer ) {
			if ( this.controls.layer ) {
				var
					title = ( aLayer.title ) ? aLayer.title : 'new layer';
				this.controls.layer.original.addOverlay( aLayer.original, title );
			}
/*
			if ( this.layerControl.original ) {
				var
					title = ( aLayer.title ) ? aLayer.title : 'new layer';
				this.layerControl.original.addOverlay( aLayer.original, title );
			}
*/
			return aLayer;
		};

		map._polyline = function( aPolyline ) {
			var
				leafletStyle = {};
			for ( var key in aPolyline.style ) {
				switch ( key ) {
					case 'stroke':
						if ( aPolyline.style[ key ] === 'none' ) {
							leafletStyle.stroke = false;
						} else {
							leafletStyle.color = aPolyline.style[ key ];
						}
						break;
					case 'strokeOpacity':
						leafletStyle.opacity = aPolyline.style[ key ];
						break;
					case 'strokeWidth':
						leafletStyle.weight = aPolyline.style[ key ];
						break;
					case 'fill': 
						if ( aPolyline.style[ key ] === 'none' ) {
							leafletStyle.fill = false;
						} else {
							leafletStyle.fillColor = aPolyline.style[ key ];
						}
						break;
					default: leafletStyle[ key ] = aPolyline.style[ key ];
																	// fillOpacity他
				}
			}
			if ( aPolyline.close ) {
				aPolyline.original = L.polygon( aPolyline.latLngs, leafletStyle ).addTo( this.original );
			} else {
				aPolyline.original = L.polyline( aPolyline.latLngs, leafletStyle ).addTo( this.original );
			}
			aPolyline._addLatLng = function( aLatLng ) {
				aPolyline.original.addLatLng( aLatLng );
			}
			aPolyline._on = function( aType, aHandler ) {
				aPolyline.original.on( aType, aHandler );
				return this;
			}
			aPolyline._setLatLngs = function( latLngs ) {
				this.original.setLatLngs( latLngs );
			}
			aPolyline._setVisibility = function( visibility ) {
				if ( typeof visibility !== 'undefined' ) {
//					this.original.opacity = visibility ? this.style.opacity : 0;
					this.original.setStyle( { opacity : visibility ? this.style.opacity : 0 } );
					this.original.setStyle( { fillOpacity : visibility ? this.style.fillOpacity : 0 } );
  	  			} else {
  	  				visibility = this.visibility;
  	  			}
  	  			return visibility;
			}
			return;
//			return aPolyline;
		}

		map._createPopup = function( aPopup ) {
			var
				options = {};

			for( var key in aPopup ) {
				switch ( key ) {
					case 'latLng':	break;	// 設定しない
					case 'content':	break;	// 設定しない
					// autoPan, maxWidth, minWidth, maxHeightなどが引き継がれる
					default:	 	options[ key ] = aPopup[ key ];
				}
			};

			aPopup._isOpen = function(){
				return aPopup.original._isOpen;
			}

			aPopup._setContent = function( aContent ){
				if ( typeof aContent !== 'undefined' ) {
					this.original.setContent( aContent );
				}
				return aPopup.original.getContent();
			}

			aPopup._setOpen = function( open ){
				if ( typeof open !== 'undefined' ) {
					if ( open ) {
						this.original.openOn( map.original );
					} else if ( aPopup.original._isOpen ) {
						map.original.closePopup();
					}
				}
				return aPopup.original._isOpen;
			}

			aPopup.original = L.popup( options );
			aPopup.original.setLatLng( aPopup.latLng );
			aPopup.original.setContent( aPopup.content );
			return aPopup;
		}

		map._control = function( control ) {
			var
				options = { position: control.position };

		  	if ( !map.controls[ control.id ] ) {
				control.done = function(){
					this.original.removeFrom( map.original );
				};
				if ( [ 'attribution', 'layer', 'scale', 'zoom' ].indexOf( control.id ) != -1 ) {
					switch ( control.id ) {
						case 'attribution':
							control.original = L.control.attribution( options );
							map.original.attributionControl = control.original;
							control.addAttribution = function( anAttribution ){
								control.original.addAttribution( anAttribution );
							}
							break;
						case 'layer':
							var
								basesList = {},
		      					overlaysList = {};

						    this.bases.forEach( function( layer ) {
						    	basesList[ layer.title ] = layer.original;
							} );
						    this.overlays.forEach( function( layer ) {
						        overlaysList[ layer.title ] = layer.original;
						    } );
							control.original = L.control.layers( basesList, overlaysList, options );
							break;
						case 'scale':
							control.original = L.control.scale( options );
							break;
						case 'zoom':
							control.original = L.control.zoom( options );
							break;
					}
				} else {
					control.original = new ( L.Control.extend( {
					    options: options,
					    onAdd: function (map) {
					        return control.contents;
					    }
					} ) )();
				}
				return control.original.addTo( map.original );
			}
		}

		map._removeBase = function( aLayer ) {
			this.original.removeLayer( aLayer.original );
		}

		map._removeImage = function( anImage ) {
			if ( anImage.original ) {
				this.original.removeLayer( anImage.original );
			}
		}

		map._removeOverlay = function( aLayer ) {
			if ( aLayer.original ) {
				this.original.removeLayer( aLayer.original );
			}
		}

		map._layerControl = function( aShow ) {
		  	if ( typeof aShow === 'undefined' || aShow ) {
		  		if ( !this.layerControl.original ) {
					var
						basesList = {},
      					overlaysList = {};

				    this.bases.forEach( function( layer ) {
				    	basesList[ layer.title ] = layer.original;
					} );
				    this.overlays.forEach( function( layer ) {
				        overlaysList[ layer.title ] = layer.original;
				    } );
					this.layerControl.original = L.control.layers( basesList, overlaysList ).addTo( map.original );
				}
			} else if ( this.layerControl.original ) {
				this.layerControl.original.removeFrom( map.original );
		   		this.layerControl.original = null;
			}
		}

		map._removeMarker = function( aMarker ) {
			this.original.removeLayer( aMarker.original );
		}

		map._removePolyline = function( aPolyline ) {
			this.original.removeLayer( aPolyline.original );
		}

		map._removePopup = function( aPopup ) {
			this.original.removeLayer( aPopup.original );
		}

		map._setBase = function( aLayer ) {
			if ( typeof( aLayer ) === 'undefined' ) {
				for ( var i = 0; i < this.bases.length; i++ ) {
					if ( this.original.hasLayer( this.bases[ i ].original ) ) {
						aLayer = this.bases[ i ];
					}
				}
			} else {
				for ( var i = 0; i < this.bases.length; i++ ) {
					this.original.removeLayer( this.bases[ i ].original );
					if ( aLayer === this.bases[ i ] ) {
						this.original.addLayer( this.bases[ i ].original, true );
					}
				}
				aLayer.original.bringToBack();
				if ( layerControl !== null ) {
					layerControl.addBaseLayer( aLayer.original, aLayer.title );
				}
			}
			return aLayer;
		}

		map._setBounds = function( bounds ) {
			var
				sw, ne, b;
			
			if ( bounds ) { // undefinedでもnullでもない場合
				this.original.fitBounds( L.latLngBounds( bounds.sw, bounds.ne ) );
			}
  			b = this.original.getBounds();
  			sw = { lat: b.getSouth(), lng: b.getWest() };
  			ne = { lat: b.getNorth(), lng: b.getEast() };
    		return { sw: sw, ne: ne };
		}

		map._setCenter = function( aCenter, params ) {
			var
				c,
				animate;
			if ( typeof aCenter !== 'undefined') {
				animate = ( typeof params === 'undefined' ) || params.animate;
				map.original.setView( aCenter, this.original.getZoom(), { animate: animate } );
			}
			c = map.original.getCenter();
			return { lat: c.lat, lng: c.lng };
		}

		map._setDraggable = function( aDraggable ) {
			var
				dragging = this.original.dragging;
			( aDraggable ) ? dragging.enable() : dragging.disable();
		}

		map._setView = function( aView, params ) {
			var
				center,
				zoom,
				animate;
			if ( typeof aView !== 'undefined') {
				center = ( typeof aView.center !== 'undefined' ) ? Smap.latLng( aView.center ) : this.original.getCenter();
				zoom = ( typeof aView.zoom !== 'undefined' ) ? aView.zoom : this.original.getZoom();
				animate = ( typeof params === 'undefined' ) || params.animate;
				map.original.setView( center, Math.round( zoom ), { animate: animate } );
			}
			return { center: this.original.getCenter(), zoom: this.original.getZoom() };
		}

		map._setZoom = function( aZoom, params ) {
			if ( typeof aZoom !== 'undefined' ) {
				map.original.setZoom( Math.round( aZoom ), params );
			}
			return map.original.getZoom();
		}

		map._move = function( dx, dy, dz ) {
			map.original.panBy( [ dx, dy ], { animate: false } );
			if ( typeof dz !== 'undefined' ) {
				this.up( dz );
			}
		}
/*
		// Leafletのオリジナル機能を使わないように実装を変更 2016-10-13
		map._startLocate = function( params ) {
			var
				leafletParams = {};

			for ( var key in params ) {
				switch ( key ) {
					case 'enableHighAccuracy': 
					case 'watch':
						leafletParams[ key ] = params[ key ]; break;
				}
			}
			map.original.locate( leafletParams );
		}

		map._stopLocate = function( params ) {
			map.original.stopLocate();
		}

		map.original.on( 'locationfound', function( event ) {
			if ( map.automove ) {
				map.setCenter( [ event.latlng.lat, event.latlng.lng ] );
			}
		} );
*/
		return map;
	}

} ) ( Smap );
///////////////////////////////////////////////////////////////////////////////
//	Smap.engine.cesium.js, 2016-11-07
//		Smap.engine.cesium()関数
//		Cesiumラッパー
///////////////////////////////////////////////////////////////////////////////
'use strict';

( function( Smap ) {

	// Ceisumがロードされていないときはこのユニットは機能しない
	if( typeof Cesium === 'undefined' ){
		return;
	}

	// smapImageryProvider Smap用拡張ImageryProvider
	var
		SmapImageryProvider

	SmapImageryProvider = function( options ){
			Cesium.UrlTemplateImageryProvider.apply( this, [ options ] );
			this._drawTile = options.drawTile;
			this._convertTile = options.convertTile;
			this._invoker = options.invoker;	// drawTile,convertTileの呼び出し元
		};

	SmapImageryProvider.prototype = new Cesium.UrlTemplateImageryProvider( { url:'' } );

	SmapImageryProvider.prototype.requestImage = function(x, y, level) {
		var
			result;

		if ( this._drawTile || this._convertTile ) {
			var
		    	canvas = document.createElement( 'canvas' ),
		        url,
				result,
				that;

			if ( this._drawTile ) {
				canvas.width = this.tileWidth;
				canvas.height = this.tileHeight;
				if ( this._invoker ) {
					result = this._drawTile.call( this._invoker, canvas, { x: x, y:y, z: level } );
				}else {
					result = this._drawTile( canvas, { x: x, y:y, z: level } );
				}
				if ( result === null) {
								// nullの時はタイムアウトエラー等と解釈
								// 通常のS-mapの実装では起こらない
					result = undefined;
				} else if ( typeof result === 'undefined' ) {	// 非同期の時
								// undefinedの時はcanvasをそのまま使う
					result = canvas ;
				} else {	// Promiseが返ってきたとき, canvasを返すプロミスを新たに生成して返す
					result = result.then( function(){ return canvas; } );
				}
			} else {
				if ( this._invoker ) {	// 現在の実装では必ず_invokerが設定される
					url = this._invoker.getTileUrl( { x: x, y: y, z: level } );
				} else {
					url = this.url.replace( '{z}', level ).replace( '{y}', y ).replace( '{x}', x );
				}
				result = Cesium.ImageryProvider.loadImage( this, url );
		 		if ( this._convertTile ) {
			 		if ( result ) {
						that = this;
						result = result.then( function( img ){
							var
								ctx,
								p;

							canvas.width = img.width;
							canvas.height = img.height;
							ctx = canvas.getContext( '2d' );
							ctx.drawImage( img, 0, 0, img.width, img.height );
							if ( that._invoker ) {
								p = that._convertTile.call( that._invoker, canvas, { x: x, y:y, z: level } );
							} else {
								p = that._convertTile( canvas, { x: x, y:y, z: level } );
							}
							if ( p ) {
								return p
							}else{
								return canvas;
							}
						}, function( obj ){	
							// ファイルが見つからないときは空のCanvasを返す(とりえあえず)．
							return canvas;
						} );
					}
				}
			}
		}else {
			result = Cesium.UrlTemplateImageryProvider.prototype.requestImage.
					apply( this, [ x , y, level ] );
		}
		return result;
	};


	// Cesium用map生成ファクトリー関数
	Smap.engine.cesium = function( map ){ 
		var
			base = map.bases[0],
			scene,
			minimumDitance;

		map.fov = 55;  // 2015-07-31, 実際の描画に合わせて変更

		map.original = new Cesium.Viewer( map.owner, {
			animation: false,				// アニメーションウィジット(?)を非表示
			baseLayerPicker: false,			// 背景レイヤーピッカーはオフ
			fullscreenButton: false,		// フルスクリーンボタンをオフ
			geocoder: false,				// 地名検索ボタンオフ
			homeButton: false,				// ホームボタンオフ
			sceneModePicker: false,			// シーンモードピッカーオフ
			timeline: false,				// タイムラインオフ
			navigationHelpButton: false,	// ナビゲーションヘルプボタンオフ
			
//			navigationInstructionsInitiallyVisible: false,	//
//			infoBox:false,				// 情報ボックスボタンオフ
///			selectionIndicator: false,

		} );
		scene = map.original.scene,
		// デフォルトのBigMapのレイヤーを削除
		scene.imageryLayers.remove( scene.imageryLayers.get( 0 ) );

		scene.screenSpaceCameraController._minimumZoomRate = 10000;
			// ズームしたときの，ホイールに対する動作制御

		// ズーム制限．緯度45度の時を基準として概算.現状ではmaxZoomの指定がない場合約5mになる
		minimumDitance = Smap.zoomToScale( map.maxZoom + 0.5, 45 ) * map.getRangePx();
		scene.screenSpaceCameraController.minimumZoomDistance = minimumDitance;
//		console.log( minimumDitance );

		if ( map.center ) {
			var
				c = map.center,
				height = Smap.zoomToScale( map.zoom, c.lat ) * map.getRangePx();

				// 以下はアニメーションはしないがとりあえず移動できる
				map.original.camera.setView( {
				    position : Cesium.Cartesian3.fromDegrees( c.lng, c.lat, height ),
				    destination : Cesium.Cartesian3.fromDegrees( c.lng, c.lat, height ),
				} );
		}

		map._tileLayer = function( aLayer, addToOriginal ){
			var
				 url = aLayer.url;

			// aLayerの情報を元にCesiumのLayerオブジェクトを生成してます．
			function createOriginalLayer( index ){
				var
					maxZ = aLayer.maxZoom;

				if ( aLayer.maxNativeZoom ) {
					maxZ = aLayer.maxNativeZoom;
				}
				aLayer.original = new Cesium.ImageryLayer(
				//	new Cesium.UrlTemplateImageryProvider( {
					new SmapImageryProvider( {
						maximumLevel: maxZ,
						minimumLevel: Math.min( 1, aLayer.minZoom ),
							// Cesiumeではトプレベルのタイル数は4以下
							// エリアを制限すれば1より大きくできる
						url: url,
						credit: new Cesium.Credit( aLayer.attribution, '', 
							aLayer.attributionUrl ),
						proxy: { getURL: function( aUrl ) {
							for( var key in aLayer ){
								if( aUrl.indexOf( '{' + key + '}' ) >= 0 ) {
									aUrl = aUrl.replace( '{' + key + '}', aLayer[ key ] );
								}
							}
							return aUrl;
						} },
						drawTile: aLayer.drawTile,
						convertTile: aLayer.convertTile,
						tileWidth: ( aLayer.tileSize ) ? aLayer.tileSize : 256,
						tileHeight: ( aLayer.tileSize ) ? aLayer.tileSize : 256,
						invoker: aLayer,
					} )
				);
				aLayer.original.alpha = aLayer.opacity;
//				if ( typeof index === 'undefined' ) {
				if ( typeof index === 'undefined' && addToOriginal ) {
					map.original.scene.imageryLayers.add( aLayer.original );
				}else {
					map.original.scene.imageryLayers.add( aLayer.original, index );
				}
			};

			createOriginalLayer();

			aLayer._redraw = function(){
				var
					imageryLayers = map.original.scene.imageryLayers,
					index = imageryLayers.indexOf( this.original );
				imageryLayers.remove( this.original );
				createOriginalLayer( index );
			}

			aLayer._set = function( aKey, aValue ){
				if ( typeof aValue !== 'undefined' ) {
					this.original.imageryProvider.proxy[ aKey ] = aValue;
				}
				return this.original.imageryProvider.proxy[ aKey ]
			}
			
			aLayer._setOpacity = function( aOpacity ){
				if ( typeof aOpacity !== 'undefined' ) {
					this.original.alpha = aOpacity;
				}
				return this.original.alpha;
			}

			aLayer._setVisibility = function( aVisibility ){
				if ( typeof aVisibility !== 'undefined' ) {
					this.original.show = aVisibility;
				}
				return this.original.show;
			}

			return aLayer;
		}

		map._addBase = function( aLayer ){
			var
				oldBase = this.getBase();

			// 古い背景レイヤーをremove
			if( oldBase ) {
				this.original.scene.imageryLayers.remove( oldBase.original, false );
			}
			this.original.scene.imageryLayers.add( aLayer.original, 0 );
		}

		map._marker = function( aMarker ) {
			var
				coordinates = [ aMarker.latLng.lng, aMarker.latLng.lat ],
				geojson = { 
					'type': 'Feature', 
					'geometry' : { 'type' : 'Point',  'coordinates': coordinates },
					'properties' : {}
				};

			if ( aMarker.title ) {
				geojson.properties.title = aMarker.title;
			}
			if ( aMarker.popup ) {
				if ( typeof aMarker.popup === 'string' ) {
					geojson.properties.description = aMarker.popup;
				} else {
					geojson.properties.description = aMarker.popup.content;
				}
			}
			Cesium.GeoJsonDataSource.load( geojson ).then( function( ds ) {
				aMarker.original = ds;
				map.original.dataSources.add( ds );
			} );

			aMarker._setVisibility = function( aVisibility ) {
				if ( typeof aVisibility !== 'undefined' ) {
					this.original.show = aVisibility;
 	  			}
 	  			return this.original.show;
			}
		}

		map._addOverlay = function( aLayer ) {

			// Cesiumでは明示的に追加する必要がある
			if ( aLayer.original ) {	
				// KMLの場合は非同期なのでこの時点ではoriginalがundefinedだが
				// 追加する必要もない
				this.original.scene.imageryLayers.add( aLayer.original );
			}
/*
			aLayer._redraw = function() {
				// 未実装
			}
*/
			aLayer._setOpacity = function( aOpacity ){
				if ( typeof aOpacity !== 'undefined' ) {
					this.original.alpha = aOpacity;
				}
				return this.original.alpha;
			}
			aLayer._setVisibility = function( aVisibility ){
				if ( typeof aVisibility !== 'undefined' ) {
					this.original.show = aVisibility;
					// KMLなどのDataSourceでもshowは使える
				}
				return this.original.show;
			}
			return aLayer;
		};

		map._polyline = function( aPolyline ) {
			var
				coordinates = [],		// Cartesian3.fromDegreesArrayに渡す座標配列
				outline = false,		// 外枠を描くか．ポリゴンのみで使われる
				strokeColor,			// 線の色
				strokeAlpha,			// 線のアルファ値(不透明度）
				width,					// 線の幅
				fill = true,			// 塗りつぶすか否か．ポリゴンのみで使われる
				fillColor,				// 振りつぶす色
				fillAlpha = 1,			// 塗りつぶしのアルファ値（不透明度）
				obj;
								
		
			for ( var key in aPolyline.style ) {
				var
					value = aPolyline.style[ key ];

				switch ( key ) {
					case 'stroke':
						// Smap内の処理により省略されることはない
						outline = value !== 'none';
						if ( value !== 'none' ) {
							strokeColor = Cesium.Color.fromCssColorString( value );
						}
						break;
					case 'strokeWidth':
						width = value;
						break;
					case 'strokeOpacity':
						strokeAlpha = value;
						break;
					case 'fillColor': 
						if ( value !== 'none' ) {
							fillColor = Cesium.Color.fromCssColorString( value );
						} else {
							fill = false;
						}
						break;
					case 'fillOpacity': 
						fillAlpha = value;
						break;
				}
			}

			aPolyline.latLngs.forEach( function( latLng ){
				coordinates.push( latLng.lng );
				coordinates.push( latLng.lat );
			} );
			if ( strokeAlpha !== 1 ){
				strokeColor = strokeColor.withAlpha( strokeAlpha );
			}
			if ( aPolyline.close ) {						// Polygon
				if ( fillAlpha !== 1  && fill ){
					fillColor = fillColor.withAlpha( fillAlpha );
				}
				obj = {
					polygon: {
						hierarchy: Cesium.Cartesian3.fromDegreesArray ( coordinates ),
						fill: fill,
						material: fillColor,
						outline: outline,
						outlineColor: strokeColor,
						outlineWidth: width
					},
				};
			} else {										// Polyline
				obj = {
					polyline: {
						positions: Cesium.Cartesian3.fromDegreesArray ( coordinates ),
						width: width,
						material: strokeColor
					},
				};
			}
			aPolyline.original = this.original.entities.add( obj );

			aPolyline._addLatLng = function( aLatLng ) {
				var
					p = Cesium.Cartesian3.fromDegrees( aLatLng.lng, aLatLng.lat ),
					orgPoints,
					points = [];

				if ( aPolyline.close ) {					// Polygon
					orgPoints = this.original.polygon.hierarchy;
				} else {									// Polyline
					orgPoints = this.original.polyline.positions;
				}
				// 以下のようにconcat()を使って複製を作らないとなぜかうまくいかない
				points = orgPoints.getValue().concat();
				points.push( p );
				orgPoints.setValue( points );
			}
/*
			// イベントは未実装
			aPolyline._on = function( aType, aHandler ) {
				return this;
			}
*/
			aPolyline._setLatLngs = function( latLngs ) {
				var
					coordinates = [],
					coords;

				latLngs.forEach( function( latLng ){
					coordinates.push( Smap.latLng( latLng ).lng );
					coordinates.push( Smap.latLng( latLng ).lat );
				} );
				coords = Cesium.Cartesian3.fromDegreesArray ( coordinates );
				if ( aPolyline.close ) {			// Polygon
					this.original.polygon.hierarchy.setValue( coords );
				} else {							// Polyline
					this.original.polyline.positions.setValue( coords );
				}
			}

			aPolyline._setVisibility = function( visibility ) {
				if ( typeof visibility !== 'undefined' ) {
					this.original.show = visibility;
  	  			} else {
  	  				visibility = this.visibility;
  	  			}
  	  			return visibility;
			}

			return;
//			return aPolyline;
		}


		map._removeBase = function( aLayer ){
			this.original.scene.imageryLayers.remove( aLayer.original, false );
		}

		map._removeMarker = function( aMarker ) {
			this.original.dataSources.remove( aMarker.original );
		}

		map._removePolyline = function( aPolyline ) {
			this.original.entities.remove( aPolyline.original );
		}

		map._removeOverlay = function( aLayer ){
			if ( aLayer.filetype === 'kml' ) {		// KMLレイヤー
				map.original.dataSources.remove( aLayer.original );
			} else {								// KML以外のレイヤー
				map.original.scene.imageryLayers.remove( aLayer.original, false );
				// 2016-10-28に以下に変更したが，2016-11-10にまた元に戻した
//				map.original.scene.imageryLayers.remove( aLayer.original, true );
			}
		}

		map._setBase = function( aLayer ){
			var
				oldBase;

			for( var i = 0; i < this.bases.length; i++ ){
				if ( this.original.imageryLayers.contains(
						this.bases[ i ].original ) ) {
					oldBase = this.bases[ i ];
					break;
				}
			}
			if ( typeof( aLayer ) === 'undefined' || aLayer === null ) {
				aLayer = oldBase;
			} else {
				// ベースレイヤーは念のためいったんすべて削除
				for( var i = 0; i < this.bases.length; i++ ){
					this.original.scene.imageryLayers.remove( this.bases[i].original, false );
					if( aLayer === this.bases[i] ){
						this.original.scene.imageryLayers.add( aLayer.original, 0 );
					}

				}
			}
			return aLayer;
		}

		map._setView = function( aView, options ) {
			var
				camera = this.original.camera,
				newView = {},
				height = camera.positionCartographic.height,
				scale = height / this.getRangePx(),
				scene = this.original.scene,
				w = this.owner.getClientRects()[0].width,
				h = this.owner.getClientRects()[0].height,
				ray = camera.getPickRay( new Cesium.Cartesian2( w / 2,  h / 2 ) ),
				intersection = scene.globe.pick( ray, scene ),
				cg;

			// 現在の中心座標の取得
			if ( intersection ) {
				cg = scene.globe.ellipsoid.cartesianToCartographic( intersection );
			}else {	// sceneの中央座標の取得に失敗したら，カメラの座標を取得
				cg = camera.positionCartographic;
			}
			newView = {
				center: { lat: cg.latitude / Math.PI * 180, lng: cg.longitude / Math.PI * 180 }
			}

			// newView.centerの設定
			if ( typeof aView !== 'undefined' ) {
				if ( typeof aView.center !== 'undefined' ) {
					newView.center = Smap.latLng( aView.center );
				}
			}

			// newView.zoomの設定と，height再計算
			newView.zoom = Smap.scaleToZoom( scale, newView.center.lat );
			
			//デフォルト値で初期化
			if ( typeof aView !== 'undefined' ) {
				if ( typeof aView.zoom !== 'undefined' ) {
					newView.zoom = aView.zoom;
					scale = Smap.zoomToScale( newView.zoom, newView.center.lat );
					height = scale * this.getRangePx();
				}
			}
			
			if ( typeof aView === 'undefined' ) {
				// これはカメラにおけるazimuth，本来なら地上に対するazimuthを求める
				newView.azimuth = camera.heading / Math.PI * 180;
				// これはカメラにおけるpitch，本来なら地上に対するpitchを求める
				newView.dip = camera.pitch / Math.PI * 180 + 90;
			}

			// aViewが設定されていれば再描画
			if ( typeof aView !== 'undefined' ) {
				var
					target = this.original.entities.add( {
						position: Cesium.Cartesian3.fromDegrees( newView.center.lng,
								newView.center.lat ),
						point: {},
					} ),
					duration = 2,			// アニメーションのデフォルト時間
					pitch = -Math.PI / 2,	// カメラのピッチ角．デフォルトは-90度
					heading = 0;
				
				if ( options && ( typeof options.animation !== 'undefined' ) ) {
					duration = ( options.animation ) ? 2 : 0;
				}

				// *** 以下，互換性のためにしばらく残す
				if ( options && ( typeof options.pitch !== 'undefined' ) ) {
					pitch = options.pitch / 180 * Math.PI;
				}
				if ( options && ( typeof options.heading !== 'undefined' ) ) {
					heading = options.heading / 180 * Math.PI;
				}
				//***

				if ( typeof aView.azimuth !== 'undefined' ) {
					heading =  aView.azimuth / 180 * Math.PI;
				}
				if ( typeof aView.dip !== 'undefined' ) {
					pitch =  ( aView.dip - 90 ) / 180 * Math.PI;
				}
				this.original.flyTo( target, { 
					offset: new Cesium.HeadingPitchRange( heading, pitch, height ),
					duration: duration
				} ).then( function(){
					this.original.entities.remove( target );
				} );
			}
			return newView;
		};

		map._setVisibility = function( aVisibility ){
			this.original.useDefaultRenderLoop = aVisibility
			return aVisibility;
		}

		map._setBounds = function( bounds, options ){
			if ( typeof bounds !== 'undefined' ) {
				this.original.camera.flyTo( {
					destination: Cesium.Rectangle.fromDegrees( bounds.sw.lng,
				        		bounds.sw.lat, bounds.ne.lng, bounds.ne.lat ),
				    duration: ( ( options ) && ( !options.animation ) ) ? 0 : 2
				} );
			} else {
				bounds = null;	// Cesiumでは現在の設定は取得できない
			}
			return bounds
		}

		map._setHf = function( aHf ){
			// CesiumのTerrainProviderの設定値を動的に変更，または強制的に再読み込みする方法が
			// わからなかったので，新たにTerrainProviderを再作成しセット
			// 現在はheightScaleの存在を前提にしている
			var
				params = map.elevationModel;

			if ( typeof aHf !== 'undefined' ) {
				params.hf = aHf;
				this._createElevationModel( params );
			} else {
				aHf = this.elevationModel.original._terrainDataStructure.heightScale;
			}
			return aHf;
		}

		map._createElevationModel = function( anElevationModel ){
			var
				params = {};

			for ( var key in anElevationModel ) {
				switch ( key ) {
//					case 'resolution': 	params.heightScale = anElevationModel[ key ]; break;
					case 'dataMapSize':	params.heightmapWidth = anElevationModel[ key ] - 1; break;
					case 'maxZoom':	params.maximumLevel = anElevationModel[ key ]; break;
					case 'projection':
						if ( anElevationModel[ key ] === 'latlng' ) {
							params.tilingScheme = new Cesium.GeographicTilingScheme()
						};
					default: 			
						params[ key ] = anElevationModel[ key ];
				}
			}
			params.heightScale = params.resolution * params.hf;
			this.original.terrainProvider = new Cesium.PngElevationTileTerrainProvider( params )
			anElevationModel.original = this.original.terrainProvider;
			return anElevationModel;
		}

		var
			screenSpaceEventHandler = new Cesium.ScreenSpaceEventHandler( scene.canvas );

		map._off = function( aType, aHandler ){
			var
				cesiumType;

			if ( aType === 'move' ) {
				cancelAnimationFrame( this._moveEventAnimationFrameId );	
			} else {
				switch ( aType ) {
					case 'click': cesiumType = Cesium.ScreenSpaceEventType.LEFT_CLICK; break;
					case 'dblclick': cesiumType = Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK; break;
					case 'mouseup': cesiumType = Cesium.ScreenSpaceEventType.LEFT_UP; break;
					case 'mousedown': cesiumType = Cesium.ScreenSpaceEventType.LEFT_DOWN; break;
					case 'mousemove': cesiumType = Cesium.ScreenSpaceEventType.MOUSE_MOVE; break;
				}
				screenSpaceEventHandler.removeInputAction( cesiumType );
			}
		}

		map._on = function( aType, aHandler ){
			var
				cesiumType,
				c0 = map.getCenter() ; 

			function loop( timestamp ) {
				var
					c = map.getCenter();

				if( c.lat !== c0.lat || c.lng !== c0.lng  ) {
					var
						newEvent = { type: aType, map: map }

					aHandler( newEvent );
				}
				c0 = c;
				map._moveEventAnimationFrameId = requestAnimationFrame( loop );
			}

			if ( aType === 'move' ) {	
					// Cesiumには'move'に対応するイベントがないので自作
					// 本来ならイベントを解除するメソッドも必要
				this._moveEventAnimationFrameId = requestAnimationFrame( loop );
			} else {
				switch ( aType ) {
					case 'click': cesiumType = Cesium.ScreenSpaceEventType.LEFT_CLICK; break;
					case 'dblclick': cesiumType = Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK; break;
					case 'mouseup': cesiumType = Cesium.ScreenSpaceEventType.LEFT_UP; break;
					case 'mousedown': cesiumType = Cesium.ScreenSpaceEventType.LEFT_DOWN; break;
					case 'mousemove': cesiumType = Cesium.ScreenSpaceEventType.MOUSE_MOVE; break;
				}
				
				screenSpaceEventHandler.setInputAction( function( movement ) {
					var
						newEvent = { type: aType, original: movement, map: map },
						pos = ( movement.position ) ? movement.position : movement.endPosition,
						ray =scene.camera.getPickRay( pos ),
						intersection = scene.globe.pick( ray, scene ),
						cg = scene.globe.ellipsoid.cartesianToCartographic( intersection ),
						ll = { lat: cg.latitude / Math.PI * 180, lng: cg.longitude / Math.PI * 180 };

					newEvent.latLng = ll;
					aHandler( newEvent );
				}, cesiumType );
			}
			return this;
		}

		map._move = function( dx, dy, dz ){
			var
				camera = this.original.camera,
				scale = this.getScale(),
				down = Cesium.Cartesian3.cross( camera.right, camera.position, {} );

		    camera.moveRight( dx * scale );
		    camera.move( Cesium.Cartesian3.normalize( down, {} ), dy * scale );
		    if ( typeof dz !== 'undefined' ) {
				var
					direction = Cesium.Cartesian3.normalize( camera.position, {} );
			    camera.move( direction, dz * scale );
			}
		}
		
		map._roll = function( s, t ){
			var
				camera = this.original.camera;
/*			var
				scene = this.original.scene,
				w = this.owner.getClientRects()[0].width,
				h = this.owner.getClientRects()[0].height,
				ray = camera.getPickRay( new Cesium.Cartesian2( w / 2,  h / 2 ) ),
				intersection = scene.globe.pick( ray, scene ),
				offset = {};

			if ( intersection ) {
//				Cesium.Cartesian3.subtract( intersection, camera.position, offset );
//				camera.lookAt( intersection, offset );
				camera.lookAt( intersection );
				console.log( offset );
			}
*/			
// 以下なぜかうまくいかない．heightが2倍ぐらい大きくなてしまう．
// pitchが変更されない
/*
			var
				scene = this.original.scene,
				w = this.owner.getClientRects()[0].width,
				h = this.owner.getClientRects()[0].height,
				ray = camera.getPickRay( new Cesium.Cartesian2( w / 2,  h / 2 ) ),
				intersection = scene.globe.pick( ray, scene ),
				offset,
				scale,
				height;

			if ( intersection ) {
				height = Cesium.Cartesian3.distance( intersection, camera.position );
				offset = new Cesium.HeadingPitchRange( camera.heading + s,
						camera.pitch + t, height );
				camera.lookAt( intersection, offset );
				console.log( height );
			}
*/
			// 以下は暫定実装でカメラ中心，カメラ座標での回転
			camera.lookRight( -s );
			camera.lookUp( t );
		}

		map._rollCamera = function( s, t ){
			// カメラを中心とした，地面を基準とした回転
			var
				camera = this.original.camera;

			camera.look( camera.position, s );
			camera.lookUp( t );
		}

		map._near = function( dz ){
			var
				camera = this.original.camera,
				scale = this.getScale();

			camera.moveForward( -dz * scale * 1000 );
		}
/*
		if ( map.hf !== 1 ) {
			map._setHf( map.hf );
		}
*/
		// 2016-08-09実装
		map._kmlLayer = function( aLayer ){
			Cesium.KmlDataSource.load( aLayer.url ).then( function( ds ) {
				aLayer.original = ds;
				map.original.dataSources.add( ds );
			} );

			return aLayer;
		}

		// 2016-11-03実装
		map._image = function( anImage ){
		// S-mapではレイヤーとしても単独オブジェクトとしても扱えるようにするが
		// Cesiumではいずれもレイヤーとして実装する．
			var
				sw = anImage.bounds.sw,
				ne = anImage.bounds.ne,
				r = Cesium.Rectangle.fromDegrees( sw.lng, sw.lat, ne.lng, ne.lat ),
				provider = new Cesium.SingleTileImageryProvider( {
					url: anImage.url,
					rectangle: r
				} );

			anImage.original = new Cesium.ImageryLayer( provider );

//			this.original.scene.imageryLayers.add( layer );
//			Layerとして追加される場合は，addOverlayで自動的に追加される
			if ( typeof anImage.opacity !== 'undefined' ) {
				anImage.original.alpha = anImage.opacity;
			}

			anImage._setOpacity = function( aOpacity ){
				if ( typeof aOpacity !== 'undefined' ) {
					this.original.setOpacity( aOpacity );
				}
				return this.original.alpha;
			}

			anImage._setVisibility = function( aVisibility ) {
			// Layerとして追加された場合はこのメソッドは使われない
/*
				if ( typeof aVisibility !== 'undefined' ) {
					this.visibility = aVisibility;
				};
				return this.visibility;
*/
			};
		}

		return map;
	}

} )( Smap );
///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.controllers.gamepad.js, 2015-10-15, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		ゲームパッドコントローラー
///////////////////////////////////////////////////////////////////////////////

'use strict';

( function( Smap ) {

	Smap.controller = ( Smap.controller ) ? Smap.controller : {};

//
//	関数: Smap.controller.gamepad()
//		ゲームパッドコントローラーの生成
//
	Smap.controller.gamepad = function() {
		var
			gamepadController = { 
				id: 'gamepad',
				active: true,
				assign: {
					button0:	{ command: 'near',	velocity:  1.4 },		// A Button
					button3:	{ command: 'near',	velocity: -1.4 },		// Y Button
					button4:	{ command: 'rollCameraX',	velocity: -0.6 },
					button5:	{ command: 'rollCameraX',	velocity:  0.6 },
					button6:	{ command: 'rollCameraX',	velocity: -1.8 },
					button7:	{ command: 'rollCameraX',	velocity:  1.8 },
					button12: 	{ command: 'moveY',	velocity: -200 },
					button13: 	{ command: 'moveY',	velocity:  200 },
					button14: 	{ command: 'moveX',	velocity: -200 },
					button15: 	{ command: 'moveX',	velocity:  200 },
					axes0:		{ command: 'moveX',	velocity:  600 },	
																// 左スティック左右
					axes1:		{ command: 'moveY',	velocity:  600 },
																// 左スティック前後
					axes3:		{ command: 'rollCameraY',	velocity:  0.6 },
																// 右スティック前後
					//以下の２行は暫定設定
					button1:	{ command: 'moveZ',	velocity:  400 },
					button2:	{ command: 'moveZ',	velocity: -400 },
				}
			};

		// check()メソッド, Map内のループから定期的に呼び出される
		gamepadController.check = function(){
			var
				gamepads = getGamepads();

			if ( this.active && gamepads ) {
				for ( var i = 0; i < gamepads.length; i++ ) {
					if ( gamepads[i] ) {
				        var
				        	pad = gamepads[i];

						// ボタンの状態チェック
						for( var j = 0; j < 17; j++ ) {
				            if ( pad.buttons[ j ] && pad.buttons[ j ].pressed ) {
				            	var
				            		action = this.assign[ 'button' + j ];
				            	this.map.exec( action, pad.buttons[ j ].value,
				            			pad.timestamp );
				            }
						}

						// スティックの状態チェック
						for( var j = 0; j < 4; j++ ) {
				            if ( Math.abs( pad.axes[ j ] ) > 0.01 ) {
				            									// 閾値を超えたら実行
				            	var
				            		action = this.assign[ 'axes' + j ];
				            	this.map.exec( action, pad.axes[ j ], pad.timestamp );
				            };
						}
					}
				}
			}
		}
		return gamepadController;
	}

	// 内部関数　ブラウザ互換のGamepadオブジェクトの取得
	function getGamepads () {
		var gamepads = null;
		if ( navigator.getGamepads ) {
			gamepads = navigator.getGamepads();
		} else if ( navigator.webkitGetGamepads ) {
			gamepads = navigator.webkitGetGamepads();
		}
		return gamepads;
	}

} ) ( Smap );
///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.geocoder.cisi.js, 2015-04-25, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		東京大学空間情報科学研究センター提供のサービスを利用するジオコーダの利用
///////////////////////////////////////////////////////////////////////////////

'use strict';

( function( Smap ) {
	
//
//	関数: Smap.geocoder.cisi()
//		CSISジオコーダの生成
//
	Smap.geocoder.csis =function() {
		var
			geocoder = {};

		geocoder.geocode = function( addr, params ) {
			// params関連は未実装
			var
				server = 'http://gsj-seamless.jp/labs/geocoder/csisgeocoderproxy.php?',
				promise,
				bounds = ( params && params.bounds ) ? Smap.bounds( params.bounds ): null,
				sw = ( bounds ) ? bounds.sw : null,
				ne = ( bounds ) ? bounds.ne : null,
				results = [];

			function search( series ) {
				var
					url = server + 'addr=' + addr + '&series=' +  series,
					promise;

				promise = Smap.loadXml( url ).then( function( xml ) {
					var
						candidates = xml.getElementsByTagName( 'candidate' ),
						title,
						lat,
						lng;
					
					for ( var i = 0; i < candidates.length; i ++ ) {
						// 以下 innerHTMLは，Chromeでは使えるがIEでは使えない．
						// textContentは両方使える
						title = candidates[i].getElementsByTagName( 'address' )[0].textContent;
						lat = candidates[i].getElementsByTagName( 'latitude' )[0].textContent;
						lng = candidates[i].getElementsByTagName( 'longitude' )[0].textContent;
						if ( !bounds ||
								( sw.lat < lat && lat < ne.lat && sw.lng < lng && lng < ne.lng ) ) {
							results.push( { latLng: Smap.latLng( [ lat, lng ] ), title: title });
						}
					}
				} );
				return promise;
			}

			promise = Smap.promiseFinishing( search( 'PLACE' ), search( 'ADDRESS' ) ).then( function() {
				return { results: results };
			} );
			return promise;
		}

		return geocoder;
	}

} ) ( Smap );
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
// PngElevationTileTerrainProvider.js
// ver 0.1.2, 2016-01-27 西岡 芳晴 ( NISHIOA Yoshiharu )
// PNG標高タイルを使うためのCesium.js用TerrainProvider
// Webメルカトル，正距円筒図法に対応

( function() {

	'use strict';
	var
		defaultUrl = 
			'http://gsj-seamless.jp/labs/elev/elev/{z}/{y}/{x}.png?size=257&errorpng=on',
        defaultCredit 		= 'GSJ, AIST、シームレス地質情報標高サービス(仮称)',
    	defaultHeightWidth 	= 64,	// 標高マップの幅
    	defaultMaximumLevel = 14,	// 最大ズームレベル,
    	defaultTileWidth = 257,		// タイル画像のサイズ
        defaultValue,
        defined,
    	PngElevationTileTerrainProvider;

	if ( typeof Cesium === 'undefined' ) {	// Cesiumが利用できない環境では何も返さず終了
		return;
	}

	defaultValue = Cesium.defaultValue,
    defined = Cesium.defined,
    PngElevationTileTerrainProvider = function( description ) {
    	var
    		credit,
    		tileWidth;	// タイルの画像幅

        description = defaultValue( description, defaultValue.EMPTY_OBJECT );

        this._url = defaultValue( description.url, defaultUrl );
        this._proxy = description.proxy;

		if ( typeof description.tilingScheme !== 'undefined' ) {
			// tilingSchemeの指定があればそれを使用
			this._tilingScheme = description.tilingScheme;
		} else {
			// デフォルトのtilingSchemeはWebメルカトルを使用
	        this._tilingScheme = new Cesium.WebMercatorTilingScheme( {
	        	numberOfLevelZeroTilesX: 2
	        	// Cesium 1.14現在，WebMeractorの標高では1は指定できない
	        } );
	    }

		this._heightmapWidth = defaultValue( description.heightMapWidth, defaultHeightWidth );

		this._maximumLevel = defaultValue( description.maximumLevel, defaultMaximumLevel );

        this._terrainDataStructure = {
            heightScale :  defaultValue( description.heightScale, 1 ),
            heightOffset : defaultValue( description.heightOffset, 0 ),
//            elementsPerHeight : 1,		//デフォルト値なので指定する必要無し
//            stride : 1,					//デフォルト値なので指定する必要無し
//            elementMultiplier : 256,		//デフォルト値なので指定する必要無し
        };

        this._levelZeroMaximumGeometricError = 
        		Cesium.TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        	this._tilingScheme.ellipsoid, 
        	this._heightmapWidth,
        	this._tilingScheme.getNumberOfXTilesAtLevel( 0 )
        );

        this._errorEvent = new Cesium.Event();

        credit = defaultValue( description.credit, defaultCredit );
        if (typeof credit === 'string') {
            credit = new Cesium.Credit( credit );
        }
        this._credit = credit;
        
        tileWidth = defaultValue( description.tileWidth, defaultTileWidth );
        this._zoomAdjustment = Math.floor( 
        		Math.log( tileWidth / this._heightmapWidth / 2 ) * Math.LOG2E );
    };
    Cesium.PngElevationTileTerrainProvider = PngElevationTileTerrainProvider;

    PngElevationTileTerrainProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        var
        	orgx = x,				// リクエストされたx座標を保持
        	orgy = y,				// リクエストされたy座標を保持
        	url = this._url,		// タイル画像URLテンプレート
	        proxy = this._proxy,	// プロキシ
	    	zoomAdj = Math.min( level, this._zoomAdjustment ),
	    						// ズームレベル調整係数．
						    	// zoomAdjustmentよりlevelが小さいときはlevel値そのものになる
	    	xAdj = 1,			// x座標の補正用
	    	yAdj = 0,			// y座標の補正用，webMelcatorは0, LatLngは1
	    	xAdj2, yAdj2,	// 標高マップとタイル画像の倍率の差
	        that = this,
	    	promise;

      	if ( this._tilingScheme.constructor === Cesium.GeographicTilingScheme ) {
	    	yAdj = 1;	
		}
		xAdj2 = Math.pow( 2, zoomAdj + xAdj );
		yAdj2 = Math.pow( 2, zoomAdj + yAdj );
		
		// ズームレベル調整値によりタイル座係数を変更
		level -= zoomAdj;
		x >>= zoomAdj + xAdj;
		y >>= zoomAdj + yAdj;

        url = url.replace( '{z}', level );
        url = url.replace( '{y}', y );
        url = url.replace( '{x}', x );

        throttleRequests = defaultValue( throttleRequests, true );
        if (throttleRequests) {
            promise = Cesium.throttleRequestByServer (url, Cesium.loadImage );
            if ( !defined( promise ) ) {
                return undefined;
            }
        } else {
            promise = Cesium.loadImage(url);
        }
        
        return Cesium.when( promise, function( image ) {
	       	var
            	hmp,							// 出力する標高マップ( HeightMap )
            	wim = image.width,				// 標高タイル画像の横幅
            	whm = that._heightmapWidth,		// 標高マップの横幅
            	errorpng = ( wim === 1 );		// 標高タイル画像の幅が1なら無効タイルとみなし，
            									// errorpng = true

			// 標高マップの準備．標高分解能により各データサイズを変更
			// 誇張のために1以下を指定したときも32bitとして扱ってしうまうが
			// まれなケースであり動作には支障はない
			if ( that._terrainDataStructure.heightScale < 1 ) {
				hmp = new Int32Array( whm * whm )
			} else {
				hmp = new Int16Array( whm * whm )
			}
            if( !errorpng ){
                var
	            	bpp = 4,    							// bytes per pixel
					pix = Cesium.getImagePixels( image ),	// 標高タイル画像データ
					p_hmp = 0,								// 標高マップ内のポインター
					p,										// 標高タイル画像内のポインタ
					px,											// pのx成分
					px0   = ( wim - 1 ) * ( orgx / xAdj2 % 1 ),	// pxの初期値
					py    = ( wim - 1 ) * ( orgy / yAdj2 % 1 ),	// pのy成分
					pxinc = ( wim - 1 ) / ( whm - 1 ) / xAdj2,	// pxの増加量
					pyinc = ( wim - 1 ) / ( whm - 1 ) / yAdj2,	// pyの増加量
					h;										// 標高値

                for( var y = 0; y < whm; ++y ){
                    px = px0;
                    for( var x = 0; x < whm; ++x ){
                        p = ( Math.round( py ) * wim + Math.round( px ) ) * bpp
                        h = 256 * ( 256 * pix[ p+0 ] + pix[ p+1 ] ) + pix[ p+2 ];
                        h = ( h == 8388608 ) ? 0 : h;	// 無効値補正
                        hmp[ p_hmp++ ] = h << 8 >> 8;	// 24ビットの2補数表現と解釈
                        px += pxinc;
                    }
                    py += pyinc;
                }

            }
            return new Cesium.HeightmapTerrainData({
                buffer : hmp,
                width :  whm,
                height : whm,
                structure : that._terrainDataStructure,
                childTileMask : level < that._maximumLevel && !errorpng ? 15 : 0,
            } );
/*
       }, function(){			// File Not Foundのときは，ダミーのデータを返す
       	   						// 開発者ツールのエラーメッセージは無くならないが，
       	   						// 若干少なくなる
       	   						// が，深く傾けるとエラーで止まるようになる
            return new Cesium.HeightmapTerrainData({
                buffer : null,
                width :  0,
                height : 0,
                structure : that._terrainDataStructure,
                childTileMask : 0
            } );
*/
        } );
    };

    PngElevationTileTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    PngElevationTileTerrainProvider.prototype.getTileDataAvailable = function(x, y, level) {
        return undefined;
    };

    Cesium.defineProperties( PngElevationTileTerrainProvider.prototype, {
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },
        credit : {
            get : function() {
                return this._credit;
            }
        },
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },
        ready : {
            get : function() {
                return true;
            }
        },
        hasWaterMask : {
            get : function() {
                return false;
            }
        },
        hasVertexNormals : {
            get : function() {
                return false;
            }
        }
    } );

} )();///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.controllers.leap.js, 2015-12-25, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		Leap Motionコントローラー
///////////////////////////////////////////////////////////////////////////////
//	残務
//		ジェスチャーの対応
//		サインの追加（人差し指以外等）

'use strict';

( function( Smap ) {

	Smap.controller = ( Smap.controller ) ? Smap.controller : {};

//
//	関数: Smap.controller.leap()
//		Leap Motionコントローラの生成
//
	Smap.controller.leap = function() {
		var
			leapController = { 
				id: 'leap',
				active: true,
				assign: {			// コマンドアサイン
					'palmPositionX': 	{ command: 'rollCameraX',	velocity: 2 },
					'palmPositionY': 	{ command: 'moveZ',			velocity: 2 },
					'palmPositionZ': 	{ command: 'near',			velocity: 0.005 },
					'palmNormZ':		{ command: 'rollCameraY',	velocity: -1 },
					'scissors':			{ command: 'resetView' },
				},
				play: 50,				// センサーのあそび(ピクセル)
				signDuration: 1000,	// サインを認識する持続時間(ms)
			},
			hand,
			sign = { type: null, start: null },		// ユーザサイン
			dpi =72,
		   	dpmm = dpi / 25.4,
			wp = 800,		//ウインドウサイズ,暫定値
			fov = 110,		// fov(360度法）,暫定値
			ph = wp / Math.tan( fov / 180 * Math.PI / 2 ) * 2;
						//ph: ピクセル高度，高度をピクセル数に換算したもの

		if ( typeof Leap == 'undefined' ){	// Leapが定義されていなければ何も返さず終了
			return;
		}

		leapController.original = new Leap.Controller();
		leapController.original.connect();
			//　contorollerは，明示的にconnect()を呼び出さないと起動しない．

		leapController.check = function(){
			var
				map = this.map,
				duration = this.signDuration,
				play = this.play,
				assign = this.assign,
			   	extendedLength = 0,		//伸びている指の数
			   	frame = this.original.frame(),
				hand = frame.hands[ 0 ];

			// operationに対応したコマンドを実行
			function exec( operation, value ){
				var
					action = assign[ operation ];

				if ( action ) {
					if ( Math.abs( value ) < play ){
						// 変位(ピクセル)がplay以下なら動作させない
						return;
					}
					if ( [ 'rollX', 'rollY', 'rollCameraX', 'rollCameraY'
							].indexOf(	action.command ) >= 0 ) {
						value = value / ph;
									// 回転系のコマンドならラジアンに変換
					}
					map.exec( action, value );
				}
			}

			// 手の状態を確認し，duration時間以上維持していたらコマンドを実行
			function checkSign( aType ){
				if ( assign[ aType ] ) {
					if ( sign.type == aType ) { // 状態を維持している
						if ( new Date() - sign.start > duration) {
							map.exec( assign[ aType ], 1, frame.timestamp );
							sign.type = null;
						}
					} else { // 状態の開始
						sign = { type: aType, start: new Date() };
					}
				}
			}

			if ( hand ) {
				var
				   	pos = hand.palmPosition,
					nor = hand.palmNormal,
					dir = hand.direction;

				if ( hand.grabStrength < 0.5 ) {	// にぎっていなければ
					// 伸びている指の数を数える
					for( var j = 0; j < hand.fingers.length; j++ ){
						if ( hand.fingers[ j ].extended ) {
							extendedLength++;
						}
					}
					if ( extendedLength > 3 ) {
						// 指が3本以上伸びていれば通常操作
						exec( 'palmPositionX', pos[0] * dpmm );
						exec( 'palmPositionY', ( pos[1] - 150 ) * dpmm );
						exec( 'palmPositionZ', pos[2] * dpmm );
						exec( 'palmNormX', Math.asin( nor[0] ) * ph );
						exec( 'palmNormY', Math.asin( nor[1] ) * ph );
						exec( 'palmNormZ', Math.asin( nor[2] ) * ph );
						exec( 'directionX', Math.asin( dir[0] ) * ph );
						exec( 'directionY', Math.asin( dir[1] ) * ph );
						exec( 'directionZ', Math.asin( dir[2] ) * ph );
						sign.type = null;
					} else if ( extendedLength == 2 ) {			// 2本指なら
						checkSign( 'twoFingers' );
						if ( hand.fingers[ 1 ].extended 
								&& hand.fingers[ 2 ].extended) {
							checkSign( 'scissors' );			// 人差し指と中指なら
						}
					} else if ( extendedLength == 1 ) {			// 1本指なら
						checkSign( 'oneFinger' );
						if ( hand.fingers[ 1 ].extended ) {		// 人差し指なら
							checkSign( 'firstFinger', 
									hand.fingers[ 1 ].tipPosition );
						}
					}
				}
			}
		}
		return leapController;
	}

} ) ( Smap );
