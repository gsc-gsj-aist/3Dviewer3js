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
