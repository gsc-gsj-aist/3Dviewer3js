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
app.three.ping = false;

//------------------------------------------------------------
//地図関連データ格納用
app.mapData = {};

//背景地図とオーバーレイのcanvasを保持（不透明度変更時に再利用）
app.mapData.canvases = {};
app.mapData.canvases.basemaps = {};
//オーバーレイWMSのGetMap時のパラメータ（GetFeatureInfoで再利用）
app.mapData.wmsGetMapParameter = {};

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
		$( 'h1' ).text( DEFINITIONS.title );
		window.document.title = DEFINITIONS.title;
	}
	
	//3D構築（初期化）用パラメータの準備
	var initialParameters = {};
	
	//デフォルト値代入（水平維持固定でそれ以外は定義ファイルで指定）
	//initialParameters.camera = DEFINITIONS.three.camera.position;
	if (
		typeof DEFINITIONS.initial.camera === 'string'
		&& DEFINITIONS.initial.camera.length
	) {
		initialParameters.camera = project.latLngAltToCoord3d(
																DEFINITIONS.initial.camera,
																DEFINITIONS.area.nwLatLng,
																DEFINITIONS.area.seLatLng,
																DEFINITIONS.baseData.elevation.zoom
															);
	} else {
		initialParameters.camera = DEFINITIONS.nocameraxyz;
	}
	initialParameters.up = { 'x' : 0, 'y' : 0, 'z' : 1 };
	initialParameters.to = { 'x' : 0, 'y' : 0, 'z' : 0 };
	initialParameters.base = DEFINITIONS.initial.base;
	initialParameters.opacity = DEFINITIONS.initial.opacity;
	initialParameters.mode = DEFINITIONS.initial.mode;
	initialParameters.ex = DEFINITIONS.initial.ex;
	initialParameters.wire = DEFINITIONS.initial.wire;
	initialParameters.keephorizon = DEFINITIONS.initial.keephorizon;
	initialParameters.autorotation = DEFINITIONS.initial.autorotation;
	
	//クエリーパラメータがあればそれを取得する
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
																									keyValue[1],
																									DEFINITIONS.area.nwLatLng,
																									DEFINITIONS.area.seLatLng,
																									DEFINITIONS.baseData.elevation.zoom
																								);
														if ( !coord3d ) {
															validation = false;
														} else {
															parameters.camera = coord3d;
														}
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
														if ( typeof DEFINITIONS.baseData.backgroundMap.basemaps[keyValue[1]] === 'undefined' ) {
															//登録されていなければエラー
															validation = false;
														} else {
															//登録されていればパラメータとして設定する
															parameters.base = keyValue[1];
														}
														break;
													//--------------------------------------------------
													//不透明度
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
														}
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
														}
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
														}
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
														}
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
									}
								})( window.location.search.substr( 1 ) );
		//クエリーパラメータが有効な場合は初期パラメータを上書きする
		if ( queryParameters ) {
			$.extend( true, initialParameters, queryParameters );
		}
	}
	//視点位置のz（標高）値を3Dシーン内のz値に変換する（標高強調は地形に対してのみ実行しているため）
	initialParameters.camera.z = initialParameters.camera.z * initialParameters.ex;
	
	//==========================================================================================
	//Formの準備をする（要素の準備と初期値決定）
	//背景地図種別（selectオプション）の登録
	for ( var i in DEFINITIONS.baseData.backgroundMap.basemaps ) {
		$( document.createElement('option') )
											.val( i )
											.text( DEFINITIONS.baseData.backgroundMap.basemaps[i].name )
											.appendTo( $('#panel select[name="base"]') );
	}
	//背景地図
	$( '#panel select[name="base"]' ).val( initialParameters.base );
	//不透明度
	$( '#panel input[name="opacity"]' ).val( initialParameters.opacity * 100 );
	$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(initialParameters.opacity * 100) );
	//合成モード
	$( '#panel select[name="mode"]' ).val( initialParameters.mode );
	//標高強調（z軸伸長）
	$( '#panel input[name="ex"]' ).val( initialParameters.ex );
	$( '#panel input[name="ex"]' ).siblings( 'span' ).text( String(initialParameters.ex) );
	//ワイヤーフレーム
	$( '#panel input[name="wire"]' ).prop( 'checked', initialParameters.wire );			
	//水平維持
	$( '#panel input[name="keephorizon"]' ).prop( 'checked', initialParameters.keephorizon );
	//自動回転（現状は起動時自動回転に非対応：スクリプトの調整が必要）
	$( '#panel input[name="autorotation"]' ).prop( 'checked', initialParameters.autorotation );
	
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
		}
		
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
		}
		
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
		}
		
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
				camera.position.x = radius * Math.sin(theta);
				camera.position.y = radius * Math.cos(theta);
				
				//視点は常に中心を向く
				camera.lookAt(new THREE.Vector3(0, 0, 0));
			}
			
			//水平維持の場合は常に鉛直上向きになるよう強制
			if ( $('#panel input[name="keephorizon"]').prop('checked') ) {
				camera.up.set( 0, 0, 1 );
			}
		};
		render();
		
		//----------------------------------------------------------------------
		//再描画関数（描画領域変更時に実行）
		var redraw = function () {
			renderer.setSize( $(container).width(), $(container).height() );
			camera.aspect = $( container ).width() / $( container ).height();
			camera.updateProjectionMatrix();
		};
		//イベントの登録
		$( window ).on( 'orientationchange resize', function(){
			redraw();
		});
		
		//----------------------------------------------------------------------
		//グローバル変数への割当
		app.three.container = container;
		app.three.scene = scene;
		app.three.camera = camera;
		app.three.controls = controls;
	})( DEFINITIONS.three.elementId );
	
	//==========================================================================================
	//promise配列の準備とWMTSデータ合成promiseの投入
	var promises = [];
	//標高データと背景地図を読み込む（両者はいつもWMTS）promiseを配列に格納
	promises.push(
					project.getSynthesizedMap (
										DEFINITIONS.baseData.elevation.urlTemplate,
										DEFINITIONS.area.nwLatLng,
										DEFINITIONS.area.seLatLng,
										DEFINITIONS.baseData.elevation.zoom
									)
				);
	promises.push(
					project.getSynthesizedMap (
										//DEFINITIONS.baseData.backgroundMap.urlTemplate,
										DEFINITIONS.baseData.backgroundMap.basemaps[$('#panel select[name="base"]').val()].urlTemplate,
										DEFINITIONS.area.nwLatLng,
										DEFINITIONS.area.seLatLng,
										DEFINITIONS.baseData.backgroundMap.zoom
									)
				);
	
	//==========================================================================================
	//promise処理
	Smap.promise.finishing( promises )
		.then(
			function ( data_ ) {
				//canvas配列を受け取る（0：標高、1：地図）
				//受け取ったデータにオーバーレイのcanvasを追加する
				return project.pushWMSOverlay( data_ );
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: creation of elevation or background-map canvas.' );
			}//function
		).then(
			function ( data_ ) {
				//canvas配列を受け取る（0：標高、1：地図、2：オーバーレイ）
				
				//不透明度変更で使用するためオリジナルのcanvasを変数に保存しておく
				app.mapData.canvases.basemaps[$('#panel select[name="base"]').val()] = data_[1];
				app.mapData.canvases.overlay = data_[2];
				
				//1と2を重ねる
				return [
							data_[0],
							project.pileUpCanvases(
													data_[1],
													data_[2],
													parseInt( $('#panel input[name="opacity"]').val(),10 ) / 100,
													//$( '#panel select[name="mode"]' ).val()
													project.mode[ $('#panel select[name="mode"]').val() ]
												)
						];
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: creation of overlay canvas.' );
			}//function
		).then(
			function ( data_ ) {
				//canvas配列を受け取る（0：標高、1：地図とオーバーレイの合成）
				
				//ここでthree.jsの記述を始めるとieでエラーになる（原因不明）
				//mesh以外の準備はすべて事前に済ませてく
				
				//************************************************************
				//meshの作成ここから
				//************************************************************
				
				//------------------------------------------------------------
				//変数にcanvasを格納しておく（可読性向上の為）
				var canvasElevation = data_[0];
				var canvasMapImage = data_[1];
				
				//------------------------------------------------------------
				//描画領域の南北、東西の長さ（m）を決める（標高がm単位なので、単位を合わせるため）
				var size = project.getDimension(
											DEFINITIONS.area.nwLatLng,
											DEFINITIONS.area.seLatLng
										);
				
				//------------------------------------------------------------
				//geometryの準備
				var geometry = new THREE.PlaneBufferGeometry(
																size.width,
																size.height,
																canvasElevation.width - 1,
																canvasElevation.height - 1
															);
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				
				//------------------------------------------------------------
				//標高を計算してgeometryを作る
				//格納先変数の取得
				var data = geometry.attributes.position.array;
				//標高canvasからimageDataを取り出す
				var ctx = canvasElevation.getContext( '2d' );
				var imageData = ctx.getImageData( 0, 0, canvasElevation.width, canvasElevation.height );
				//標高canvasのピクセルを走査して、各ピクセルにおける標高を計算し、geometryのグリッド交点の値を決める
				for ( var i=0,j=canvasElevation.width * canvasElevation.height; i<j; i++ ) {
					//xyzのうちzのみ操作する
					//標高値はimageDataのrgbaから計算する
					data[i*3 + 2] = project.color2elevation(
													imageData.data[i*4 + 0],
													imageData.data[i*4 + 1],
													imageData.data[i*4 + 2],
													imageData.data[i*4 + 3]
												);
				}//for
				
				//------------------------------------------------------------
				//materialを作成する
				var texture = new THREE.Texture( canvasMapImage );
				texture.needsUpdate = true;
				texture.minFilter = THREE.LinearFilter;
				var material = new THREE.MeshPhongMaterial({
														"map"			: texture,
														"side"			: THREE.DoubleSide,
														"wireframe"		: $( '#panel input[name="wire"]' ).prop( 'checked' ),
														//"color"			: 0xff8800,
														//"transparent"	: true,
														//"opacity"		: 0.5,
														//"blending"		: THREE.NormalBlending,
														//"depthWrite"	: true,
														//"depthTest"		: true,
														"overdraw"		: true
													});
				
				//------------------------------------------------------------
				//meshを作ってsceneに登録する
				var mesh = new THREE.Mesh( geometry, material );
				//mesh.castShadow = true;
				mesh.receiveShadow = true;
				app.three.scene.add( mesh );
				
				//------------------------------------------------------------
				//z軸方向伸長を初期値で設定
				mesh.scale.z = initialParameters.ex;
				
				//描画完了後にローディング画面（デフォルト表示）を隠す
				$( '#modal' ).hide();
				
				//************************************************************
				//各種イベントの登録
				//************************************************************
				
				//------------------------------------------------------------
				//イベント処理：オーバーレイ不透明度の変更
				$( '#panel input[name="opacity"]' ).change(function(){
					//値を取得してcanvasを再合成し、materialに登録
					var canvas = project.pileUpCanvases (
															app.mapData.canvases.basemaps[$('#panel select[name="base"]').val()],
															app.mapData.canvases.overlay,
															parseFloat( $(this).val() / 100 ),
															//$( '#panel select[name="mode"]' ).val()
															project.mode[ $('#panel select[name="mode"]').val() ]
														);
					var texture = new THREE.Texture( canvas );
					texture.needsUpdate = true;
					texture.minFilter = THREE.LinearFilter;
					mesh.material.map = texture;
				});//click
				//スライドバー横の表示変更はリアルタイムで
				$( '#panel input[name="opacity"]' ).on( 'input change', function(){
					$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String($(this).val()) );
				});//on
				
				//------------------------------------------------------------
				//イベント処理：合成モードの変更
				$( '#panel select[name="mode"]' ).change(function(){
					//値を取得してcanvasを再合成し、materialに登録
					var canvas = project.pileUpCanvases (
															app.mapData.canvases.basemaps[$('#panel select[name="base"]').val()],
															app.mapData.canvases.overlay,
															parseInt( $('#panel input[name="opacity"]').val(), 10 ) / 100,
															//$( this ).val()
															project.mode[ $(this).val() ]
														);
					var texture = new THREE.Texture( canvas );
					texture.needsUpdate = true;
					texture.minFilter = THREE.LinearFilter;
					mesh.material.map = texture;
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
						}
						//オフセット角の計算
						var angle = app.three.camera.position.x / app.three.camera.position.y;
						app.operation.rotation.offset = Math.atan( angle );
						//視点位置のy座標が0未満の場合は半回転加える
						if ( app.three.camera.position.y < 0 ) {
							app.operation.rotation.offset += Math.PI;
						}
						
						//回転クロックをスタートする
						app.operation.rotation.clock.start();
					} else {
						//停止する場合
						//回転クロックを停止する
						app.operation.rotation.clock.stop();
					}
				});
				
				//------------------------------------------------------------
				//イベント処理：背景地図変更
				$( '#panel select[name="base"]' ).change(function(){
					//値を取得
					var base = $( this ).val();
					//背景地図が読み込まれていない可能性があるためプロミス処理する
					var promise;
					//背景地図が読み込まれているかどうかの分岐処理
					if ( !app.mapData.canvases.basemaps[ base ] ) {
						//読み込まれていない場合は背景地図を生成するプロミスを生成
						promise = project.getSynthesizedMap (
											DEFINITIONS.baseData.backgroundMap.basemaps[ base ].urlTemplate,
											DEFINITIONS.area.nwLatLng,
											DEFINITIONS.area.seLatLng,
											DEFINITIONS.baseData.backgroundMap.zoom
										).then(
											function ( data_ ) {
												app.mapData.canvases.basemaps[ base ] = data_;
												return true;												
											},
											function ( error_ ) {
												return false;
											}
										);
					} else {
						//読み込み済みの場合はすぐにtrueを返すプロミスを生成
						promise = Smap.promise.resolve( true );
					}
					
					//ローディング画面を表示
					$( '#modal' ).show();
					
					//プロミス実行
					promise.then(
						function ( data_ ) {
							if ( !data_ ) {
								//実行に失敗した場合
							} else {
								//実行に成功した場合
								//canvasを再合成し、materialに登録
								var canvas = project.pileUpCanvases (
																		app.mapData.canvases.basemaps[ base ],
																		app.mapData.canvases.overlay,
																		parseInt( $('#panel input[name="opacity"]').val(), 10 ) / 100,
																		//$( '#panel select[name="mode"]' ).val()
																		project.mode[ $('#panel select[name="mode"]').val() ]
																	);
								var texture = new THREE.Texture( canvas );
								texture.needsUpdate = true;
								texture.minFilter = THREE.LinearFilter;
								mesh.material.map = texture;
								
								//ローディング画面を隠す
								$( '#modal' ).hide();
							}
						},
						function ( error_ ) {
							//
						}
					);
				});
				
				//------------------------------------------------------------
				//イベント処理：再現用URL取得
				$( '#panel input[name="showurl"]' ).click(function(){
					//小数点を丸めるための関数（toFixedでもOKか）
					var roundFloat = function ( value_, number_ ) {
						var sign = '';
						if ( value_ < 0 ) {
							sign = '-';
							value_ = value_ * -1;
						}
						var str = String( Math.round(value_ * Math.pow(10, number_)) );
						while ( str.length <= number_ ) {
							str = '0' + str;
						}
						var value = sign + str.substr(0, str.length - number_);
						if ( number_ !== 0 ) {
							value = value + '.' + str.substr( str.length - number_, number_ );
						}
						return String( value );
					};
					
					//自動回転を停止する
					$( '#panel input[name="autorotation"]' ).prop( 'checked', false );
					app.operation.rotation.clock.stop();
					
					//クエリパラメータを作る（デフォルト値と比較して値が異なる場合のみパラメータに追加する）
					var parameters = {};
					
					//標高強調
					var ex = parseInt( $('#panel input[name="ex"]').val(), 10 );
					if ( ex !== DEFINITIONS.initial.ex ) {
						parameters.ex = ex;
					}
					
					//視点位置
					var camera;
					if (
						typeof DEFINITIONS.initial.camera === 'string'
						&& DEFINITIONS.initial.camera.length
					) {
						camera = project.latLngAltToCoord3d(
																DEFINITIONS.initial.camera,
																DEFINITIONS.area.nwLatLng,
																DEFINITIONS.area.seLatLng,
																DEFINITIONS.baseData.elevation.zoom
															);
					} else {
						camera = DEFINITIONS.nocameraxyz;
					}
					if (
						Math.round( app.three.camera.position.x ) !== Math.round( camera.x )
						|| Math.round( app.three.camera.position.y ) !== Math.round( camera.y )
						|| Math.round( app.three.camera.position.z ) !== Math.round( camera.z )
					) {
						//ジオメトリ左上のピクセル座標
						var nwPixelXY = Smap.latLngToPoint( DEFINITIONS.area.nwLatLng, DEFINITIONS.baseData.elevation.zoom );
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
											( mesh.geometry.parameters.widthSegments + 1 )
											* ( app.three.camera.position.x - mesh.geometry.attributes.position.array[0] )
											/ mesh.geometry.parameters.width
										),
							'y' : nwPixelXY.y
									+ (
											( mesh.geometry.parameters.heightSegments + 1 )
											* ( mesh.geometry.attributes.position.array[1] - app.three.camera.position.y )
											/ mesh.geometry.parameters.height
										)
						};
						//視点位置の経緯度
						var cameraLatLng = Smap.pointToLatLng( cameraXY, DEFINITIONS.baseData.elevation.zoom );
						var cameraAltitude = app.three.camera.position.z / ex;
						
						//カメラ位置が決まる
						parameters.camera = roundFloat( cameraLatLng.lat, 4 )
											+ ',' + roundFloat( cameraLatLng.lng, 4 )
											+ ',' + String( Math.round(cameraAltitude) );
					}
					
					//鉛直上向き方向
					if (
						app.three.camera.up.x !== 0
						|| app.three.camera.up.y !== 0
						|| app.three.camera.up.z !== 1
					) {
						parameters.up = roundFloat( app.three.camera.up.x, 2 )
										+ ',' + roundFloat( app.three.camera.up.y, 2 )
										+ ',' + roundFloat( app.three.camera.up.z, 2 );
					}
					
					//視点の向き
					if (
						app.three.controls.target.x !== 0
						|| app.three.controls.target.y !== 0
						|| app.three.controls.target.z !== 0
					) {
						parameters.to = roundFloat( app.three.controls.target.x, 0 )
										+ ',' + roundFloat( app.three.controls.target.y, 0 )
										+ ',' + roundFloat( app.three.controls.target.z, 0 );
					}
					
					//背景地図
					var base = $( '#panel select[name="base"]' ).val();
					if ( base !== DEFINITIONS.initial.base ) {
						parameters.base = base;
					}
					
					//不透明度
					var opacity = parseInt($('#panel input[name="opacity"]').val(), 10) / 100
					if ( opacity !== DEFINITIONS.initial.opacity ) {
						parameters.opacity = String( opacity );
					}
					
					//合成モード
					var mode = $( '#panel select[name="mode"]' ).val();
					if ( mode !== DEFINITIONS.initial.mode ) {
						parameters.mode = mode;
					}
					
					//ワイヤーフレーム表示
					if ( $('#panel input[name="wire"]').prop('checked') ) {
						parameters.wire = '1';
					}
					
					//ここまででパラメータが決まる
					
					//URLパスを取得し、パラメータを付与して、最後に末尾の文字（?または&）を切り取る
					var url = window.location.href.split('?').shift() + '?';
					for ( var i in parameters ) {
						url += i + '=' + parameters[i] + '&';
					}
					url = url.substr( 0, url.length - 1 );
					
					//ダイアログを表示し、textareaにURLを埋めこんで選択状態にする
					$( '#dialog' ).dialog({
						'width' : '350px',
						'modal' : true
					});
					$( '#dialog textarea' ).css({'width':'300px','font-size':'0.8em'}).val( url ).select();
				});
				
				//------------------------------------------------------------
				//イベント処理：標高強調（z軸伸長）の変更
				$( '#panel input[name="ex"]' ).change(function(){
					//値を取得して、meshのz伸長を変更
					mesh.scale.z = parseInt( $(this).val(), 10 );
				});//change
				//スライドバー横の表示変更はリアルタイムで
				$( '#panel input[name="ex"]' ).on( 'input change', function(){
					$( '#panel input[name="ex"]' ).siblings( 'span' ).text( String($(this).val()) );
				});//on		
				
				//------------------------------------------------------------
				//イベント処理：ワイヤーフレーム表示チェックボックスのクリック
				$( '#panel input[name="wire"]' ).click(function(){
					//materialのwireframeを変更
					mesh.material.wireframe = $( this ).prop( 'checked' );
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
					$( '#panel select[name="base"]' ).val( DEFINITIONS.initial.base );
					$( '#panel input[name="opacity"]' ).val( DEFINITIONS.initial.opacity * 100 );
					$( '#panel input[name="opacity"]' ).siblings( 'span' ).text( String(DEFINITIONS.initial.opacity * 100) );
					$( '#panel select[name="mode"]' ).val( DEFINITIONS.initial.mode );
					$( '#panel input[name="ex"]' ).val( DEFINITIONS.initial.ex );
					$( '#panel input[name="ex"]' ).siblings( 'span' ).text( String(DEFINITIONS.initial.ex) );
					$( '#panel input[name="wire"]' ).prop( 'checked', DEFINITIONS.initial.wire );
					$( '#panel input[name="autorotation"]' ).prop( 'checked', DEFINITIONS.initial.autorotation );
					$( '#panel input[name="keephorizon"]' ).prop( 'checked', DEFINITIONS.initial.keephorizon );
					
					//z伸長をリセット
					mesh.scale.z = DEFINITIONS.initial.ex;
					
					//視点のリセット（視点の向きがリセットされる）
					app.three.controls.reset();
					
					//視点位置リセット（パラメータ指定があるとコントロールのリセットでは効かない）
					var camera;
					if (
						typeof DEFINITIONS.initial.camera === 'string'
						&& DEFINITIONS.initial.camera.length
					) {
						camera = project.latLngAltToCoord3d(
																	DEFINITIONS.initial.camera,
																	DEFINITIONS.area.nwLatLng,
																	DEFINITIONS.area.seLatLng,
																	DEFINITIONS.baseData.elevation.zoom
																);
					} else {
						camera = DEFINITIONS.nocameraxy;
					}
					app.three.camera.position.set( camera.x, camera.y, camera.z );
					
					//鉛直リセット
					app.three.camera.up.set( 0, 0, 1 );
					
					//pingの除去
					if ( app.three.ping ) {
						app.three.scene.remove( app.three.ping );
						app.three.ping = false;
					}
					
					//凡例表示窓を隠す
					app.operation.subwindow.hide();
					
					//オーバーレイ不透明度、ワイヤーフレームを初期化してmaterialを再構成
					//背景地図の値を取得
					var base = $('#panel select[name="base"]').val();
					//背景地図が読み込まれていない可能性がある（パラメータで背景地図指定の場合）ためプロミス処理する
					var promise;
					//背景地図が読み込まれているかどうかの分岐処理
					if ( !app.mapData.canvases.basemaps[ base ] ) {
						//読み込まれていない場合は背景地図を生成するプロミスを生成
						promise = project.getSynthesizedMap (
											DEFINITIONS.baseData.backgroundMap.basemaps[ base ].urlTemplate,
											DEFINITIONS.area.nwLatLng,
											DEFINITIONS.area.seLatLng,
											DEFINITIONS.baseData.backgroundMap.zoom
										).then(
											function ( data_ ) {
												app.mapData.canvases.basemaps[ base ] = data_;
												return true;												
											},
											function ( error_ ) {
												return false;
											}
										);
					} else {
						//読み込み済みの場合はすぐにtrueを返すプロミスを生成
						promise = Smap.promise.resolve( true );
					}
					
					//ローディング画面を表示
					$( '#modal' ).show();
					
					promise.then(
						function ( data_ ) {
							if ( !data_ ) {
								//実行に失敗した場合
							} else {
								//実行に成功した場合
								//canvasを再合成し、materialに登録
								var canvas = project.pileUpCanvases (
																		app.mapData.canvases.basemaps[ base ],
																		app.mapData.canvases.overlay,
																		parseInt( $('#panel input[name="opacity"]').val(), 10 ) / 100,
																		//$( '#panel select[name="mode"]' ).val()
																		project.mode[ $('#panel select[name="mode"]').val() ]
																	);
								var texture = new THREE.Texture( canvas );
								texture.needsUpdate = true;
								texture.minFilter = THREE.LinearFilter;
								mesh.material.map = texture;
								
								//ワイヤーフレーム表示真偽もデフォルト値に変更
								mesh.material.wireframe = DEFINITIONS.initial.wire;
								
								//ローディング画面を隠す
								$( '#modal' ).hide();
							}
						},
						function ( error_ ) {
							//
						}
					);
				});//click
				
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
				app.three.container.addEventListener( 'mousedown', function(event_){
					//クリック位置のスクリーン座標を取得、正規化（-1から1）して変数に格納（webglのスクリーン座標は-1から1を使う）
					var position = $( this ).position();
					app.operation.mousemove.x = ( event_.clientX - position.left ) / $( this ).width() *  1 * 2 - 1;
					app.operation.mousemove.y = ( event_.clientY - position.top ) / $( this ).height() * -1 * 2 + 1;
					//app.operation.mousemove.x = ( event_.layerX - position.left ) / $( this ).width() *  1 * 2 - 1;
					//app.operation.mousemove.y = ( event_.layerY - position.top ) / $( this ).height() * -1 * 2 + 1;
				}, false );//container.addEventListener
				
				//------------------------------------------------------------
				//イベント処理：mouseupイベント（クリック判定）
				app.three.container.addEventListener( 'mouseup', function(event_){
					event_.preventDefault();
					
					//クリック位置のスクリーン座標を取得
					var position = $( this ).position();
					var mouse = {};
					mouse.x = ( event_.clientX - position.left ) / $( this ).width() *  1 * 2 - 1;
					mouse.y = ( event_.clientY - position.top ) / $( this ).height() * -1 * 2 + 1;
					//mouse.x = ( event_.layerX - position.left ) / $( this ).width() *  1 * 2 - 1;
					//mouse.y = ( event_.layerY - position.top ) / $( this ).height() * -1 * 2 + 1;
					
					//mousedownとmouseupの座標が同じ場合をクリックとみなして処理
					if (
						app.operation.mousemove.x === mouse.x
						&& app.operation.mousemove.y === mouse.y
					) {
						//raycasterを初期化し、meshとの交点を調べる
						var raycaster = new THREE.Raycaster();
						raycaster.setFromCamera( mouse, app.three.camera );
						var intersections = raycaster.intersectObjects( [mesh] );
						
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
							
							//GetFeatureInfoのURLが指定されている場合のみ凡例表示処理を実行する
							if ( DEFINITIONS.wms.getFeatureInfo.url.length ) {
								//getFeatureInfoのクエリを組み立ててurlを生成する
								var getFeatureInfoParameters = $.extend(
																		true,
																		app.mapData.wmsGetMapParameter,
																		DEFINITIONS.wms.getFeatureInfo.parameters
																	);
								getFeatureInfoParameters.i = clickPixelXinMap;
								getFeatureInfoParameters.j = clickPixelYinMap;
								var url = DEFINITIONS.wms.getFeatureInfo.url;
								for ( var i in getFeatureInfoParameters ) {
									url += i + '=' + encodeURIComponent( getFeatureInfoParameters[i] ) + '&';
								}
								
								//凡例表示窓を初期化、iframe要素を追加して表示
								$( 'div.contentArea', app.operation.subwindow )
									.empty()
									.append(
											$( document.createElement('iframe') )
												.attr({ 'src' : url })
												//クロスドメインでiframeのbody判定すると全てエラーになるのでコメントアウト
												//.on( 'load', function(){
												//		//iframeにロードしたbodyが空の場合はno_data表示
												//		var body = $( 'body', $(this).contents() ).html();
												//		if ( ($.trim(body)).length === 0 ) {
												//			$( 'div.contentArea', app.operation.subwindow )
												//				.empty()
												//				.append(
												//					$( document.createElement('div') )
												//						.css({
												//								'margin' : '0',
												//								'padding' : '20px',
												//								'font-size' : '12px',
												//								'font-weight' : 'bold',
												//								'color' : '#f00'
												//							})
												//						.text( 'No data.' )
												//				);
												//		}
												//	})
										);
								app.operation.subwindow.show();
							}//if
							
							//マーカーを立てる
							(function(){
								//現在のz伸長と標高を取得、計算する（書き直し必要）
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
									var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
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
									}
									var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
									var sphere = new THREE.Mesh( geometrySphere, material );
									sphere.updateMatrix();
									
									//針と球をマージしてpingにする
									var pingGeometry = new THREE.Geometry();
									pingGeometry.merge( cone.geometry, cone.matrix );
									pingGeometry.merge( sphere.geometry, sphere.matrix );
									var material = new THREE.MeshPhongMaterial({ 'color' : DEFINITIONS.three.ping.color });
									app.three.ping = new THREE.Mesh( new THREE.BufferGeometry().fromGeometry( pingGeometry ), material );
									app.three.ping.castShadow = true;
									app.three.scene.add( app.three.ping );
								};
								
								//ping立て関数を実行する
								standPing( ex, elevation );
								
								//z伸長が変更されたらpingを立て直す
								$( '#panel input[name="ex"]' ).change(function(){
									if ( app.three.ping ) {
										var ex = parseInt( $(this).val(), 10 );
										standPing( ex, elevation );
									}
								});
							})();
							
						}//if
					}//if
				}, false );//container.addEventListener
				
				//------------------------------------------------------------
				//debugモード（カメラ位置取得ツールをインストール）
				/*
				if ( DEFINITIONS.debug ) {
					$( document.createElement('h3') )
						.append(
								$( document.createElement('span') ).addClass( 'lang' ).text( 'Get Camera Position' )
							)
						.appendTo( '#panel div.block' );
					$( document.createElement('div') )
						.append(
								$( document.createElement('input') )
									.attr({
											'type'	: 'button',
											'value'	: 'Get Position'
										})
									.click(function(){
											var ex = parseInt( $('#panel input[name="ex"]').val() );
											console.log( 'Camera position.' );
											console.log( 'x = ' + String(app.three.camera.position.x) );
											console.log( 'y = ' + String(app.three.camera.position.y) );
											console.log( 'z = ' + String(Math.round(app.three.camera.position.z / ex)) );
											console.log( 'ex = ' + String(ex) );
										})
							)
						.appendTo( '#panel div.block' );
					alert(
						[
							'[DEBUG MODE]',
							'Camera position utility has been installed.',
							'1. Open Javascript Console.',
							'2. Open Menu by clicking Gear icon.',
							'3. You can find the button for "Get Camera position".',
							'4. Move your 3D model, and click the button.',
							'5. Get camera position on console window.'
						].join( "\n" )
					);
				}
				*/
				
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: creation of canvas of synthesised texture.' );
			}//function
		);//then
});//ready
