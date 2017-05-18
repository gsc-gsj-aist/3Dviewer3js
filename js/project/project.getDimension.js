//----------------------------------------------------------------------------------------------------
//図郭の幅と高さをm単位で求める
//----------------------------------------------------------------------------------------------------
/*
	@param	object	: north west lat, lng
	@param	object	: south east lat, lng
	@return	object	: width(m), height(m)
*/
project.getDimension = function ( nwLatLng_, seLatLng_ ) {
	//中心経緯度を計算から求める
	var centerLatLng = (function( nwLatLng__, seLatLng__ ){
						var center = geolib.getCenter([
													    { 'latitude': nwLatLng__.lat, 'longitude': nwLatLng__.lng },
													    { 'latitude': seLatLng__.lat, 'longitude': seLatLng__.lng }
													]);
						return {
								'lat' : center.latitude,
								'lng' : center.longitude
							};
					})( nwLatLng_, seLatLng_ );
	//東西方向の距離（幅）を計算する（単位m）
	var mapMeterWidth = geolib.getDistance(
											{ 'latitude' : centerLatLng.lat, 'longitude' : nwLatLng_.lng },
											{ 'latitude' : centerLatLng.lat, 'longitude' : seLatLng_.lng }
										);
	//南北方向の距離（高さ）を計算する（単位m）
	var mapMeterHeight = geolib.getDistance(
											{ 'latitude' : nwLatLng_.lat, 'longitude' : centerLatLng.lng },
											{ 'latitude' : seLatLng_.lat, 'longitude' : centerLatLng.lng }
										);
	//幅と高さを返す（単位m）
	return {
			'width' : mapMeterWidth,
			'height' : mapMeterHeight
		};
};//function

