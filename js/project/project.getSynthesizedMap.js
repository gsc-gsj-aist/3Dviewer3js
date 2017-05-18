//----------------------------------------------------------------------------------------------------
//図郭に含まれるタイルをすべてリクエストして合成し、図郭範囲だけを切り出す
//----------------------------------------------------------------------------------------------------
/*
	@param	string	: tile url template
	@param	object	: north west lat, lng
	@param	object	: south east lat, lng
	@param	integer	: zoom level
	@param	string	: RGBA color if tile not exist. 'rgba(0,0,0,0)'.
	@return	promise	: synthesized map on canvas
*/
project.getSynthesizedMap = function ( tmpl_, nwLatLng_, seLatLng_, zoom_, rgba_ ) {
	
	//--------------------------------------------------------------------------------
	//タイルの幅と高さは256ピクセル固定
	var TILE_WIDTH = 256;
	var TILE_HEIGHT = 256;
	
	//--------------------------------------------------------------------------------
	//図郭のピクセル座標とタイル座標を求める
	var nwPixelXY = Smap.latLngToPoint( nwLatLng_, zoom_ );
	var nwTileXY = {
					'x' : Math.floor( nwPixelXY.x / TILE_WIDTH ),
					'y' : Math.floor( nwPixelXY.y / TILE_HEIGHT ),
				};
	var sePixelXY = Smap.latLngToPoint( seLatLng_, zoom_ );
	var seTileXY = {
					'x' : Math.floor( sePixelXY.x / TILE_WIDTH ),
					'y' : Math.floor( sePixelXY.y / TILE_HEIGHT ),
				};
	
	//--------------------------------------------------------------------------------
	//生成する地図の幅と高さ、図郭北西端の当該タイル内でのピクセル座標を求める
	var mapPixelWidth = sePixelXY.x - nwPixelXY.x;
	var mapPixelHeight = sePixelXY.y - nwPixelXY.y;
	var innerPixelCoordOnTileLT = {
							'x' : nwPixelXY.x % TILE_WIDTH,
							'y' : nwPixelXY.y % TILE_HEIGHT
						};
	
	//--------------------------------------------------------------------------------
	//該当範囲が含まれるタイルを走査して、タイル画像と北西端タイルからのオフセットを取得し、
	//promise配列に格納する
	//空の配列を用意しておき、y方向x方向に走査
	var promises = [];
	for ( var y=nwTileXY.y; y<=seTileXY.y; y++ ) {
		for ( var x=nwTileXY.x; x<=seTileXY.x; x++ ) {
			//タイル座標と北西端タイルとのオフセットを決める
			var tile = {
						'x' : x,
						'y' : y,
						'offsetX' : x - nwTileXY.x,
						'offsetY' : y - nwTileXY.y
					};
			
			//タイルを取得するpromiseを生成してpromise配列に格納する
			promises.push(
				(function( obj_, zoom__ ){
					//タイル座標を決める
					var coord = {
									'x' : obj_.x,
									'y' : obj_.y,
									'z' : zoom__
								};
					//タイルURLを決める
					var tileUrl = L.Util.template( tmpl_, coord );
					//タイルを取得するpromiseを生成する
					return Smap.loadImage( tileUrl )
						.then(
							function ( data_ ) {
								//取得に成功したら当該画像とオフセット値で構成されるオブジェクトを返す
								return {
										'image' : data_,
										'offsetX' : obj_.offsetX,
										'offsetY' : obj_.offsetY
									};
							},//function
							function ( error_ ) {
								//取得に失敗した場合は空のタイルを作って返す（標高タイルバージョン0系1系両対応）
								var canvas = document.createElement( 'canvas' );
								canvas.width = TILE_WIDTH;
								canvas.height = TILE_HEIGHT;
								var ctx = canvas.getContext( '2d' );
								var color = rgba_;
								if ( typeof color === 'undefined' ) {
									color = 'rgba(128,0,0,0)';
								}//if
								ctx.fillStyle = color;
								ctx.fillRect( 0, 0, TILE_WIDTH, TILE_HEIGHT );
								return Smap.loadImage( canvas.toDataURL('image/png') ).then(
									function ( data_ ) {
										return {
													'image' : data_,
													'offsetX' : obj_.offsetX,
													'offsetY' : obj_.offsetY
												};
									},//function
									function ( error_ ) {
										//必ず成功するのでこの処理は呼ばれない（はず）
									}//function
								);//then
							}//function
						);//then
				})( tile, zoom_ )//function
			);//push
		}//for
	}//for
	
	return Smap.promise.finishing ( promises )
		.then(
			function ( data_ ) {
				//取得完了時の処理（受け取るのはタイル群のリクエストプロミスの結果を並べた配列）
				
				//----------------------------------------------------------------------
				//タイルを合成する処理その2（最初の画像読み込み以外ではdrawImageを使用しない）
				var imageGridData = [];
				//各タイル画像を走査
				for ( var i=0,j=data_.length; i<j; i++ ) {
					//配列未精製の場合は初期化しておく
					if ( typeof imageGridData[data_[i].offsetY] === 'undefined' ) {
						imageGridData[data_[i].offsetY] = [];
					}
					//画像をcanvasに読み込んで色データを取得し、配列に格納する
					imageGridData[data_[i].offsetY][data_[i].offsetX] = (function( image_ ){
																			var canvas = document.createElement( 'canvas' );
																			canvas.width = TILE_WIDTH;
																			canvas.height = TILE_HEIGHT;
																			var ctx = canvas.getContext( '2d' );
																			ctx.drawImage( image_, 0, 0 );
																			var imageData = ctx.getImageData( 0, 0, TILE_WIDTH, TILE_HEIGHT );
																			return imageData;
																		})( data_[i].image );
				}//for
				
				//タイル合成画像のcanvasを作成
				var canvasSrc = (function( imageGridData_ ){
									//高さ方向、幅方向のタイルの枚数を取得
									var tileCountY = imageGridData_.length;
									var tileCountX = data_.length / tileCountY;
									
									//合成した絵を作るためのcanvas、色データを準備する
									var canvas = document.createElement( 'canvas' );
									canvas.width = TILE_WIDTH * tileCountX;
									canvas.height = TILE_HEIGHT * tileCountY;
									var ctx = canvas.getContext( '2d' );
									
									for ( var tileY=0; tileY<tileCountY; tileY++) {
										for ( var tileX=0; tileX<tileCountX; tileX++ ) {
											ctx.putImageData( imageGridData_[tileY][tileX], tileX * 256, tileY * 256 );
										}
									}
									
									return canvas;
				})( imageGridData );
				
				//ここまででcanvasを返せば正常に描画されるが次のpromise処理を実行させると絵がおかしくなる
				//どうもdrawImageが悪さをしているように思える。
				//return Smap.loadImage( canvas.toDataURL('image/png') );
				//return canvas;
				
				//タイル合成画像から必要な部分だけ切り出して返す
				return (function( canvasSrc_, x_, y_, width_, height_ ){
					//切り出し画像のcanvasを生成する
					var canvas = document.createElement( 'canvas' );
					canvas.width = width_;
					canvas.height = height_;
					var ctx = canvas.getContext( '2d' );
					
					//合成画像のcanvasから必要部分のみ取り出す
					var ctxSrc = canvasSrc_.getContext( '2d' );
					var srcImageData = ctxSrc.getImageData(
															x_,
															y_,
															width_,
															height_
														);
					//取り出したデータを切り出し画像のデータとしてセットする
					ctx.putImageData( srcImageData, 0, 0 );
					//切り出し画像のcanvasを返す
					return canvas;
					
				})( canvasSrc, innerPixelCoordOnTileLT.x, innerPixelCoordOnTileLT.y, mapPixelWidth, mapPixelHeight );
				
			},//function
			function ( error_ ) {
				//
				return false;
			}//function
		);//then
};//function

