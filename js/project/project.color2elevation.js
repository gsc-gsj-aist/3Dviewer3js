//----------------------------------------------------------------------------------------------------
//色を標高に変換する関数
//----------------------------------------------------------------------------------------------------
/*
	@param	integer	: Red
	@param	integer	: Green
	@param	integer	: Blue
	@param	integer	: Alphe
	@return	integer	: elevation
*/
project.color2elevation = function ( rrr_, ggg_, bbb_, aaa_ ) {
	/*
	//---------------------------------------------------------------------------
	//バージョン0系の標高計算
	if (
		rrr_ === 128
		&& ggg_ === 0
		&& bbb_ === 0
	) {
		//無効値は0にする
		var elevation = 0;
	} else {
		var value = rrr_ * Math.pow( 256, 2 )
						+ ggg_ * Math.pow( 256, 1 )
						+ bbb_ * Math.pow( 256, 0 );
		var elevation = ( (value < Math.pow(2, 23)) ? value : value - Math.pow(2, 24) );
	}//if
	*/
	//---------------------------------------------------------------------------
	//バージョン1系の標高計算
	var elevation;
	if ( aaa_ === 0 ) {
		//無効値は0にする
		elevation = 0;
	} else {
		var value = rrr_ * Math.pow( 256, 2 )
						+ ggg_ * Math.pow( 256, 1 )
						+ bbb_ * Math.pow( 256, 0 );
		elevation = ( (value < Math.pow(2, 23)) ? value : value - Math.pow(2, 24) );
	}//if
	
	//結果を返す
	return elevation;
};//function

