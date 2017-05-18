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
