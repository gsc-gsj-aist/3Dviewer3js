//----------------------------------------------------------------------------------------------------
//WMSで指定範囲のオーバーレイを取得し、渡されたcanvas配列の後ろに追加して返す
//GetMapではリクエストで幅と高さが必要、かつ合成の際に背景地図と同じ幅と高さのオーバーレイが必要
//----------------------------------------------------------------------------------------------------
/*
	@param	array	: 2 canvass
	@return	promise	: 3 canvases promise
*/
project.pushWMSOverlay = function ( canvases_ ) {
	//convert EPSG:4326 lat,lng to EPSG:3857 x,y
	
	//wmsリクエストの準備
	var requestData = $.extend( true, {}, DEFINITIONS.wms.getMap );
	requestData.parameters.width = canvases_[1].width;
	requestData.parameters.height = canvases_[1].height;
	requestData.parameters.bbox = project.getBbox(
											[DEFINITIONS.area.nwLatLng.lng, DEFINITIONS.area.nwLatLng.lat],
											[DEFINITIONS.area.seLatLng.lng, DEFINITIONS.area.seLatLng.lat],
											requestData.parameters.crs ? requestData.parameters.crs : requestData.parameters.srs
										);
	
	app.mapData.wmsGetMapParameter = $.extend( true, {}, requestData.parameters );
	var url = requestData.url;
	for ( var i in requestData.parameters ) {
		url += i + '=' + encodeURIComponent( requestData.parameters[i] ) + '&';
	}//for
	
	//wmsでgetMap
	return Smap.loadImage( url )
			.then(
				function ( data_ ) {
					//getMapした画像をcanvasに展開
					var canvas = document.createElement( 'canvas' );
					canvas.width = canvases_[1].width;
					canvas.height = canvases_[1].height;
					var ctx = canvas.getContext( '2d' );
					ctx.drawImage( data_, 0, 0 );
					
					//標高canvas、地図canvas、オーバーレイcanvasを配列で返す
					return [ canvases_[0], canvases_[1], canvas ];
				},//function
				function ( error_ ) {
					//
				}//function
			)//then
};//function

