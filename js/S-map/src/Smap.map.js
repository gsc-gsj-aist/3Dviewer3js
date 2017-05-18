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
