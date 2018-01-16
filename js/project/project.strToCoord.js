//----------------------------------------------------------------------------------------------------
//緯度経度高度のカンマ区切り文字列を3Dで使用するxyz座標に変換する関数
//----------------------------------------------------------------------------------------------------
/*
	@param	string	: 緯度経度高度のカンマ区切り文字列
	@return	mixed	: xyz座標objectまたはfalse
*/
project.strToCoord = function ( str_ ) {
	//カンマ区切りで小数が2つまたは3つ（空白文字使用可）
	var pattern = /^\s*\-?[0-9]+(\.[0-9]+)?\s*\,\s*\-?[0-9]+(\.[0-9]+)?\s*(\,\s*\-?[0-9]+(\.[0-9]+)?)?\s*$/;
	
	if ( !str_.match(pattern) ) {
		return false;
	} else {
		var values = str_.split( ',' );
		
		var coords = {
						'lat' : parseFloat( $.trim(values[0]) ),
						'lng' : parseFloat( $.trim(values[1]) )
					};
		if (
			isNaN( coords.lat ) || isNaN( coords.lng )
			|| coords.lat > 85.051129 || coords.lat < -85.051129
			|| coords.lng > 180 || coords.lng < -180
		) {
			return false;
		} else {
			if (
				values.length === 3
			) {
				coords.alt = parseFloat( $.trim(values[2]) );
			}
			return coords;
		}
	}
};
