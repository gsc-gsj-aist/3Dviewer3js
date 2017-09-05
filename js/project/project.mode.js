//----------------------------------------------------------------------------------------------------
//モード別ピクセル色合成関数
//----------------------------------------------------------------------------------------------------
/*
	@param	integer	: ベースレイヤーの色値（0-255）
	@param	integer	: オーバーレイの色値（0-255）
	@param	float	: オーバーレイの不透明度（0-1）
	@return	integer	: 計算した色値
*/
project.mode = {};
//通常モード
project.mode.norm = function ( value0_, value1_, opacity_ ) {
	var value	= value0_ * ( 1 - opacity_ )
				+ value1_ * ( opacity_ );
	return Math.round( value );
};
//乗算モード
project.mode.multi = function ( value0_, value1_, opacity_ ) {
	var value = value0_ * ( 1 - opacity_ ) + ( value0_ * value1_ / 255 ) * opacity_;
	return Math.round( value );
};
