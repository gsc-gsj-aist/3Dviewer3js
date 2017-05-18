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
