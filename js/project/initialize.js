//****************************************************************************************************
//アプリケーション変数
//****************************************************************************************************
var app = {};

//------------------------------------------------------------
//three.js関連
app.three = {};

app.three.scene = false;
app.three.camera = false;
app.three.controls = false;

app.three.meshes = {};
app.three.meshes.base = false;
app.three.meshes.sections = [];
app.three.ping = false;

//------------------------------------------------------------
//地図描画オプション
app.mapOptions = {};

//------------------------------------------------------------
//地図関連データ格納用
app.mapData = {};

//背景地図とオーバーレイのcanvasを保持（不透明度変更時に再利用）
app.mapData.canvases = {};
app.mapData.canvases.bases		= {};
app.mapData.canvases.overlay	= false;
app.mapData.canvases.layers		= {};

//------------------------------------------------------------
//操作用
app.operation = {};

//クリック判定のマウス位置保持用
app.operation.mousemove = {};

//自動回転用
app.operation.rotation = {};
//回転速度を決めるためのクロック
app.operation.rotation.clock = new THREE.Clock( false );
//offsetは都度計算するのでここでは仮の値を指定（本来指定不要）
app.operation.rotation.offset = Math.PI;

//****************************************************************************************************
//プログラム本体
//****************************************************************************************************
$( document ).ready(function(){
	
	//タイトルを設定する
	if (
		typeof DEFINITIONS.title === 'string'
		&& DEFINITIONS.title.length
	) {
		//定義が文字列で、文字数がある場合のみタイトルを設定する
		$( 'h1' ).text( DEFINITIONS.title );
		window.document.title = DEFINITIONS.title;
	}
	
	//画面左下GSJのコピーライトリンク先を設定する
	if (
		typeof DEFINITIONS.link === 'string'
		&& DEFINITIONS.link.length
	) {
		//定義が文字列で、文字数がある場合のみリンク先を設定する
		$( '#copyrights a.gsjlink' ).attr({ 'href' : DEFINITIONS.link });
	}
	
	//==========================================================================================
	//地図描画オプションの変数を計算する
	//オーバーレイ生成時に使用する変数を登録しておく
	var area = {
					'nw' : project.strToCoord( DEFINITIONS.area.nw ),
					'se' : project.strToCoord( DEFINITIONS.area.se )
				};
	
	//図郭の長さ（単位m）
	app.mapOptions.dimension = project.getDimension(
								area.nw,
								area.se
							);
	
	//dem取得で使用（dem取得は起動時に1回だけ）
	app.mapOptions.dem = $.extend( true, {}, DEFINITIONS.dem );
	app.mapOptions.dem.area = area;	//参照渡し
	
	//オーバーレイ取得で使用（オプションレイヤーでも使用）
	app.mapOptions.base = {
							'zoom'		: DEFINITIONS.base.zoom,
							'area'		: area,						//参照渡し
							'dimension'	: app.mapOptions.dimension	//参照渡し
						};
	app.mapOptions.base.size = (function(){
										var nwPixelCoords	= Smap.latLngToPoint( area.nw, app.mapOptions.base.zoom );
										var sePixelCoords	= Smap.latLngToPoint( area.se, app.mapOptions.base.zoom );
										return {
												'width'		: sePixelCoords.x - nwPixelCoords.x,
												'height'	: sePixelCoords.y - nwPixelCoords.y
											};
									})();
	
	//==========================================================================================
	//3D構築（初期化）用パラメータを決定する
	//パラメータ変数の準備
	var initialParameters = {};
	
	//カメラ位置（指定されていない場合は領域南上空とする）
	if (
		typeof DEFINITIONS.initial.camera === 'string'
		&& DEFINITIONS.initial.camera.length
	) {
		initialParameters.camera = project.latLngAltToCoord3d(
																project.strToCoord( DEFINITIONS.initial.camera ),
																app.mapOptions.dem.area.nw,
																app.mapOptions.dem.area.se,
																app.mapOptions.dem.zoom
															);
	} else {
		initialParameters.camera = {
										'x' : 0,
										'y' : app.mapOptions.base.dimension.height * 3 / 4,
										'z' : 5000
									};
	}
	//オプションレイヤー
	initialParameters.layer	= [];
	if ( DEFINITIONS.initial.layer.length ) {
		initialParameters.layer	= DEFINITIONS.initial.layer.split( ',' )
	}
	//3Dモデルの上、視線の方向は常に固定（定義ファイルでの設定なし）
	initialParameters.up			= { 'x' : 0, 'y' : 0, 'z' : 1 };
	initialParameters.to			= { 'x' : 0, 'y' : 0, 'z' : 0 };
	//その他のパラメータは定義ファイルの値をセット
	initialParameters.base			= DEFINITIONS.initial.base;
	initialParameters.opacity		= DEFINITIONS.initial.opacity;
	initialParameters.section		= DEFINITIONS.initial.section;
	initialParameters.mode			= DEFINITIONS.initial.mode;
	initialParameters.ex			= DEFINITIONS.initial.ex;
	initialParameters.wire			= DEFINITIONS.initial.wire;
	initialParameters.keephorizon	= DEFINITIONS.initial.keephorizon;
	initialParameters.autorotation	= DEFINITIONS.initial.autorotation;
	
	//==========================================================================================
	//クエリーパラメータがあればそれを取得して初期値にセットする
	if ( window.location.search.length > 1 ) {
		//無名関数内で処理
		var queryParameters = (function( queryString_ ){
									//パラメータを格納する変数
									var parameters = {};
									//バリデーション成否を格納する変数
									var validation = true;
									//クエリーパラメータ文字列を各パラメータごとに分割してループ処理
									var pairs = queryString_.split( '&' );
									for ( var i=0,j=pairs.length; i<j; i++ ) {
										//バリデーション成否で分岐処理
										if ( !validation ) {
											//バリデーションに失敗があった場合は以降のバリデーションを中止
											break;
										} else {
											//パラメータをキーと値に分割
											var keyValue = pairs[i].split( '=' );
											//分割した個数で分岐
											if ( keyValue.length !== 2 ) {
												//分割個数が2でない（=は必ず1つ含まれるはず）場合はエラー
												validation = false;
											} else {
												//キーに応じたバリデーション
												switch ( keyValue[0] ) {
													//--------------------------------------------------
													//視点位置（カンマ区切りの緯度経度標高）
													case 'camera':
														var coord3d = project.latLngAltToCoord3d(
																									project.strToCoord( keyValue[1] ),
																									app.mapOptions.dem.area.nw,
																									app.mapOptions.dem.area.se,
																									app.mapOptions.dem.zoom
																								);
														if ( !coord3d ) {
															validation = false;
														} else {
															parameters.camera = coord3d;
														}//if
														break;
													//--------------------------------------------------
													//鉛直上方向の向き（カンマ区切りのxyz）
													case 'up':
														//xyzに分割
														var values = keyValue[1].split( ',' );
														if ( values.length !== 3 ) {
															//分割結果が3つでない場合はエラー
															validation = false;
														} else {
															//各値を浮動小数に変換して変数に格納
															var x = parseFloat( values[0] );
															var y = parseFloat( values[1] );
															var z = parseFloat( values[2] );
															
															if (
																isNaN( x ) || isNaN( y ) || isNaN( z )
																|| x < -1 || x > 1
																|| y < -1 || y > 1
																|| z < -1 || z > 1
															) {
																//各値が数値でなかったり、範囲を超えた値の場合はエラー
																validation = false;
															} else {
																//パラメータとして設定する
																parameters.up = {
																					'x' : x,
																					'y' : y,
																					'z' : z
																				};
																//up値を設定するとして、up値が水平を示さない場合は水平維持をfalseにする
																if (
																	parameters.up.x !== 0
																	|| parameters.up.y !== 0
																	|| parameters.up.z !== 1
																) {
																	parameters.keephorizon = false;
																}
															}//if
														}//if
														break;
													case 'to':
														var values = keyValue[1].split( ',' );
														if ( values.length !== 3 ) {
															//分割結果が3つでない場合はエラー
															validation = false;
														} else {
															//各値を浮動小数に変換して変数に格納
															var x = parseFloat( values[0] );
															var y = parseFloat( values[1] );
															var z = parseFloat( values[2] );
															if (
																isNaN( x ) || isNaN( y ) || isNaN( z )
															) {
																//各値が数値でなかったり、範囲を超えた値の場合はエラー
																validation = false;
															} else {
																//パラメータとして設定する
																parameters.to = {
																					'x' : x,
																					'y' : y,
																					'z' : z
																				};
															}//if
														}//if
														break;
													//--------------------------------------------------
													//背景地図
													case 'base':
														//オブジェクトに変数登録されたキーかどうかチェック
														if ( typeof DEFINITIONS.base.layers[keyValue[1]] === 'undefined' ) {
															//登録されていなければエラー
															validation = false;
														} else {
															//登録されていればパラメータとして設定する
															parameters.base = keyValue[1];
														}//if
														break;
													//--------------------------------------------------
													//地質図不透明度
													case 'opacity':
														//浮動小数に変換して変数に格納
														var opacity = parseFloat( keyValue[1] );
														if (
															isNaN( opacity )
															|| opacity < 0
															|| opacity > 1
														) {
															//値が数値でなかったり、所定の範囲を超えている場合はエラー
															validation = false;
														} else {
															//パラメータとして設定する
															parameters.opacity = opacity;
														}//if
														break;
													//--------------------------------------------------
													//地質図オプション
													case 'layer':
														var str = $.trim( keyValue[1] );
														if ( !str.length ) {
															validation = false;
														} else {
															parameters.layer = [];
															var values = str.split( ',' );
															for ( var k=0,l=values.length; k<l; k++ ) {
																if (
																	!values[k].length
																	|| typeof DEFINITIONS.overlay.layers[values[k]] === 'undefined'
																) {
																	validation = false;
																	break;
																} else {
																	parameters.layer.push( values[k] );
																}//if
															}//for
														}//if
														break;
													//--------------------------------------------------
													//断面図不透明度
													case 'section':
														//浮動小数に変換して変数に格納
														var section = parseFloat( keyValue[1] );
														if (
															isNaN( section )
															|| section < 0
															|| section > 1
														) {
															//値が数値でなかったり、所定の範囲を超えている場合はエラー
															validation = false;
														} else {
															//パラメータとして設定する
															parameters.section = section;
														}//if
														break;
													//--------------------------------------------------
													//合成モード
													case 'mode':
														//オブジェクトに関数登録されたキーかどうかチェック
														if ( typeof project.mode[keyValue[1]] === 'undefined' ) {
															//登録されていなければエラー
															validation = false;
														} else {
															//登録されていればパラメータとして設定する
															parameters.mode = keyValue[1];
														}//if
														break;
													//--------------------------------------------------
													//標高強調
													case 'ex':
														//整数に変換して変数に格納
														var ex = parseInt( keyValue[1], 10 );
														if (
															isNaN( ex )
															|| ex < 1
															|| ex > 5
														) {
															//値が数値でなかったり、所定の範囲を超えている場合はエラー
															validation = false;
														} else {
															//パラメータとして設定する
															parameters.ex = ex;
														}//if
														break;
													//--------------------------------------------------
													//ワイヤーフレーム表示
													case 'wire':
														//整数に変換して変数に格納
														var wire = parseInt( keyValue[1], 10 );
														if (
															wire !== 0
															&& wire !== 1
														) {
															//値が0でも1でもない場合はエラー
															validation = false;
														} else {
															//パラメータとして設定する
															parameters.wire = ( wire ? true : false );
														}//if
														break;
													//--------------------------------------------------
													//所定のパラメータ以外が指定されている場合
													default:
														//当該パラメータを無視する（バリデーション失敗としない）
														//validation = false;
												}//switch
											}//if
										}//if
									}//for
									//バリデーション失敗の有無で分岐
									if ( !validation ) {
										//バリデーション失敗があればエラーを返す
										return false;
									} else {
										//全てのバリデーションに成功すれば、パラメータとして返す
										return parameters;
									}//if
								})( window.location.search.substr( 1 ) );
		//クエリーパラメータが有効な場合は初期パラメータを上書きする
		if ( queryParameters ) {
			$.extend( true, initialParameters, queryParameters );
		}//if
	}//if
	//視点位置のz（標高）値を3Dシーン内のz値に変換する（標高強調は地形と断面に対してのみ実行しているため）
	initialParameters.camera.z = initialParameters.camera.z * initialParameters.ex;
	
	//背景地図なしの場合のみ、特殊な設定にする
	if (
		typeof DEFINITIONS.base.layers[initialParameters.base].url === 'undefined'
		|| DEFINITIONS.base.layers[initialParameters.base].url === false
	) {
		//合成モードをnorm、地質図不透明度を1で固定
		initialParameters.mode		= 'norm';
		initialParameters.opacity	= 1;
		$( '#panel input[name="opacity"]' ).prop( 'disabled', true );
		$( '#panel select[name="mode"]' ).prop( 'disabled', true );
	}
	
	//==========================================================================================
	//Formの準備をする（要素の準備と初期値決定）
	//背景地図種別（selectオプション）を登録し、デフォルト値をセット
	for ( var i in DEFINITIONS.base.layers ) {
		$( document.createElement('option') )
											.val( i )
											.text( DEFINITIONS.base.layers[i].name )
											.appendTo( $('#panel select[name="base"]') );
	}//for
	$( '#panel select[name="base"]' ).val( initialParameters.base );
	$( '#panel select[name="base"]' ).data( 'value', initialParameters.base );
	//地質図不透明度
	$( '#panel input[name="opacity"]' ).val( initialParameters.opacity * 100 );
	$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(Math.round(initialParameters.opacity * 100)) );
	//断面図不透明度（断面図の指定がない場合は要素を隠す）
	$( '#panel input[name="section"]' ).val( initialParameters.section * 100 );
	$( '#panel input[name="section"]' ).siblings( 'span' ).text( String(Math.round(initialParameters.section * 100)) );
	if ( DEFINITIONS.sections === false ) {
		$( '#panel .sections' ).hide();
	}//if
	//合成モード
	$( '#panel select[name="mode"]' ).val( initialParameters.mode );
	//標高強調（z軸伸長）
	$( '#panel input[name="ex"]' ).val( initialParameters.ex );
	$( '#panel input[name="ex"]' ).siblings( 'span' ).text( String(Math.round(initialParameters.ex)) );
	//ワイヤーフレーム
	$( '#panel input[name="wire"]' ).prop( 'checked', initialParameters.wire );			
	//水平維持
	$( '#panel input[name="keephorizon"]' ).prop( 'checked', initialParameters.keephorizon );
	//自動回転（現状は起動時自動回転に非対応：スクリプトの調整が必要）
	$( '#panel input[name="autorotation"]' ).prop( 'checked', initialParameters.autorotation );
	//地質図オプション（オプションレイヤー）の取得と要素の登録（オプションレイヤーがなければ要素を隠す）
	if (
		DEFINITIONS.overlay.layers === false
	) {
		$( '#panel .layers' ).hide();
	} else {
		//要素を1つずつリストに登録する
		for ( var i in DEFINITIONS.overlay.layers ) {
			//当該要素が初期値に含まれているかどうかの真偽値を格納
			var checked = false;
			for ( var j=0,k=initialParameters.layer.length; j<k; j++ ) {
				if ( i===initialParameters.layer[j] ) {
					checked = true;
					break;
				}//if
			}//for
			//要素を追加し、調べた真偽値でチェックボックスのオンオフ設定
			$( document.createElement('li') )
				.append(
						$( document.createElement('input') )
							.attr({ 'type' : 'checkbox' })
							.val( i )
							.prop( 'checked', checked )
					)
				.append(
						$( document.createTextNode(' ' + DEFINITIONS.overlay.layers[i].name) )
					)
				.appendTo( $('#layers ul') );
		}//for
	}//if
	
	//==========================================================================================
	//凡例表示窓の変数へのセットとデフォルト非表示
	app.operation.subwindow = $( '#subWindow' ).hide();
	
	//==========================================================================================
	//three.jsの準備（無名関数内で処理し、必要に応じてアプリケーション変数に代入）
	(function( elementId_ ){
		//----------------------------------------------------------------------
		//three.js描画領域要素の指定
		var container = document.getElementById( elementId_ );
		
		//----------------------------------------------------------------------
		//シーンの準備
		var scene = new THREE.Scene();
		
		//----------------------------------------------------------------------
		//軸の追加
		if ( DEFINITIONS.three.axis ) {
			scene.add( new THREE.AxisHelper(DEFINITIONS.three.axis) );
		}//if
		
		//----------------------------------------------------------------------
		//カメラのセット（アスペクト比は描画先dom要素の幅と高さで指定）
		var camera = new THREE.PerspectiveCamera(
													DEFINITIONS.three.camera.fov,
													$( container ).width() / $( container ).height(),
													DEFINITIONS.three.camera.near,
													DEFINITIONS.three.camera.far
												);
		camera.position.set(
								initialParameters.camera.x,
								initialParameters.camera.y,
								initialParameters.camera.z
							);
		camera.up.set( initialParameters.up.x, initialParameters.up.y, initialParameters.up.z );
		
		//----------------------------------------------------------------------
		//コントロールの準備（コントロール先を限定するため第2引数で描画先dom要素を指定）
		var controls = new THREE.TrackballControls( camera, container );
		
		//視点の向きを決める
		controls.target.set( initialParameters.to.x, initialParameters.to.y, initialParameters.to.z );
		
		//----------------------------------------------------------------------
		//環境光の追加
		if ( DEFINITIONS.three.ambientLight.intensity ) {
			scene.add(
				new THREE.AmbientLight(
										DEFINITIONS.three.ambientLight.color,
										DEFINITIONS.three.ambientLight.intensity
									)
			);
		}//if
		
		//----------------------------------------------------------------------
		//平行光の追加（影の設定）
		if ( DEFINITIONS.three.directionalLight.intensity ) {
			var light = new THREE.DirectionalLight(
													DEFINITIONS.three.directionalLight.color,
													DEFINITIONS.three.directionalLight.intensity
												);
			light.position.set(
								DEFINITIONS.three.directionalLight.position.x,
								DEFINITIONS.three.directionalLight.position.y,
								DEFINITIONS.three.directionalLight.position.z
							).normalize();
			light.shadow.mapSize.width = 1024;
			light.shadow.mapSize.height = 1024;
			/*
			light.shadow.camera.near = 1;
			light.shadow.camera.far = 1000000;
			light.shadow.camera.fov = 5;
			*/
			light.castShadow = true;
			scene.add( light );
		}//if
		
		//----------------------------------------------------------------------
		//レンダラーのセット（レンダラーのサイズは描画先dom要素の幅と高さで指定）
		var renderer = new THREE.WebGLRenderer();
		renderer.setClearColor( DEFINITIONS.three.renderer.clearColor );
		renderer.setSize( $(container).width(), $(container).height() );
		//影有効化の設定
		renderer.shadowMap.enabled = true;
		
		//----------------------------------------------------------------------
		//描画対象の登録
		container.appendChild( renderer.domElement );
		
		//----------------------------------------------------------------------
		//描画関数の準備と実行
		var render = function () {
			requestAnimationFrame( render );
			renderer.render( scene, camera );
			controls.update();
			
			//clock稼働中は地形を回転させる
			if ( app.operation.rotation.clock.running ) {
				//初期方位角はオフセット値加味して指定（オフセット値はスイッチ操作時に決める）
				var theta = app.operation.rotation.clock.getElapsedTime() / 8 + app.operation.rotation.offset;
				//回転半径の計算
				var radius = Math.sqrt( Math.pow(camera.position.x, 2) + Math.pow(camera.position.y, 2) );
				
				//視点位置xyを計算
				camera.position.x = radius * Math.sin( theta );
				camera.position.y = radius * Math.cos( theta );
				
				//視点は常に中心を向く
				camera.lookAt( new THREE.Vector3(0, 0, 0) );
			}//if
			
			//水平維持の場合は常に鉛直上向きになるよう強制
			if ( $('#panel input[name="keephorizon"]').prop('checked') ) {
				camera.up.set( 0, 0, 1 );
			}//if
		};//function
		render();
		
		//----------------------------------------------------------------------
		//再描画関数（描画領域変更時に実行）
		var redraw = function () {
			renderer.setSize( $(container).width(), $(container).height() );
			camera.aspect = $( container ).width() / $( container ).height();
			camera.updateProjectionMatrix();
		};//function
		//イベントの登録
		$( window ).on( 'orientationchange resize', function(){
			redraw();
		});//on
		
		//----------------------------------------------------------------------
		//グローバル変数への割当
		app.three.container = container;
		app.three.scene = scene;
		app.three.camera = camera;
		app.three.controls = controls;
	})( DEFINITIONS.three.elementId );
	
	//==========================================================================================
	//promise配列の準備とデータ取得promiseの登録
	var promises = [];
	//標高：引数を渡してプロミスを配列に登録（常にwmts）
	promises.push(
					project.getImage.wmts( app.mapOptions.dem )
				);
	//背景地図：引数を用意してプロミスを配列に登録（常にwmts）
	var _options = $.extend( true, {}, DEFINITIONS.base.layers[$('#panel select[name="base"]').val()] );
	$.extend( true, _options, app.mapOptions.base );
	promises.push(
					project.getImage.wmts( _options )
				);
	//オーバーレイ：引数を渡してプロミスを配列に登録
	promises.push(
					project.getImage[ DEFINITIONS.overlay.type ]( DEFINITIONS.overlay.options, app.mapOptions.base )
				);
	
	//==========================================================================================
	//promise処理
	Smap.promise.finishing( promises )
		.then(
			function ( data_ ) {
				//canvas配列を受け取る（0：標高、1：背景地図、2：オーバーレイ）
				//取得したデータをグローバル変数に格納（背景地図は種類別で保持）
				app.mapData.canvases.dem											= data_[0].canvas;
				app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ]	= data_[1].canvas;
				app.mapData.canvases.overlay										= data_[2].canvas;
				app.mapOptions.offset												= data_[2].offset;
				
				//オプションレイヤーの有無で分岐処理
				if ( !initialParameters.layer.length ) {
					//オプションレイヤーの指定がない場合
					//即座に成功するpromiseを返す
					return Smap.promise.resolve( true );
				} else {
					//オプションレイヤーの指定がある場合
					
					//オプションレイヤーのpromise配列を生成する
					var promises = [];
					//配列にpromiseを登録する
					for ( var i=0,j=initialParameters.layer.length; i<j; i++ ) {
						//オプションレイヤーのキーを渡すため無名関数で処理する
						(function( layer_ ){
							//引数を用意する
							var options = $.extend( true, {}, DEFINITIONS.overlay.options );
							$.extend( true, options.parameters, DEFINITIONS.overlay.layers[layer_].parameters );
							//promiseを生成して配列に格納する
							promises.push(
								project.getImage[ DEFINITIONS.overlay.type ]( options, app.mapOptions.base ).then(
									function ( data__ ) {
										//成功時は取得したcanvasデータをグローバル変数に格納し、trueを返す
										app.mapData.canvases.layers[ layer_ ] = data__.canvas;
										return true;
									},//function
									function ( error__ ) {
										//失敗時はfalseを返す
										console.log( 'ERROR: failed to create canvas of optional layer "' + layer_ + '".' );
										return false;
									}//function
								)
							);
						})( initialParameters.layer[i] );
					}//for
				
					//オプションレイヤー全てのpromiseを実行するpromiseを返す
					return Smap.promise.finishing( promises );
				}//if
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: failed to create canvas of elevation or background-map or overlay.' );
				return false;
			}//function
		).then(
			function ( data_ ) {
				//オーバーレイ、オプションレイヤーを重ねる
				var canvas = app.mapData.canvases.overlay;
				for ( var i in app.mapData.canvases.layers ) {
					canvas = project.pileUpCanvases(
													canvas,
													app.mapData.canvases.layers[i],
													1,
													project.mode[ 'multi' ]
												);
				}//for
				
				//さらに地図と重ねて結果を返す
				return project.pileUpCanvases(
												app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ],
												canvas,
												parseFloat( $('#panel input[name="opacity"]').val() / 100 ),
												project.mode[ $('#panel select[name="mode"]').val() ]
											);
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: failed to create canvas of optional layer.' );
				return false;
			}//function
		).then(
			function ( data_ ) {
				if ( data_ === false ) {
					return false;
				} else {
					//ここでthree.jsの記述を始めるとieでエラーになる（原因不明）
					//mesh以外の準備はすべて事前に済ませてく
					
					//************************************************************
					//meshの作成ここから
					//************************************************************
					
					//------------------------------------------------------------
					//変数にcanvasを格納しておく（可読性向上の為）
					var demCanvas	= app.mapData.canvases.dem;
					var imgCanvas	= data_;
					
					//------------------------------------------------------------
					//geometryの準備
					var geometry = new THREE.PlaneBufferGeometry(
																	app.mapOptions.dimension.width,
																	app.mapOptions.dimension.height,
																	demCanvas.width - 1,
																	demCanvas.height - 1
																);
					geometry.computeFaceNormals();
					geometry.computeVertexNormals();
					
					//------------------------------------------------------------
					//標高を計算してgeometryを作る
					//格納先変数の取得
					var data = geometry.attributes.position.array;
					//標高canvasからimageDataを取り出す
					var ctx = demCanvas.getContext( '2d' );
					var imageData = ctx.getImageData( 0, 0, demCanvas.width, demCanvas.height );
					//標高canvasのピクセルを走査して、各ピクセルにおける標高を計算し、geometryのグリッド交点の値を決める
					for ( var i=0,j=demCanvas.width * demCanvas.height; i<j; i++ ) {
						//xyzのうちzのみ操作する
						//標高値はimageDataのrgbaから計算する
						data[ i*3 + 2 ] = project.color2elevation(
														imageData.data[ i*4 + 0 ],
														imageData.data[ i*4 + 1 ],
														imageData.data[ i*4 + 2 ],
														imageData.data[ i*4 + 3 ]
													);
					}//for
					
					//------------------------------------------------------------
					//materialを作成する
					var texture = new THREE.Texture( imgCanvas );
					texture.needsUpdate = true;
					texture.minFilter = THREE.LinearFilter;
					var material = new THREE.MeshPhongMaterial({
															"map"			: texture,
															"side"			: THREE.DoubleSide,
															"wireframe"		: $( '#panel input[name="wire"]' ).prop( 'checked' ),
															//"color"			: 0xff8800,
															"transparent"	: true,
															//"opacity"		: 0.5,
															//"blending"		: THREE.NormalBlending,
															"depthWrite"	: true,
															"depthTest"		: true,
															"overdraw"		: true
														});
					
					//------------------------------------------------------------
					//meshを作ってsceneに登録する
					app.three.meshes.base = new THREE.Mesh( geometry, material );
					//mesh.castShadow = true;
					app.three.meshes.base.receiveShadow = true;
					app.three.scene.add( app.three.meshes.base );
					
					//------------------------------------------------------------
					//z軸方向伸長を初期値で設定
					app.three.meshes.base.scale.z = initialParameters.ex;
					
					//************************************************************
					//3D地質図のmesh描画完了。ここから断面図描画
					//************************************************************
					//断面の有無で分岐処理
					if (
						typeof DEFINITIONS.sections === 'undefined'	//未定義
						|| DEFINITIONS.sections === false			//falseで定義
						|| DEFINITIONS.sections.length === 0		//要素なし配列（文字列は考慮せず）
					) {
						//断面がない場合
						//即座に成功するpromiseを返す
						return Smap.promise.resolve( true );
					} else {
						//断面がある場合は各断面を描画するpromiseを配列に格納する
						var promises = [];
						for ( var i=0,j=DEFINITIONS.sections.length; i<j; i++ ) {
							//定義された配列の要素をひとつずつ無名関数で処理する
							(function ( section_ ) {
								promises.push(
										//断面画像ロードのpromise
										Smap.loadImage( section_.image ).then(
											function ( data_ ) {
												//ロード成功時に座標を計算する
												var coordinates = {
																	'lt' : project.latLngAltToCoord3d(
																										project.strToCoord( section_.coordinates.lt ),
																										app.mapOptions.dem.area.nw,
																										app.mapOptions.dem.area.se,
																										app.mapOptions.dem.zoom
																									),
																	'rt' : project.latLngAltToCoord3d(
																										project.strToCoord( section_.coordinates.rt ),
																										app.mapOptions.dem.area.nw,
																										app.mapOptions.dem.area.se,
																										app.mapOptions.dem.zoom
																									),
																	'lb' : project.latLngAltToCoord3d(
																										project.strToCoord( section_.coordinates.lb ),
																										app.mapOptions.dem.area.nw,
																										app.mapOptions.dem.area.se,
																										app.mapOptions.dem.zoom
																									),
																	'rb' : project.latLngAltToCoord3d(
																										project.strToCoord( section_.coordinates.rb ),
																										app.mapOptions.dem.area.nw,
																										app.mapOptions.dem.area.se,
																										app.mapOptions.dem.zoom
																									)
																};
												//画像と座標のオブジェクトを返す
												return {
															'canvas'		: data_,
															'coordinates'	: coordinates
														};
											},//function
											function ( error_ ) {
												//
												console.log( 'ERROR: failed to load section image "' + section_.image + '".' );
												return false;
											}//function
										)
									);
							})( DEFINITIONS.sections[i] );
						}//for
						
						//promise配列処理を返す
						return Smap.promise.finishing( promises ).then(
									function ( data__ ) {
										//処理成功時は断面を描画する
										for ( var i=0,j=data__.length; i<j; i++ ) {
											var geometry = new THREE.PlaneBufferGeometry( 1, 1, 1, 1 );
											geometry.computeFaceNormals();
											geometry.computeVertexNormals();
											//4隅の座標（xyz）を直接指定する
											var data = geometry.attributes.position.array;
											data[0]		= data__[i].coordinates.lt.x;
											data[1]		= data__[i].coordinates.lt.y;
											data[2]		= data__[i].coordinates.lt.z;
											data[3]		= data__[i].coordinates.rt.x;
											data[4]		= data__[i].coordinates.rt.y;
											data[5]		= data__[i].coordinates.rt.z;
											data[6]		= data__[i].coordinates.lb.x;
											data[7]		= data__[i].coordinates.lb.y;
											data[8]		= data__[i].coordinates.lb.z;
											data[9]		= data__[i].coordinates.rb.x;
											data[10]	= data__[i].coordinates.rb.y;
											data[11]	= data__[i].coordinates.rb.z;
											
											//断面画像の用意
											var texture = new THREE.Texture( data__[i].canvas );
											texture.needsUpdate = true;
											texture.minFilter = THREE.LinearFilter;
											var material = new THREE.MeshPhongMaterial({
																					"map"			: texture,
																					"side"			: THREE.DoubleSide,
																					"wireframe"		: false,
																					"transparent"	: true,
																					"opacity"		: initialParameters.section,
																					"blending"		: THREE.NormalBlending,
																					"depthWrite"	: true,
																					"depthTest"		: true,
																					"overdraw"		: true
																				});
											
											//meshの作成、登録
											var mesh = new THREE.Mesh( geometry, material );
											mesh.scale.z = initialParameters.ex;
											app.three.scene.add( mesh );
											
											//作成したmeshはグローバル変数に登録しておき、イベント処理で再利用
											app.three.meshes.sections.push( mesh );
										}//for
										return true;
									},//function
									function ( error_ ) {
										//
										return false;
									}//function
								);
					}//if
				}//if
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: failed to create geographical 3d model.' );
				return false;
			}//function
		).then(
			function ( data_ ) {
				if ( data_ === false ) {
					return false;
				} else {
					
					//描画完了後にローディング画面（デフォルト表示）を隠す
					$( '#modal' ).hide();
					
					//************************************************************
					//各種イベントの登録
					//************************************************************
					
					//------------------------------------------------------------
					//イベント処理：背景地図変更
					$( '#panel select[name="base"]' ).change(function(){
						var that = this;
						
						//値を取得
						var base = $( this ).val();
						//元の値を取得
						var value = $( this ).data( 'value' );
						
						//背景地図が読み込まれていない可能性があるためプロミス処理する
						var promise;
						//背景地図が読み込まれているかどうかの分岐処理
						if ( typeof app.mapData.canvases.bases[ base ] !== 'undefined' ) {
							//読み込み済みの場合
							//即座に成功するpromiseを生成
							promise = Smap.promise.resolve( true );
						} else {
							//読み込まれていない背景地図が指定された場合はその背景地図を作成するプロミスを生成
							var _options = $.extend( true, {}, DEFINITIONS.base.layers[$('#panel select[name="base"]').val()] );
							$.extend( true, _options, app.mapOptions.base );
							
							promise = project.getImage.wmts( _options ).then(
												function ( data_ ) {
													app.mapData.canvases.bases[ base ] = data_.canvas;
													return true;												
												},//function
												function ( error_ ) {
													//
													console.log( 'ERROR: failed to create basemap image for switching basemap.' );
													return false;
												}//function
											);
						}//if
						
						//ローディング画面を表示
						$( '#modal' ).show();
						
						//プロミス実行
						promise.then(
							function ( data_ ) {
								if ( !data_ ) {
									return false;
								} else {
									//実行に成功した場合
									
									
									//変更前が背景地図なしの場合は変更後は必ず背景地図あり
									//地質図不透明度、合成モードを初期値にする
									if (
										typeof DEFINITIONS.base.layers[value].url === 'undefined'	//未定義
										|| DEFINITIONS.base.layers[value].url === false				//falseで定義
										|| DEFINITIONS.base.layers[value].url.length === 0			//空文字列
									) {
										$( '#panel input[name="opacity"]' ).val( DEFINITIONS.initial.opacity * 100 );
										$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(Math.round(DEFINITIONS.initial.opacity * 100)) );
										$( '#panel select[name="mode"]' ).val( DEFINITIONS.initial.mode );
									}//if
									
									//変更後の背景地図の状態で分岐処理
									if (
										typeof DEFINITIONS.base.layers[base].url === 'undefined'	//未定義
										|| DEFINITIONS.base.layers[base].url === false				//falseで定義
										|| DEFINITIONS.base.layers[base].url.length === 0			//文字数が0（配列は考慮せず）
									) {
										//背景地図なしの場合は地質図不透明度を1、合成モードをnormにして両者の値変更を不可とする
										var opacity = 1 * 100;
										$( '#panel input[name="opacity"]' )
																	.val( opacity )
																	.prop( 'disabled', true );
										$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(Math.round(opacity)) );
										$( '#panel select[name="mode"]' )
																	.val( 'norm' )
																	.prop( 'disabled', true );
									} else {
										//背景地図ありの場合は地質図不透明度と合成モードを値変更を可にする
										$( '#panel input[name="opacity"]' ).prop( 'disabled', false );
										$( '#panel select[name="mode"]' ).prop( 'disabled', false );
									}//if
									
									//オーバーレイにオプションレイヤーを重ねた画像を生成
									var canvas = app.mapData.canvases.overlay;
									$( '#layers input[type="checkbox"]:checked' ).each( function(index_, element_) {
										var that = this;
										canvas = project.pileUpCanvases(
																			canvas,
																			app.mapData.canvases.layers[$(that).val()],
																			1,
																			project.mode[ 'multi' ]
																		);
									});//each
									
									//生成した画像と背景地図を合成
									canvas = project.pileUpCanvases(
																		app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ],
																		canvas,
																		parseFloat( $('#panel input[name="opacity"]').val() / 100 ),
																		project.mode[ $('#panel select[name="mode"]').val() ]
																	);
																					
									//合成した画像をtextureとしてmaterialに登録
									var texture = new THREE.Texture( canvas );
									texture.needsUpdate = true;
									texture.minFilter = THREE.LinearFilter;
									app.three.meshes.base.material.map = texture;
									
									//ローディング画面を隠す
									$( '#modal' ).hide();
									
									//変更後の値を現在の値として登録しておく
									$( that ).data( 'value', base );
									
									return true;
								}
							},
							function ( error_ ) {
								//
								return false;
							}
						);
					});
					
					//------------------------------------------------------------
					//イベント処理：オーバーレイ不透明度の変更
					$( '#panel input[name="opacity"]' ).change(function(){
						//使用する画像の変更がないのでpromise不要、ローディング表示も不要
						
						//オーバーレイにオプションレイヤーを重ねた画像を生成
						var canvas = app.mapData.canvases.overlay;
						$( '#layers input[type="checkbox"]:checked' ).each( function(index_, element_) {
							var that = this;
							canvas = project.pileUpCanvases(
																canvas,
																app.mapData.canvases.layers[$(that).val()],
																1,
																project.mode[ 'multi' ]
															);
						});
						
						//生成した画像と背景地図を合成（オーバーレイ不透明度を取得した値にする）
						canvas = project.pileUpCanvases(
															app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ],
															canvas,
															parseFloat( $(this).val() ) / 100,
															project.mode[ $('#panel select[name="mode"]').val() ]
														);
						
						//合成した画像をtextureとしてmaterialに登録
						var texture = new THREE.Texture( canvas );
						texture.needsUpdate = true;
						texture.minFilter = THREE.LinearFilter;
						app.three.meshes.base.material.map = texture;
					});//click
					//スライドバー横の表示変更はリアルタイムで
					$( '#panel input[name="opacity"]' ).on( 'input change', function(){
						$( this ).siblings( 'span' ).text( String(Math.round($(this).val())) );
					});//on
					
					//------------------------------------------------------------
					//イベント処理：オプションレイヤーの選択変更
					$( '#panel input[name="layers"]' ).click(function(){
						//パネルのボタンクリック時のダイアログの設定
						//チェック状態の変更を調べるための変数を用意
						var checked = '';
						//ダイアログを開く
						$( '#layers' ).dialog({
							'width' 		: '350px',
							'modal' 		: true,
							'closeOnEscape'	: false,
							'open'			: function ( event_, ui_ ) {
													//閉じるボタン（右上）は隠す
													$( '.ui-dialog-titlebar-close', $(this).prev() ).hide();
													//チェックの状態を取得して保存
													var checkedArray = [];
													$( 'form input[type="checkbox"]:checked', this ).each(function( index_, element_ ){
														checkedArray.push( $(element_).val() );
													});
													checked = checkedArray.toString();
												},
							//OKボタンクリック時のみ処理
							'buttons'		: [
													{
														'text'	: 'OK',
														'click'	: function () {
																		//チェックの状態を取得し、ダイアログを開いた時と変化がないか調べる
																		var checkedArray = [];
																		$( 'form input[type="checkbox"]:checked', this ).each(function( index_, element_ ){
																			checkedArray.push( $(element_).val() );
																		});
																		
																		if ( checked !== checkedArray.toString() ) {
																			//チェックの状態に変化があった場合のみ処理
																			
																			//レイヤー共通で使用するパラメータを生成しておく
																			var options = $.extend( true, {}, DEFINITIONS.overlay.options );
																			
																			//レイヤー読み取りpromiseを格納する配列変数を用意
																			var promises = [];
																			for ( var i=0,j=checkedArray.length; i<j; i++ ) {
																				//無名関数で配列をひとつずつ処理
																				(function( layer_ ){
																					//レイヤーが読み込み済みかどうかチェック
																					if ( typeof app.mapData.canvases.layers[layer_] !== 'undefined' ) {
																						//読み込み済みの場合
																						//即座に成功するpromiseを生成
																						promises.push(
																								Smap.promise.resolve( app.mapData.canvases.layers[layer_] )
																							);
																					} else {
																						//読み込み済みでない場合は当該レイヤーを取得して返すpromiseを生成
																						var eachOptions = $.extend( true, {}, options );
																						$.extend( true, eachOptions.parameters, DEFINITIONS.overlay.layers[layer_].parameters );
																						promises.push(
																								project.getImage[DEFINITIONS.overlay.type]( eachOptions, app.mapOptions.base ).then(
																									function ( data_ ) {
																										//レイヤーを取得したらグローバル変数に格納して返す
																										app.mapData.canvases.layers[ layer_ ] = data_.canvas;
																										return data_.canvas;
																									},//function
																									function ( error_ ) {
																										//
																										console.log( 'ERROR: failed to load optional layer "' + layer_ + '".' );
																										return false;
																									}//function
																								)//then
																							);//promise
																					}//if
																				})( checkedArray[i] );
																			}//for
																			
																			//ローディング画面を表示
																			$( '#modal' ).show();
																			
																			//promiseを実行
																			Smap.promise.finishing( promises ).then(
																				function ( data_ ) {
																					//オーバーレイにオプションレイヤーを重ねた画像を生成
																					var canvas = app.mapData.canvases.overlay;
																					for ( var i=0,j=data_.length; i<j; i++ ) {
																						canvas = project.pileUpCanvases(
																															canvas,
																															data_[i],
																															1,
																															project.mode[ 'multi' ]
																														);
																					}//for
																					
																					//生成した画像と背景地図を合成
																					canvas = project.pileUpCanvases(
																														app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ],
																														canvas,
																														parseFloat( $('#panel input[name="opacity"]').val() / 100 ),
																														project.mode[ $('#panel select[name="mode"]').val() ]
																													);
																					
																					//合成した画像をtextureとしてmaterialに登録
																					var texture = new THREE.Texture( canvas );
																					texture.needsUpdate = true;
																					texture.minFilter = THREE.LinearFilter;
																					app.three.meshes.base.material.map = texture;
																					
																					//ローディング画面を隠す
																					$( '#modal' ).hide();
																					
																					return truel
																				},//function
																				function ( error_ ) {
																					//
																					return false;
																				}//function
																			);//then
																		}//if
																		
																		//ダイアログを閉じる
																		$( this ).dialog( 'close' );
																	}//function
													}
												]
						});//dialog
					});//click
					
					//------------------------------------------------------------
					//イベント処理：合成モードの変更
					$( '#panel select[name="mode"]' ).change(function(){
						//使用する画像の変更がないのでpromise不要、ローディング表示も不要
						
						//オーバーレイにオプションレイヤーを重ねた画像を生成
						var canvas = app.mapData.canvases.overlay;
						$( '#layers input[type="checkbox"]:checked' ).each( function(index_, element_) {
							var that = this;
							canvas = project.pileUpCanvases(
																canvas,
																app.mapData.canvases.layers[ $(that).val() ],
																1,
																project.mode[ 'multi' ]
															);
						});
						
						//生成した画像と背景地図を合成（オーバーレイ不透明度を取得した値にする）
						canvas = project.pileUpCanvases(
															app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ],
															canvas,
															parseFloat( $('#panel input[name="opacity"]').val() ) / 100,
															project.mode[ $(this).val() ]
														);
						
						//合成した画像をtextureとしてmaterialに登録
						var texture = new THREE.Texture( canvas );
						texture.needsUpdate = true;
						texture.minFilter = THREE.LinearFilter;
						app.three.meshes.base.material.map = texture;
					});//click
					
					//------------------------------------------------------------
					//イベント処理：断面図不透明度の変更
					$( '#panel input[name="section"]' ).change(function(){
						for ( var i=0,j=app.three.meshes.sections.length; i<j; i++ ) {
							app.three.meshes.sections[i].material.opacity = parseFloat( $(this).val() ) / 100;
						}//for
					});//click
					//スライドバー横の表示変更はリアルタイムで
					$( '#panel input[name="section"]' ).on( 'input change', function(){
						$( this ).siblings( 'span' ).text( String(Math.round($(this).val())) );
					});//on
					
					//------------------------------------------------------------
					//イベント処理：標高強調（z軸伸長）の変更
					$( '#panel input[name="ex"]' ).change(function(){
						//値を取得して、meshのz伸長を変更
						var zScale =  parseInt( $(this).val(), 10 );
						app.three.meshes.base.scale.z = zScale;
						for ( var i=0,j=app.three.meshes.sections.length; i<j; i++ ) {
							app.three.meshes.sections[i].scale.z = zScale;
						}//for
					});//change
					//スライドバー横の表示変更はリアルタイムで
					$( '#panel input[name="ex"]' ).on( 'input change', function(){
						$( this ).siblings( 'span' ).text( String(Math.round($(this).val())) );
					});//on		
					
					//------------------------------------------------------------
					//イベント処理：ワイヤーフレーム表示チェックボックスのクリック
					$( '#panel input[name="wire"]' ).click(function(){
						//materialのwireframeを変更
						app.three.meshes.base.material.wireframe = $( this ).prop( 'checked' );
					});//click
					
					//------------------------------------------------------------
					//イベント処理：自動回転
					$( '#panel input[name="autorotation"]' ).click(function(){
						//動作を決める（回転か停止か）
						var rotation = $( this ).prop( 'checked' );
						if ( rotation ) {
							//回転させる場合
							
							//視点の向きをリセットする
							app.three.controls.target.set( 0, 0, 0 );
							
							//初期オフセット角を決める
							//除算で分母が0になるのを防ぐため、0の場合に極小値を指定する
							if ( app.three.camera.position.y === 0 ) {
								app.three.camera.position.y = 0.001;
							}//if
							//オフセット角の計算
							var angle = app.three.camera.position.x / app.three.camera.position.y;
							app.operation.rotation.offset = Math.atan( angle );
							//視点位置のy座標が0未満の場合は半回転加える
							if ( app.three.camera.position.y < 0 ) {
								app.operation.rotation.offset += Math.PI;
							}//if
							
							//回転クロックをスタートする
							app.operation.rotation.clock.start();
						} else {
							//停止する場合
							//回転クロックを停止する
							app.operation.rotation.clock.stop();
						}//if
					});//click
					
					//------------------------------------------------------------
					//イベント処理：鉛直（水平）リセット
					$( '#panel input[name="resethorizon"]' ).click(function(){
						//カメラの鉛直リセット
						app.three.camera.up.set( 0, 0, 1 );
					});//click
					
					//------------------------------------------------------------
					//イベント処理：リセット
					$( '#panel input[name="reset"]' ).click(function(){
						//自動回転を停止する
						app.operation.rotation.clock.stop();
						
						//フォームの値を初期値に戻す
						var opacity = DEFINITIONS.initial.opacity * 100;
						var section = DEFINITIONS.initial.section * 100;
						$( '#panel select[name="base"]' ).val( DEFINITIONS.initial.base );
						$( '#panel input[name="opacity"]' ).val( opacity );
						$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(Math.round(opacity)) );
						$( '#panel select[name="mode"]' ).val( DEFINITIONS.initial.mode );
						$( '#panel input[name="section"]' ).val( section );
						$( '#panel input[name="section"]' ).siblings( 'span' ).text( String(Math.round(section)) );
						$( '#panel input[name="ex"]' ).val( DEFINITIONS.initial.ex );
						$( '#panel input[name="ex"]' ).siblings( 'span' ).text( String(Math.round(DEFINITIONS.initial.ex)) );
						$( '#panel input[name="wire"]' ).prop( 'checked', DEFINITIONS.initial.wire );
						$( '#panel input[name="autorotation"]' ).prop( 'checked', DEFINITIONS.initial.autorotation );
						$( '#panel input[name="keephorizon"]' ).prop( 'checked', DEFINITIONS.initial.keephorizon );
						
						//オプションレイヤー選択のチェックボックスを戻す
						var layers = ( DEFINITIONS.initial.layer ).split( ',' );
						$( '#layers input[type="checkbox"]' ).each(function( index_, element_ ) {
							var flag = false;
							for ( var i=0,j=layers.length; i<j; i++ ) {
								if ( $(this).val() === layers[i] ) {
									flag = true;
									break;
								}
							}
							$( this ).prop( 'checked', flag );
						});
						
						//背景地図の有無で分岐処理
						if (
							typeof DEFINITIONS.base.layers[DEFINITIONS.initial.base].url === 'undefined'	//未定義
							|| DEFINITIONS.base.layers[DEFINITIONS.initial.base].url === false				//falseで定義
							|| DEFINITIONS.base.layers[DEFINITIONS.initial.base].url.length === 0			//空文字列
						) {
							//背景地図なしの場合は地質図不透明度を1、合成モードをnormにし、両者を変更不可にする
							var opacity = 1 * 100;
							$( '#panel input[name="opacity"]' )
														.val( opacity )
														.prop( 'disabled', true );
							$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(Math.round(opacity)) );
							$( '#panel select[name="mode"]' )
														.val( 'norm' )
														.prop( 'disabled', true );
						} else {
							//背景地図ありの場合は両者を変更可にする
							$( '#panel input[name="opacity"]' ).prop( 'disabled', false );
							$( '#panel select[name="mode"]' ).prop( 'disabled', false );
						}
						
						//現在の地図を登録
						$( '#panel select[name="base"]' ).data( 'value', DEFINITIONS.initial.base );
						
						//断面図不透明度をリセット
						for ( var i=0,j=app.three.meshes.sections.length; i<j; i++ ) {
							app.three.meshes.sections[i].material.opacity = DEFINITIONS.initial.section;
						}//for
						
						//z伸長をリセット
						app.three.meshes.base.scale.z = DEFINITIONS.initial.ex;
						
						//視点のリセット（視点の向きがリセットされる）
						app.three.controls.reset();
						
						//視点位置リセット（パラメータ指定があるとコントロールのリセットでは効かない）
						var camera;
						if (
							typeof DEFINITIONS.initial.camera === 'string'
							&& DEFINITIONS.initial.camera.length
						) {
							camera = project.latLngAltToCoord3d(
																		project.strToCoord( DEFINITIONS.initial.camera ),
																		app.mapOptions.dem.area.nw,
																		app.mapOptions.dem.area.se,
																		app.mapOptions.dem.zoom
																	);
						} else {
							camera = {
										'x' : 0,
										'y' : app.mapOptions.base.dimension.height * 3 / 4,
										'z' : 5000
									};
						}//if
						app.three.camera.position.set( camera.x, camera.y, camera.z );
						
						//鉛直リセット
						app.three.camera.up.set( 0, 0, 1 );
						
						//pingの除去
						if ( app.three.ping ) {
							app.three.scene.remove( app.three.ping );
							app.three.ping = false;
						}//if
						
						//凡例表示窓を隠す
						app.operation.subwindow.hide();
						
						//オーバーレイ不透明度、ワイヤーフレームを初期化してmaterialを再構成
						//背景地図の値を取得
						var base = $( '#panel select[name="base"]' ).val();
						//背景地図が読み込まれていない可能性がある（パラメータで背景地図指定の場合）ためプロミス処理する
						var promise;
						//背景地図が読み込まれているかどうかの分岐処理
						if ( app.mapData.canvases.bases[base] ) {
							//読み込み済みの場合
							//即座に成功するpromiseを生成
							promise = Smap.promise.resolve( true );
						} else {
							//読み込まれていない場合は背景地図を生成するプロミスを生成
							var _options = $.extend( true, {}, DEFINITIONS.base.layers[base] );
							$.extend( true, _options, app.mapOptions.base );
							promise = project.getImage.wmts( _options ).then(
												function ( data_ ) {
													app.mapData.canvases.bases[ base ] = data_.canvas;
													return true;												
												},//function
												function ( error_ ) {
													return false;
												}//function
											);
						}//if
						
						//ローディング画面を表示
						$( '#modal' ).show();
						
						promise.then(
							function ( data_ ) {
								if ( !data_ ) {
									//実行に失敗した場合
									return Smap.promise.resolve( false );
								} else {
									//実行に成功した場合
									//オプションレイヤーの有無で分岐
									if (
										typeof DEFINITIONS.initial.layer === 'undefined'	//未定義
										|| DEFINITIONS.initial.layer === false				//falseで定義
										|| DEFINITIONS.initial.layer.length === 0			//空文字列
									) {
										//オプションレイヤーがない場合
										////即座に成功するpromiseを返す
										return Smap.promise.resolve( true );
									} else {
										//オプションレイヤーがある場合
										//オーバーレイは常に1つを最初に取得しているので再取得不要
										var layers = ( DEFINITIONS.initial.layer ).split( ',' );
										//オプションレイヤーのpromise配列を生成する
										var promises = [];
										if ( !app.mapData.canvases.layers[ layers[i] ] ) {
											//オプションレイヤーのキーを渡すため無名関数で処理する
											//配列にpromiseを登録する
											for ( var i=0,j=layers.length; i<j; i++ ) {
												(function( layer_ ){
													//引数を用意する
													var options = $.extend( true, {}, DEFINITIONS.overlay.options );
													$.extend( true, options.parameters, DEFINITIONS.overlay.layers[layer_].parameters );
													//promiseを生成して配列に格納する
													promises.push(
														project.getImage[ DEFINITIONS.overlay.type ]( options, app.mapOptions.base ).then(
															function ( data__ ) {
																//成功時は取得したcanvasデータをグローバル変数に格納し、trueを返す
																app.mapData.canvases.layers[ layer_ ] = data__.canvas;
																return true;
															},//function
															function ( error__ ) {
																//失敗時はfalseを返す
																console.log( 'ERROR: failed to create canvas of optional layer "' + layer_ + '".' );
																return false;
															}//function
														)
													);
												})( layers[i] );
											}//for
										}//if
										
										//配列に登録されたpromiseの有無で分岐処理
										if ( !promises.length ) {
											//promise配列が空の場合
											//即座に成功するpromiseを返す
											return Smap.promise.resolve( true );
										} else {
											//promise配列にpromiseが格納されている場合
											//配列に格納されたpromiseを一括実行する
											return Smap.promise.finishing( promises );
										}//if
									}//if
								}//if
							},//function
							function ( error_ ) {
								//
							}//function
						).then(
							function ( data_ ) {
								//オーバーレイにオプションレイヤーを重ねた画像を生成
								var canvas = app.mapData.canvases.overlay;
								//オプションレイヤーの有無で分岐
								if (
									typeof DEFINITIONS.initial.layer === 'undefined'	//未定義
									|| DEFINITIONS.initial.layer === false				//falseで定義
									|| DEFINITIONS.initial.layer.length === 0			//空文字列
								) {
									//オプションレイヤーがなければ何もしない
								} else {
									//オプションレイヤーがあれば合成する
									var layers = ( DEFINITIONS.initial.layer ).split( ',' ); 
									for ( var i=0,j=layers.length; i<j; i++ ) {
										canvas = project.pileUpCanvases(
																			canvas,
																			app.mapData.canvases.layers[ layers[i] ],
																			1,
																			project.mode[ 'multi' ]
																		);
									}//for
								}//if
								
								//生成した画像と背景地図を合成
								canvas = project.pileUpCanvases(
																	app.mapData.canvases.bases[ $('#panel select[name="base"]').val() ],
																	canvas,
																	parseFloat( $('#panel input[name="opacity"]').val() / 100 ),
																	project.mode[ $('#panel select[name="mode"]').val() ]
																);
								
								//合成した画像をtextureとしてmaterialに登録
								var texture = new THREE.Texture( canvas );
								texture.needsUpdate = true;
								texture.minFilter = THREE.LinearFilter;
								app.three.meshes.base.material.map = texture;
								
								//ワイヤーフレーム表示真偽もデフォルト値に変更
								app.three.meshes.base.material.wireframe = DEFINITIONS.initial.wire;
								
								//ローディング画面を隠す
								$( '#modal' ).hide();
							},//function
							function ( error_ ) {
								//
							}//function
						);//promise
					});//click
					
					//------------------------------------------------------------
					//イベント処理：再現用URL取得
					$( '#panel input[name="geturl"]' ).click(function(){
						//小数点を丸めるための関数（toFixedでもOKか）
						var roundFloat = function ( value_, number_ ) {
							var sign = '';
							if ( value_ < 0 ) {
								sign = '-';
								value_ = value_ * -1;
							}//if
							var str = String( Math.round(value_ * Math.pow(10, number_)) );
							while ( str.length <= number_ ) {
								str = '0' + str;
							}//while
							var value = sign + str.substr( 0, str.length - number_ );
							if ( number_ !== 0 ) {
								value = value + '.' + str.substr( str.length - number_, number_ );
							}//if
							return String( value );
						};//function
						
						//自動回転を停止する
						$( '#panel input[name="autorotation"]' ).prop( 'checked', false );
						app.operation.rotation.clock.stop();
						
						//クエリパラメータを作る（デフォルト値と比較して値が異なる場合のみパラメータに追加する）
						var parameters = {};
						
						//標高強調
						var ex = parseInt( $('#panel input[name="ex"]').val(), 10 );
						if ( ex !== DEFINITIONS.initial.ex ) {
							parameters.ex = ex;
						}//if
						
						//視点位置
						var camera;
						if (
							typeof DEFINITIONS.initial.camera === 'string'
							&& DEFINITIONS.initial.camera.length
						) {
							camera = project.latLngAltToCoord3d(
																	project.strToCoord( DEFINITIONS.initial.camera ),
																	app.mapOptions.dem.area.nw,
																	app.mapOptions.dem.area.se,
																	app.mapOptions.dem.zoom
																);
						} else {
							camera = {
										'x' : 0,
										'y' : app.mapOptions.base.dimension.height * 3 / 4,
										'z' : 5000
									};
						}//if
						
						if (
							Math.round( app.three.camera.position.x ) !== Math.round( camera.x )
							|| Math.round( app.three.camera.position.y ) !== Math.round( camera.y )
							|| Math.round( app.three.camera.position.z ) !== Math.round( camera.z )
						) {
							//ジオメトリ左上のピクセル座標
							var nwPixelXY = Smap.latLngToPoint( app.mapOptions.dem.area.nw, app.mapOptions.dem.zoom );
							/*
							//ジオメトリのdimension（m）
								mesh.geometry.parameters.width
								mesh.geometry.parameters.height
							//ジオメトリのグリッド数（ピクセル数）
								mesh.geometry.parameters.widthSegments + 1
								mesh.geometry.parameters.heightSegments + 1
							//左上から視点位置までのxy軸の距離（m）
								app.three.camera.position.x - mesh.geometry.attributes.position.array[0]
								mesh.geometry.attributes.position.array[1] + app.three.camera.position.y
							*/
							//視点位置のピクセル座標を計算
							var cameraXY = {
								'x' : nwPixelXY.x
										+ (
												( app.three.meshes.base.geometry.parameters.widthSegments + 1 )
												* ( app.three.camera.position.x - app.three.meshes.base.geometry.attributes.position.array[0] )
												/ app.three.meshes.base.geometry.parameters.width
											),
								'y' : nwPixelXY.y
										+ (
												( app.three.meshes.base.geometry.parameters.heightSegments + 1 )
												* ( app.three.meshes.base.geometry.attributes.position.array[1] - app.three.camera.position.y )
												/ app.three.meshes.base.geometry.parameters.height
											)
							};
							//視点位置の経緯度
							var cameraLatLng = Smap.pointToLatLng( cameraXY, app.mapOptions.dem.zoom );
							var cameraAltitude = app.three.camera.position.z / ex;
							
							//カメラ位置が決まる
							parameters.camera = roundFloat( cameraLatLng.lat, 4 )
												+ ',' + roundFloat( cameraLatLng.lng, 4 )
												+ ',' + String( Math.round(cameraAltitude) );
						}//if
						
						//鉛直上向き方向
						if (
							app.three.camera.up.x !== 0
							|| app.three.camera.up.y !== 0
							|| app.three.camera.up.z !== 1
						) {
							parameters.up = roundFloat( app.three.camera.up.x, 2 )
											+ ',' + roundFloat( app.three.camera.up.y, 2 )
											+ ',' + roundFloat( app.three.camera.up.z, 2 );
						}//if
						
						//視点の向き
						if (
							app.three.controls.target.x !== 0
							|| app.three.controls.target.y !== 0
							|| app.three.controls.target.z !== 0
						) {
							parameters.to = roundFloat( app.three.controls.target.x, 0 )
											+ ',' + roundFloat( app.three.controls.target.y, 0 )
											+ ',' + roundFloat( app.three.controls.target.z, 0 );
						}//if
						
						//背景地図
						var base = $( '#panel select[name="base"]' ).val();
						if ( base !== DEFINITIONS.initial.base ) {
							parameters.base = base;
						}//if
						
						//オプションレイヤー
						var layers = [];
						$( '#layers ul li input[type="checkbox"]:checked' ).each( function(index_, element_) {
							layers.push( $(this).val() );
						});
						if ( layers.length ) {
							parameters.layer = layers.join( ',' );
						}//if
						
						//オーバーレイ不透明度
						var opacity = parseInt($('#panel input[name="opacity"]').val(), 10) / 100
						if ( opacity !== DEFINITIONS.initial.opacity ) {
							parameters.opacity = String( opacity );
						}//if
						
						//断面不透明度
						var section = parseInt($('#panel input[name="section"]').val(), 10) / 100
						if ( section !== DEFINITIONS.initial.section ) {
							parameters.section = String( section );
						}//if
						
						//合成モード
						var mode = $( '#panel select[name="mode"]' ).val();
						if ( mode !== DEFINITIONS.initial.mode ) {
							parameters.mode = mode;
						}//if
						
						//ワイヤーフレーム表示
						if ( $('#panel input[name="wire"]').prop('checked') ) {
							parameters.wire = '1';
						}//if
						
						//ここまででパラメータが決まる
						
						//URLパスを取得し、パラメータを付与して、最後に末尾の文字（?または&）を切り取る
						var url = window.location.href.split('?').shift() + '?';
						for ( var i in parameters ) {
							url += i + '=' + parameters[i] + '&';
						}//for
						url = url.substr( 0, url.length - 1 );
						
						//ダイアログを表示し、textareaにURLを埋めこんで選択状態にする
						$( '#getUrl' ).dialog({
							'width' : '350px',
							'modal' : true
						});//dialog
						$( '#getUrl textarea' ).css({ 'width':'300px', 'font-size':'0.8em' }).val( url ).select();
					});
					
					//------------------------------------------------------------
					//イベント処理：凡例表示窓を閉じる
					$( 'img.closeSmallWindow', app.operation.subwindow ).click(function(){
						//凡例表示窓を非表示にするとともにpingを除去、変数を初期化する
						app.operation.subwindow.hide();
						app.three.scene.remove( app.three.ping );
						app.three.ping = false;
					});//click
					
					//------------------------------------------------------------
					//イベント処理：mousedownイベント（クリック判定）
					app.three.container.addEventListener( 'mousedown', function(event_) {
						//クリック位置のスクリーン座標を取得、正規化（-1から1）して変数に格納（webglのスクリーン座標は-1から1を使う）
						var position = $( this ).position();
						//app.operation.mousemove.x = ( event_.clientX - position.left ) / $( this ).width() *  1 * 2 - 1;
						//app.operation.mousemove.y = ( event_.clientY - position.top ) / $( this ).height() * -1 * 2 + 1;
						app.operation.mousemove.x = ( event_.layerX - position.left ) / $( this ).width() *  1 * 2 - 1;
						app.operation.mousemove.y = ( event_.layerY - position.top ) / $( this ).height() * -1 * 2 + 1;
					}, false );//container.addEventListener
					
					//------------------------------------------------------------
					//イベント処理：mouseupイベント（クリック判定）
					app.three.container.addEventListener( 'mouseup', function(event_) {
						event_.preventDefault();
						
						//クリック位置のスクリーン座標を取得
						var position = $( this ).position();
						var mouse = {};
						//mouse.x = ( event_.clientX - position.left ) / $( this ).width() *  1 * 2 - 1;
						//mouse.y = ( event_.clientY - position.top ) / $( this ).height() * -1 * 2 + 1;
						mouse.x = ( event_.layerX - position.left ) / $( this ).width() *  1 * 2 - 1;
						mouse.y = ( event_.layerY - position.top ) / $( this ).height() * -1 * 2 + 1;
						
						//mousedownとmouseupの座標が同じ場合をクリックとみなして処理
						if (
							app.operation.mousemove.x === mouse.x
							&& app.operation.mousemove.y === mouse.y
						) {
							//raycasterを初期化し、meshとの交点を調べる
							var raycaster = new THREE.Raycaster();
							raycaster.setFromCamera( mouse, app.three.camera );
							var intersections = raycaster.intersectObjects( [app.three.meshes.base] );
							
							//meshとの衝突があった場合のみ処理
							if ( intersections.length ) {
								//最初に衝突したmesh
								var intersection = intersections[0];
								
								//衝突座標（単位m）
								var clickXyz = intersection.point;
								
								//geometryの幅と高さ（単位m）
								var width = intersection.object.geometry.parameters.width;
								var height = intersection.object.geometry.parameters.height;
								
								//geometryのグリッド座標データ
								var geometryXyzData = intersection.object.geometry.attributes.position.array;
								
								//クリック地点と左上（北西端）の間の距離（単位m=ピクセル番地）
								var clickL = clickXyz.x - geometryXyzData[0];
								var clickT = geometryXyzData[1] - clickXyz.y;
								
								//クリック地点の左上（北西端）からの相対位置
								var clickLP = clickL / width;
								var clickTP = clickT / height;
								
								//貼り付けた地図画像の幅と高さ
								var mapPixelWidth = intersection.object.material.map.image.width;
								var mapPixelHeight = intersection.object.material.map.image.height;
								
								//貼り付けた地図左上を原点とした時のクリック地点の座標を計算
								var clickPixelXinMap = Math.floor( mapPixelWidth * clickLP );
								var clickPixelYinMap = Math.floor( mapPixelHeight * clickTP );
								
								//クリックが定義されている場合のみ処理
								if ( DEFINITIONS.overlay.click ) {
									var parameters = $.extend( true, {}, DEFINITIONS.overlay.options.parameters );
									parameters = $.extend( true, parameters, DEFINITIONS.overlay.click );
									parameters.i = clickPixelXinMap - app.mapOptions.offset.x;
									parameters.j = clickPixelYinMap - app.mapOptions.offset.y;
									
									var url = DEFINITIONS.overlay.options.url;
									for ( var i in parameters ) {
										url += i + '=' + encodeURIComponent( parameters[i] ) + '&';
									}
									$( 'div.contentArea', app.operation.subwindow )
										.empty()
										.append(
												$( document.createElement('iframe') )
													.attr({ 'src' : url })
											);
									app.operation.subwindow.show();
									
									//マーカーを立てる
									(function(){
										//現在のz伸長と標高を取得、計算する
										var ex = parseInt( $('#panel input[name="ex"]').val(), 10 );
										var elevation = clickXyz.z / ex;
										
										//pingを立てる関数を用意する
										var standPing = function ( ex_, elevation_ ) {
											//pingがあれば削除する（常にpingは1つ）
											if ( app.three.ping ) {
												app.three.scene.remove( app.three.ping );
												app.three.ping = false;
											}
											
											//pingを作る（最後にconeとsphereをmergeするためBufferGeometryを使わない）
											//pingの針をつくって位置を決める
											var geometryCone = new THREE.ConeGeometry(
																						DEFINITIONS.three.ping.cone.radius,
																						DEFINITIONS.three.ping.cone.height / app.three.scene.scale.z,
																						32
																					);
											geometryCone.rotateX( Math.PI / 2 * -1 );
											for ( var i=0,j=geometryCone.vertices.length; i<j; i++ ) {
												geometryCone.vertices[i].x += clickXyz.x;
												geometryCone.vertices[i].y += clickXyz.y;
												geometryCone.vertices[i].z += ex_ * elevation_ + DEFINITIONS.three.ping.cone.height / 2;
											}
											var material = new THREE.MeshBasicMaterial({ 'color' : 0x000000 });
											var cone = new THREE.Mesh( geometryCone, material );
											cone.updateMatrix();
											
											//pingの球をつくって位置を決める
											var geometrySphere = new THREE.SphereGeometry(
																							DEFINITIONS.three.ping.sphere.radius,
																							16,
																							16
																						);
											for ( var i=0,j=geometrySphere.vertices.length; i<j; i++ ) {
												geometrySphere.vertices[i].x += clickXyz.x;
												geometrySphere.vertices[i].y += clickXyz.y;
												geometrySphere.vertices[i].z += ex_ * elevation_ + DEFINITIONS.three.ping.cone.height / 2 + DEFINITIONS.three.ping.sphere.radius;
											}//for
											var material = new THREE.MeshBasicMaterial({ 'color' : 0x000000 });
											var sphere = new THREE.Mesh( geometrySphere, material );
											sphere.updateMatrix();
											
											//針と球をマージしてpingにする
											var pingGeometry = new THREE.Geometry();
											pingGeometry.merge( cone.geometry, cone.matrix );
											pingGeometry.merge( sphere.geometry, sphere.matrix );
											var material = new THREE.MeshPhongMaterial({ 'color' : DEFINITIONS.three.ping.color });
											app.three.ping = new THREE.Mesh( new THREE.BufferGeometry().fromGeometry(pingGeometry), material );
											app.three.ping.castShadow = true;
											app.three.scene.add( app.three.ping );
										};//function
										
										//ping立て関数を実行する
										standPing( ex, elevation );
										
										//z伸長が変更されたらpingを立て直す
										$( '#panel input[name="ex"]' ).change(function(){
											if ( app.three.ping ) {
												var ex = parseInt( $(this).val(), 10 );
												standPing( ex, elevation );
											}//if
										});//change
									})();
								}//if
							}//if
						}//if
					}, false );//container.addEventListener
				}//if
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: failed to draw 3d section model.' );
				return false;
			}//function
		);//then
});//ready
