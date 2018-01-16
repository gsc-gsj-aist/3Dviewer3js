project.getImage = {};

/*
	wms
	@param	"options_"		: option values for getting image data.
	@param	"mapOptions_"	: options for creating backgroud map (=3d area).
*/
project.getImage.wms = function ( options_, mapOptions_ ) {
	var that = this;
	
	//リサイズ、図郭再構成のフラグ
	var fitting = false;
	
	//wms取得のパラメータを用意する
	
	//第2引数が指定されている場合のみ処理
	if ( typeof mapOptions_ !== 'undefined' ) {
		//wmsエリア指定がない場合は背景地図のエリアを継承（図郭再構成不要）
		if ( !options_.area ) {
			options_.area = mapOptions_.area;
			options_.parameters.width	= mapOptions_.size.width;
			options_.parameters.height	= mapOptions_.size.height;
		} else {
			//エリア指定がある場合は
			var nwPixelXY = Smap.latLngToPoint( options_.area.nw, mapOptions_.zoom );
			var sePixelXY = Smap.latLngToPoint( options_.area.se, mapOptions_.zoom );
			//options_.parameters.width	= sePixelXY.x - nwPixelXY.x;
			//options_.parameters.height	= sePixelXY.y - nwPixelXY.y;
			options_.parameters.width	= sePixelXY.x - nwPixelXY.x + 1;
			options_.parameters.height	= sePixelXY.y - nwPixelXY.y + 1;
			
			fitting = true;
		}//if
	}//if
	
	options_.parameters.bbox	= project.getBbox(
										[ options_.area.nw.lng, options_.area.nw.lat ],
										[ options_.area.se.lng, options_.area.se.lat ],
										options_.parameters.crs ? options_.parameters.crs : options_.parameters.srs
									);
	
	//wms取得のURLを決める
	var url = options_.url;
	for ( var i in options_.parameters ) {
		url += i + '=' + encodeURIComponent( options_.parameters[i] ) + '&';
	}//for
	
	return Smap.loadImage( url )
					.then(
						function ( data_ ) {
							//getMapした画像をcanvasに展開
							var canvas = document.createElement( 'canvas' );
							canvas.width = options_.parameters.width;
							canvas.height = options_.parameters.height;
							var ctx = canvas.getContext( '2d' );
							ctx.drawImage( data_, 0, 0 );
							
							//フラグ判定で分岐処理
							if ( fitting ) {
								//フラグが経っている場合は図郭範囲で再構成
								return that._fit2area( canvas, options_.area, mapOptions_ );
							} else {
								//フラグが経っていない場合はそのまま返す
								return {
												'canvas' : canvas,
												'offset' : { 'x' : 0, 'y' : 0 }
											};
							}
						},//function
						function ( error_ ) {
							//
							return false;
						}//function
					);//then
};//function

/*
	wmts
	@param	"options_"		: option values for getting image data.
	@param	"mapOptions_"	: options for creating backgroud map (=3d area).
*/
project.getImage.wmts = function ( options_, mapOptions_ ) {
	//--------------------------------------------------------------------------------
	//タイルの幅と高さは256ピクセル固定
	var TILE_WIDTH = 256;
	var TILE_HEIGHT = 256;
	
	var that = this;
	var fitting = false;
	
	if ( typeof mapOptions_ !== 'undefined' ) {
		if ( !options_.area ) {
			options_.area = mapOptions_.area;
		} else {
			fitting = true;
		}//if
		if ( !options_.zoom ) {
			options_.zoom = mapOptions_.zoom;
		} else {
			fitting = true;
		}//if
	}//if
	
	//--------------------------------------------------------------------------------
	//図郭のピクセル座標とタイル座標を求める
	var nwPixelXY = Smap.latLngToPoint( options_.area.nw, options_.zoom );
	var nwTileXY = {
					'x' : Math.floor( nwPixelXY.x / TILE_WIDTH ),
					'y' : Math.floor( nwPixelXY.y / TILE_HEIGHT ),
				};
	var sePixelXY = Smap.latLngToPoint( options_.area.se, options_.zoom );
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
	//タイルを取得して画像を作成する
	//パラメータでurl指定の有無で分岐
	if (
		typeof options_.url === 'undefined'
		|| options_.url === false
	) {
		//--------------------------------------------------------------------------------
		//url指定がない場合は空のcanvasを返す
		return Smap.promise.resolve(
					(function(){
						var canvas = document.createElement( 'canvas' );
						canvas.width = mapPixelWidth;
						canvas.height = mapPixelHeight;
						var ctx = canvas.getContext( '2d' );
						ctx.fillStyle = 'rgba(128,0,0,0)';
						ctx.fillRect( 0, 0, mapPixelWidth, mapPixelHeight );
						return {
									'canvas' : canvas,
									'offset' : { 'x' : 0, 'y' : 0 }
								};
					})()
				);
	} else {
		//--------------------------------------------------------------------------------
		//url指定がある場合
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
						var tileUrl = L.Util.template( options_.url, coord );
						//タイルを取得するpromiseを生成する
						return Smap.loadImage( tileUrl )
							.then(
								function ( data_ ) {
									//取得に成功したら当該画像とオフセット値で構成されるオブジェクトを返す
									return {
											'image' 	: data_,
											'offsetX'	: obj_.offsetX,
											'offsetY'	: obj_.offsetY
										};
								},//function
								function ( error_ ) {
									//取得に失敗した場合は空のタイルを作って返す（標高タイルバージョン0系1系両対応）
									var canvas = document.createElement( 'canvas' );
									canvas.width = TILE_WIDTH;
									canvas.height = TILE_HEIGHT;
									var ctx = canvas.getContext( '2d' );
									ctx.fillStyle = 'rgba(128,0,0,0)';
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
					})( tile, options_.zoom )//function
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
							imageGridData[ data_[i].offsetY ] = [];
						}//if
						//画像をcanvasに読み込んで色データを取得し、配列に格納する
						imageGridData[ data_[i].offsetY ][ data_[i].offsetX ] = (function( image_ ){
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
										
										//タイルを1枚ずつcanvasに貼り付ける
										for ( var tileY=0; tileY<tileCountY; tileY++ ) {
											for ( var tileX=0; tileX<tileCountX; tileX++ ) {
												ctx.putImageData( imageGridData_[tileY][tileX], tileX * 256, tileY * 256 );
											}//for
										}//for
										
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
																width_ + 1,
																height_ + 1
															);
						//取り出したデータを切り出し画像のデータとしてセットする
						ctx.putImageData( srcImageData, 0, 0 );
						
						//フラグ判定で分岐処理
						if ( fitting ) {
							//フラグが経っている場合は図郭範囲で再構成
							return that._fit2area( canvas, options_.area, mapOptions_ );
						} else {
							//フラグが経っていない場合はそのまま返す
							return {
											'canvas' : canvas,
											'offset' : { 'x' : 0, 'y' : 0 }
										};
						}
					})( canvasSrc, innerPixelCoordOnTileLT.x, innerPixelCoordOnTileLT.y, mapPixelWidth, mapPixelHeight );
				
			},//function
			function ( error_ ) {
				//
				return false;
			}//function
		);//then
	}//if
};//function

/*
	geotiff
	@param	"options_"		: option values for getting image data.
	@param	"mapOptions_"	: options for creating backgroud map (=3d area).
*/
project.getImage.geo = function ( options_, mapOptions_ ) {
	var that = this;
	
	//promise配列を用意する
	var promises = [];
	//画像取得promiseを登録
	promises.push(
		Smap.loadImage( options_.image )
	);
	//ワールドファイル取得promiseを登録
	promises.push(
		Smap.loadText( options_.world ).then(
			function ( data_ ) {
				//ワールドファイルを読み取る
				var lines = $.trim( data_ ).split( "\n" );
				if ( lines.length !== 6 ) {
					//ワールドファイルの行数（常に6）が正しくない場合はエラー
					return false;
				} else {
					//ワールドファイルをオブジェクトにして返す
					return {
							'pixelWidth'	: parseFloat( $.trim(lines[0]) ),
							'rotationRow'	: parseFloat( $.trim(lines[1]) ),	//0である想定で使用しない
							'rotationCol'	: parseFloat( $.trim(lines[2]) ),	//0である想定で使用しない
							'pixelHeight'	: parseFloat( $.trim(lines[3]) ),
							'lt'			: {
													'lng' : parseFloat( $.trim(lines[4]) ),
													'lat' : parseFloat( $.trim(lines[5]) )
												}
						};
				}
			},//function
			function ( error_ ) {
				//
				return false;
			}//function
		)//then
	);//push
	
	//promiseを実行して返す
	return Smap.promise.finishing ( promises ).then(
		function ( data_ ) {
			//受け取ったデータを変数に格納
			var image		= data_[0];
			var parameters	= data_[1];
			
			//半ピクセルずれる
			var pixelNwCanvas = Smap.latLngToPoint( mapOptions_.area.nw, mapOptions_.zoom );
			var pixelNwImage = Smap.latLngToPoint( parameters.lt, mapOptions_.zoom );
			var offset = {
								'x' : pixelNwImage.x - pixelNwCanvas.x,
								'y' : pixelNwImage.y - pixelNwCanvas.y
							};
			
			//オーバーレイの南東端座標を計算する
			var se = {
							'lat' : parameters.lt.lat + image.height * parameters.pixelHeight,
							'lng' : parameters.lt.lng + image.width * parameters.pixelWidth
						}
			
			//図郭範囲で再構成して返す
			return that._fit2area( image, {'nw' : parameters.lt, 'se' : se}, mapOptions_ )
		},//function
		function ( error_ ) {
			//
			return false;
		}//function
	);//then
};//function

/*
	@param	object	: overlay image
	@param	object	: overlay bound box (nw, se)
	@param	object	: basemap parameter
	@return	object	: canvas
*/
project.getImage._fit2area = function ( img_, imgArea_, mapOptions_ ) {
	
	//背景地図と同じピクセルサイズの背景透明画像（canvas）を作る（合成を簡単にするため）
	var canvas = document.createElement( 'canvas' );
	canvas.width	= mapOptions_.size.width;
	canvas.height	= mapOptions_.size.height;
	var ctx = canvas.getContext( '2d' );
	ctx.fillStyle = 'rgba(0,0,0,0)';
	ctx.fillRect( 0, 0, canvas.width, canvas.height );
	
	//背景地図のピクセル座標を計算する
	var nwPixelXY = Smap.latLngToPoint( mapOptions_.area.nw, mapOptions_.zoom );
	
	//オーバーレイのピクセル座標を計算する
	var nwImgPixelXY = Smap.latLngToPoint( imgArea_.nw, mapOptions_.zoom );
	var seImgPixelXY = Smap.latLngToPoint( imgArea_.se, mapOptions_.zoom );
	
	//オーバーレイを貼り付ける際のサイズを計算する
	var newSize = {
		'width'		: seImgPixelXY.x - nwImgPixelXY.x,
		'height'	: seImgPixelXY.y - nwImgPixelXY.y
	};
	
	//オーバーレイの背景透明画像（canvas）に対するオフセット値を計算する
	var offset = {
		'x' : nwImgPixelXY.x - nwPixelXY.x,
		'y' : nwImgPixelXY.y - nwPixelXY.y
	};
	
	//背景透明画像（canvas）にオーバーレイを貼り付ける
	ctx.drawImage( img_, 0, 0, img_.width, img_.height, offset.x, offset.y, newSize.width, newSize.height );
	
	//新たに作成したオーバーレイ画像（canvas）を返す
	return {
				'canvas' : canvas,
				'offset' : offset
			};
}//function
