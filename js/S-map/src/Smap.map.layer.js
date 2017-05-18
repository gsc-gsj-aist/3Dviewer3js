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
