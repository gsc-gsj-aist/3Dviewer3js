//----------------------------------------------------------------------------------------------------
//定義格納要のオブジェクト
var DEFINITIONS = {};

//----------------------------------------------------------------------------------------------------
//ビューアのタイトル
DEFINITIONS.title = '3D地質図：富士火山地質図（第2版）';
//画面左下コピーライトGSJのリンク先
DEFINITIONS.link = 'https://gbank.gsj.jp/owscontents/contents/miscellaneous_12_detail.html';

//----------------------------------------------------------------------------------------------------
//描画領域（図郭）
//lat、lng（EPSG:4326）で指定
DEFINITIONS.area = {};
DEFINITIONS.area.nw = '35.6, 138.5';
DEFINITIONS.area.se = '35.1, 139.0';

//----------------------------------------------------------------------------------------------------
//初期設定の定義
DEFINITIONS.initial = {};
//標高強調（z伸長）の値
DEFINITIONS.initial.ex = 1;
//オーバーレイ（地質図）の不透明度
DEFINITIONS.initial.opacity = 0.7;
//初期表示するオプションレイヤー（カンマ区切り）：DEFINITIONS.overlay.layersのキーで指定
DEFINITIONS.initial.layer = '';
//断面図の不透明度
DEFINITIONS.initial.section = 0.7;
//視点位置（視点の傾きの設定不可：デフォルトは水平）
DEFINITIONS.initial.camera = '35.0339,138.7509,15000';
//背景地図（背景地図を示すキー文字列を指定）
DEFINITIONS.initial.base = 'hillshademap';
//合成モード（合成モード関数を示すキー文字列を指定）
DEFINITIONS.initial.mode = 'norm';
//ワイヤーフレーム表示
DEFINITIONS.initial.wire = false;
//水平維持
DEFINITIONS.initial.keephorizon = true;
//自動回転（falseで固定）
DEFINITIONS.initial.autorotation = false;

//----------------------------------------------------------------------------------------------------
//three.jsに関する定義
DEFINITIONS.three = {};
//描画先要素id
DEFINITIONS.three.elementId = 'webgl';
//3軸の長さ（0で非表示）
DEFINITIONS.three.axis = 0;
//カメラ（視点の設定）
DEFINITIONS.three.camera = {};
//カメラの画角
DEFINITIONS.three.camera.fov = 75;
//カメラ表示最近距離（視点と対象との距離がコレより近いと表示しない）
DEFINITIONS.three.camera.near = 0.1;
//カメラ表示最遠距離（視点と対象との距離がコレより遠いと表示しない）
DEFINITIONS.three.camera.far = 100000;
//環境光の設定
DEFINITIONS.three.ambientLight = {};
//環境光の色
DEFINITIONS.three.ambientLight.color = 0x999999;
//環境光の強さ（0で環境光なし）
DEFINITIONS.three.ambientLight.intensity = 1.0;
//指向性光の設定
DEFINITIONS.three.directionalLight = {};
//指向性光の色
DEFINITIONS.three.directionalLight.color = 0xffffff;
//指向性光の強度
DEFINITIONS.three.directionalLight.intensity = 1.1;
//指向性光の照射方向（この方向から照射）
DEFINITIONS.three.directionalLight.position = { 'x' : 1, 'y' : -1, 'z' : 0.3 };
//レンダリングに関する設定
DEFINITIONS.three.renderer = {};
//背景色
DEFINITIONS.three.renderer.clearColor = 0x7ca2d2;

//----------------------------------------------------------------------------------------------------
//地質図クリックで表示するマーカーの設定
DEFINITIONS.three.ping = {};
//pingの色
DEFINITIONS.three.ping.color = 0xffff00;
//pingの球部分の設定
DEFINITIONS.three.ping.sphere = {
									'radius'	: 90
								};
//pingの円錐部分の設定
DEFINITIONS.three.ping.cone = {
									'radius'	: 40,
									'height'	: 250
								};

//----------------------------------------------------------------------------------------------------
//DEMの設定（png標高タイル）
DEFINITIONS.dem = {};
DEFINITIONS.dem.zoom	= 11;
DEFINITIONS.dem.url		= 'https://gbank.gsj.jp/tiles/elev/gsi10m/{z}/{y}/{x}.png';

//----------------------------------------------------------------------------------------------------
//背景地図の設定（地理院タイル）
DEFINITIONS.base = {};
DEFINITIONS.base.zoom	= 13;
DEFINITIONS.base.layers	= {};
DEFINITIONS.base.layers.std = {
									'name'	: '標準地図',
									'url'	: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
								};
DEFINITIONS.base.layers.seamlessphoto = {
									'name'	: '空中写真',
									'url'	: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
								};
DEFINITIONS.base.layers.hillshademap = {
									'name'	: '陰影起伏図',
									'url'	: 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'
								};
DEFINITIONS.base.layers.slopemap = {
									'name'	: '傾斜量図',
									'url'	: 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'
								};
DEFINITIONS.base.layers.blankmap = {
									'name'	: '背景地図なし',
									'url'	: false
								};

//----------------------------------------------------------------------------------------------------
//オーバーレイ
//wms
DEFINITIONS.overlay = {
							'type'		: 'wms',
							'options'	: {
											'area'			: false,
											'url'			: 'https://gbank.gsj.jp/ows/miscellaneous_00012?',//need "?"
											'parameters'	: {
																	'version'		: '1.3.0',
																	'service'		: 'WMS',
																	'request'		: 'GetMap',
																	'layers'		: 'geo_A',
																	'crs'			: 'EPSG:3857',//タイルサービスのEPSG:3857に合わせる
																	'format'		: 'image/png',
																	'transparent'	: 'true',
																	'width'			: false,//計算で求める
																	'height'		: false,//計算で求める
																	'bbox'			: false,//計算で求める
																}
											},
							'click'		: {
											'request'		: 'GetFeatureInfo',
											'query_layers'	: 'geo_A',
											'info_format'	: 'text/html',
											'i'				: false,//計算で求める
											'j'				: false//計算で求める
											},
							'layers'	: false
						};

//----------------------------------------------------------------------
//断面
DEFINITIONS.sections = false;
