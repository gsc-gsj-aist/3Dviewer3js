//----------------------------------------------------------------------------------------------------
//2つのcanvasを不透明度を指定して重ねたcanvasを返す
//----------------------------------------------------------------------------------------------------
/*
	@param	canvas	: background image canvas
	@param	canvas	: foreground image canvas
	@param	float	: foreground image's opacity
	@return	canvas	: piled up canvas
*/
//project.pileUpCanvases = function ( baseCanvas_, overlayCanvas_, overlayOpacity_, mode_ ) {
project.pileUpCanvases = function ( baseCanvas_, overlayCanvas_, overlayOpacity_, modeFunction_ ) {
	
	var getImageDataFromCanvas = function ( canvas_ ) {
		var ctx = canvas_.getContext( '2d' );
		return ctx.getImageData( 0, 0, canvas_.width, canvas_.height );
	};
	
	//ベースとオーバーレイのimageDataを取得
	//var baseImageData = project.getImageDataFromCanvas( baseCanvas_ );
	//var overlayImageData = project.getImageDataFromCanvas( overlayCanvas_ );
	var baseImageData = getImageDataFromCanvas( baseCanvas_ );
	var overlayImageData = getImageDataFromCanvas( overlayCanvas_ );
	
	//合成方法関数の決定
	//var synthesisFunction = project.mode[ mode_ ];
	
	//返り値用canvasの準備
	var canvas = document.createElement( 'canvas' );
	canvas.width = baseCanvas_.width;
	canvas.height = baseCanvas_.height;
	var ctx = canvas.getContext( '2d' );
	var imageData = ctx.createImageData( baseCanvas_.width, baseCanvas_.height );
	for ( var y=0; y<canvas.height; y++ ) {
		for ( var x=0; x<canvas.width; x++ ) {
			var idx = ( (y * canvas.width) + x ) * 4;
			if ( overlayImageData.data[idx + 3] === 0 ) {
				//オーバーレイのピクセルが透明の場合、背景のピクセルをそのまま採用
				imageData.data[idx + 0] = baseImageData.data[idx + 0];
				imageData.data[idx + 1] = baseImageData.data[idx + 1];
				imageData.data[idx + 2] = baseImageData.data[idx + 2];
				imageData.data[idx + 3] = baseImageData.data[idx + 3];
			} else {
				//オーバーレイのピクセルが透明でない場合、背景のピクセルとの合成処理
				//imageData.data[idx + 0] = ( 1 - overlayOpacity_ ) * baseImageData.data[idx + 0] + ( overlayOpacity_ ) * overlayImageData.data[idx + 0];
				//imageData.data[idx + 1] = ( 1 - overlayOpacity_ ) * baseImageData.data[idx + 1] + ( overlayOpacity_ ) * overlayImageData.data[idx + 1];
				//imageData.data[idx + 2] = ( 1 - overlayOpacity_ ) * baseImageData.data[idx + 2] + ( overlayOpacity_ ) * overlayImageData.data[idx + 2];
				//imageData.data[idx + 3] = ( 1 - overlayOpacity_ ) * baseImageData.data[idx + 3] + ( overlayOpacity_ ) * overlayImageData.data[idx + 3];
				
				//imageData.data[idx + 0] = synthesisFunction( baseImageData.data[idx + 0], overlayImageData.data[idx + 0], overlayOpacity_ );
				//imageData.data[idx + 1] = synthesisFunction( baseImageData.data[idx + 1], overlayImageData.data[idx + 1], overlayOpacity_ );
				//imageData.data[idx + 2] = synthesisFunction( baseImageData.data[idx + 2], overlayImageData.data[idx + 2], overlayOpacity_ );
				imageData.data[idx + 0] = modeFunction_( baseImageData.data[idx + 0], overlayImageData.data[idx + 0], overlayOpacity_ );
				imageData.data[idx + 1] = modeFunction_( baseImageData.data[idx + 1], overlayImageData.data[idx + 1], overlayOpacity_ );
				imageData.data[idx + 2] = modeFunction_( baseImageData.data[idx + 2], overlayImageData.data[idx + 2], overlayOpacity_ );
				imageData.data[idx + 3] = 255;
			}//if
		}//for
	}//for
	ctx.putImageData( imageData, 0, 0 );
	
	//canvasを返す
	return canvas;
};//function

