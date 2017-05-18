//----------------------------------------------------------------------------------------------------
//渡されたcanvasからcontextを取得し、imageDataを返す
//----------------------------------------------------------------------------------------------------
/*
	@param	canvas	: canvas
	@return	object	: imageData
*/
project.getImageDataFromCanvas = function ( canvas_ ) {
	var ctx = canvas_.getContext( '2d' );
	return ctx.getImageData( 0, 0, canvas_.width, canvas_.height );
};//function

