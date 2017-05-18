//----------------------------------------------------------------------------------------------------
//WMSのBBOX値を決める
//----------------------------------------------------------------------------------------------------
/*
	@param	array	: north-west coordinate (0:x or lng, 1:y or lat)
	@param	array	: south-east coordinate (0:x or lng, 1:y or lat)
	@param	string	: EPSG code for result bbox value
	@param	string	: EPSG code for specified corrdinates
	@param	string	: wms version for result bbox value
	@return	string	: bbox value
*/
project.getBbox = function ( nw_, se_, toEpsg_, fromEpsg_, wmsVersion_ ) {
	//version=1.3.0、EPSG:4326/4612ではxとyの意味が逆転するので分岐処理が必要になる
	//基本的に北西、南東端の座標はEPSG:4326（経緯度）で与えられるはず
	var fromEpsg = 'EPSG:4326';
	if ( typeof fromEpsg_ !== 'undefined' ) {
		fromEpsg = fromEpsg_;
	}
	//バージョン未指定は1.3.0とする
	var wmsVersion = '1.3.0';
	if ( typeof wmsVersion_ !== 'undefined' ) {
		wmsVersion = wmsVersion_;
	}
	//座標系変換後の値を格納する変数を準備
	var nw, se;
	//変換元と変換先のEPSGコードの違いで分岐処理
	if ( fromEpsg === toEpsg_ ) {
		//同じ場合はそのまま代入
		nw = nw_;
		se = se_;
	} else {
		//違う場合は座標変換
		nw = proj4( fromEpsg, toEpsg_, [nw_[0], nw_[1]] );
		se = proj4( fromEpsg, toEpsg_, [se_[0], se_[1]] );
	}
	//結果を格納する変数を準備
	var bbox;
	
	//WMSのバージョン、変換後のEPSGコードによる分岐処理
	//1.1系と1.3系で処理が違う（1.3系のEPSG:4326と4612がxy逆、但し通常4612は使わない）
	var wmsVersions = wmsVersion.split( '.' );
	if (
		wmsVersions[0] === '1'
		&& wmsVersions[1] === '3'
	) {
		switch ( toEpsg_ ) {
			case 'EPSG:4326':
			case 'EPSG:4612':
				bbox = se[1] + ',' + nw[0] + ',' + nw[1] + ',' + se[0];
				break;
			default:
				bbox = nw[0] + ',' + se[1] + ',' + se[0] + ',' + nw[1];
		}
	} else {
		bbox = nw[0] + ',' + se[1] + ',' + se[0] + ',' + nw[1];
	}
	
	//結果を返す
	return bbox;
};

