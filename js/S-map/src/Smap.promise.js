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
