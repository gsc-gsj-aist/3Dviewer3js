//----------------------------------------------------------------------------------------------------
//緯度経度高度のカンマ区切り文字列を3Dで使用するxyz座標に変換する関数
//----------------------------------------------------------------------------------------------------
/*
	@param	string	: 緯度経度高度のカンマ区切り文字列
	@param	object	: 描画領域北西端の緯度経度
	@param	object	: 描画領域南東端の緯度経度
	@param	integer	: 標高タイルのズームレベル
	@return	mixed	: xyz座標objectまたはfalse
*/
project.latLngAltToCoord3d = function ( latLngAlt_, nwLatLng_, seLatLng_, zoom_ ) {
	//カンマ区切りの緯度経度高度を分割
	var values = latLngAlt_.split( ',' );
	if ( values.length !== 3 ) {
		//分割結果が3つでない場合はエラー
		return false;
	} else {
		//各値を浮動小数に変換して変数に格納
		var lat = parseFloat( values[0] );
		var lng = parseFloat( values[1] );
		var alt = parseFloat( values[2] );
		if (
			isNaN( lat ) || isNaN( lng ) || isNaN( alt )
			|| lat > 85.051129 || lat < -85.051129
			|| lng > 180 || lng < -180
		) {
			//各値が数値でなかったり、経緯度が指定範囲を超えた値の場合はエラー
			return false;
		} else {
			//北西端と南東端のWMTSピクセル座標を計算
			var nwPixelXY = Smap.latLngToPoint( nwLatLng_, zoom_ );
			var sePixelXY = Smap.latLngToPoint( seLatLng_, zoom_ );
			//3DのXY原点に相当するWMTSピクセル座標を計算
			var originPixelXY = { 'x' : ( nwPixelXY.x + sePixelXY.x ) / 2, 'y' : ( nwPixelXY.y + sePixelXY.y ) / 2 };
			//描画領域の幅と高さを計算
			var areaMeterSize = project.getDimension( nwLatLng_, seLatLng_ );
			//視点位置のWMTSピクセル座標を計算
			var cameraPixelXY = Smap.latLngToPoint( {'lat' : lat, 'lng' : lng}, zoom_ );
			//3DのXY原点から視点位置の距離を計算（縦横それぞれ1ピクセルあたりの距離を求め、XY原点からの視点までのピクセル数を乗じる）
			var x = areaMeterSize.width / ( sePixelXY.x - nwPixelXY.x ) * ( cameraPixelXY.x - originPixelXY.x );
			var y = areaMeterSize.height / ( sePixelXY.y - nwPixelXY.y ) *  ( originPixelXY.y - cameraPixelXY.y );
			//求めた結果が視点位置となる（但しz値は仮：ex値を使って再計算する）
			return  {
						'x' : x,
						'y' : y,
						'z' : alt
					};
		}//if
	}//if
};
