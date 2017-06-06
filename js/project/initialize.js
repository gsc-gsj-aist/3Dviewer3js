//****************************************************************************************************
//アプリケーション変数
//****************************************************************************************************
var app = {};

//three.js関連
app.three = {};
app.three.scene = false;
app.three.camera = false;
app.three.controls = false;
app.three.ping = false;

//地図関連データ格納用
app.mapData = {};
//背景地図とオーバーレイのcanvasを保持（不透明度変更時に再利用）
app.mapData.canvases = {};
//オーバーレイWMSのGetMap時のパラメータ（GetFeatureInfoで再利用）
app.mapData.wmsGetMapParameter = {};

//操作用
app.operation = {};
//クリック判定のマウス位置保持用
app.operation.mousemove = {};

//****************************************************************************************************
//プログラム本体
//****************************************************************************************************
$( document ).ready(function(){
	//==========================================================================================
	//Formの準備をする（初期値で埋める）
	//不透明度
	var initialOpacity = DEFINITIONS.initial.opacity * 100;
	$( '#panel input[name=opacity]' ).val( initialOpacity );
	$( '#panel input[name=opacity]' ).siblings( 'span' ).text( String(initialOpacity) );
	//z軸伸長
	var initialZScale = DEFINITIONS.initial.zScale;
	$( '#panel input[name=zScale]' ).val( initialZScale );
	$( '#panel input[name=zScale]' ).siblings( 'span' ).text( String(initialZScale) );
	//ワイヤーフレーム
	$( '#panel input[name=wireframe]' ).prop( 'checked', false );			
	
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
								DEFINITIONS.three.camera.position.x,
								DEFINITIONS.three.camera.position.y,
								DEFINITIONS.three.camera.position.z
							);
		camera.up.set( 0, 0, 1 );
		
		//----------------------------------------------------------------------
		//コントロールの準備（コントロール先を限定するため第2引数で描画先dom要素を指定）
		var controls = new THREE.TrackballControls( camera, container );
		
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
										DEFINITIONS.baseData.backgroundMap.urlTemplate,
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
				app.mapData.canvases.basemap = data_[1];
				app.mapData.canvases.overlay = data_[2];
				
				//1と2を重ねる
				return [ data_[0], project.pileUpCanvases(data_[1], data_[2], DEFINITIONS.initial.opacity) ];
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
														//"wireframe"		: true,
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
				mesh.scale.z = DEFINITIONS.initial.zScale;
				
				//************************************************************
				//各種イベントの登録
				//************************************************************
				
				//------------------------------------------------------------
				//イベント処理：オーバーレイ不透明度の変更
				$( '#panel input[name=opacity]' ).change(function(){
					//値を取得してcanvasを再合成し、materialに登録
					var opacity = parseFloat( $(this).val() / 100 );
					var canvas = project.pileUpCanvases (
															app.mapData.canvases.basemap,
															app.mapData.canvases.overlay,
															opacity
														);
					var texture = new THREE.Texture( canvas );
					texture.needsUpdate = true;
					texture.minFilter = THREE.LinearFilter;
					mesh.material.map = texture;
				});//click
				//スライドバー横の表示変更はリアルタイムで
				$( '#panel input[name=opacity]' ).on( 'input change', function(){
					$( '#panel input[name=opacity]' ).siblings( 'span' ).text( String($(this).val()) );
				});//on
					
				//------------------------------------------------------------
				//イベント処理：z伸長の変更
				$( '#panel input[name=zScale]' ).change(function(){
					//値を取得して、meshのz伸長を変更
					mesh.scale.z = parseInt( $(this).val(), 10 );
				});//change
				//スライドバー横の表示変更はリアルタイムで
				$( '#panel input[name=zScale]' ).on( 'input change', function(){
					$( '#panel input[name=zScale]' ).siblings( 'span' ).text( String($(this).val()) );
				});//on		
				
				//------------------------------------------------------------
				//イベント処理：ワイヤーフレーム表示チェックボックスのクリック
				$( '#panel input[name=wireframe]' ).click(function(){
					//materialのwireframeを変更
					mesh.material.wireframe = $( this ).prop( 'checked' );
				});//click
				
				//------------------------------------------------------------
				//イベント処理：鉛直（水平）リセット
				$( '#panel input[name=horisonReset]' ).click(function(){
					//カメラの鉛直リセット
					app.three.camera.up.set( 0, 0, 1 );
				});//click
				
				//------------------------------------------------------------
				//イベント処理：リセット
				$( '#panel input[name=reset]' ).click(function(){
					//フォームの値を初期値に戻す
					//var initialOpacity = DEFINITIONS.initial.opacity * 100;
					$( '#panel input[name=opacity]' ).val( initialOpacity );
					$( '#panel input[name=opacity]' ).siblings( 'span' ).text( String(initialOpacity) );
					//var initialZScale = DEFINITIONS.initial.zScale;
					$( '#panel input[name=zScale]' ).val( initialZScale );
					$( '#panel input[name=zScale]' ).siblings( 'span' ).text( String(initialZScale) );
					$( '#panel input[name=wireframe]' ).prop( 'checked', false );
					
					//オーバーレイ不透明度、ワイヤーフレームを初期化してmaterialを再構成
					var canvas = project.pileUpCanvases (
															app.mapData.canvases.basemap,
															app.mapData.canvases.overlay,
															DEFINITIONS.initial.opacity
														);
					var texture = new THREE.Texture( canvas );
					texture.needsUpdate = true;
					texture.minFilter = THREE.LinearFilter;
					mesh.material.map = texture;
					mesh.material.wireframe = false;
					
					//z伸長をリセット
					mesh.scale.z = DEFINITIONS.initial.zScale;
					
					//視点のリセット
					app.three.controls.reset();
					
					//鉛直リセット
					app.three.camera.up.set( 0, 0, 1 );
					
					//pingの除去
					if ( app.three.ping ) {
						app.three.scene.remove( app.three.ping );
						app.three.ping = false;
					}
					
					//凡例表示窓を隠す
					app.operation.subwindow.hide();
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
								var zScale = parseInt( $('#panel input[name=zScale]').val(), 10 );
								var elevation = clickXyz.z / zScale;
								
								//pingを立てる関数を用意する
								var standPing = function ( zScale_, elevation_ ) {
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
										geometryCone.vertices[i].z += zScale_ * elevation_ + DEFINITIONS.three.ping.cone.height / 2;
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
										geometrySphere.vertices[i].z += zScale_ * elevation_ + DEFINITIONS.three.ping.cone.height / 2 + DEFINITIONS.three.ping.sphere.radius;
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
								standPing( zScale, elevation );
								
								//z伸長が変更されたらpingを立て直す
								$( '#panel input[name=zScale]' ).change(function(){
									if ( app.three.ping ) {
										var zScale = parseInt( $(this).val(), 10 );
										standPing( zScale, elevation );
									}
								});
							})();
							
						}//if
					}//if
				}, false );//container.addEventListener
				
				//------------------------------------------------------------
				//debugモード（カメラ位置取得ツールをインストール）
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
											console.log( 'Camera position.' );
											console.log( 'x = ' + app.three.camera.position.x );
											console.log( 'y = ' + app.three.camera.position.y );
											console.log( 'z = ' + app.three.camera.position.z );
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
				
			},//function
			function ( error_ ) {
				//
				console.log( 'ERROR: creation of canvas of synthesised texture.' );
			}//function
		);//then
});//ready
