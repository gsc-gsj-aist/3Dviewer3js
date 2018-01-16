//----------------------------------------------------------------------------------------------------
//定義格納要のオブジェクト
var DEFINITIONS = {};

//----------------------------------------------------------------------------------------------------
//ビューアのタイトル
DEFINITIONS.title = '3D地質図：火山地質図「口永良部島」（WMS）';
//画面左下コピーライトGSJのリンク先
DEFINITIONS.link = 'https://gbank.gsj.jp/owscontents/volcanoes_index.html';

//----------------------------------------------------------------------------------------------------
//描画領域（図郭）
//lat、lng（EPSG:4326）で指定
DEFINITIONS.area = {};
DEFINITIONS.area.nw = '30.510, 130.116';
DEFINITIONS.area.se = '30.397, 130.288';

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
DEFINITIONS.initial.camera = '30.3846, 130.2021, 2500';
//背景地図（背景地図を示すキー文字列を指定）
DEFINITIONS.initial.base = 'std';
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
									'radius'	: 45
								};
//pingの円錐部分の設定
DEFINITIONS.three.ping.cone = {
									'radius'	: 20,
									'height'	: 125
								};

//----------------------------------------------------------------------------------------------------
//DEMの設定（png標高タイル）
DEFINITIONS.dem = {};
DEFINITIONS.dem.zoom	= 13;
DEFINITIONS.dem.url		= 'https://gbank.gsj.jp/tiles/elev/gsi10m/{z}/{y}/{x}.png';

//----------------------------------------------------------------------------------------------------
//背景地図の設定（地理院タイル）
DEFINITIONS.base = {};
DEFINITIONS.base.zoom	= 15;
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
											'area'			: false,//緯度、経度のカンマ区切り (falseで背景地図（および標高タイル）と同じ範囲)
											'url'			: 'https://gbank.gsj.jp/ows/volcanoes_00014?',//need "?"
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
							'layers'	: {
											'geo_L'			: {
																'name'			: '地質境界等の線情報',
																'parameters'	: { 'layers' : 'geo_L' }
																},
											'ol1'			: {
																'name'			: 'オーバーレイ1 (火口、溶岩流等の線情報)',
																'parameters'	: { 'layers' : 'ol1' }
																},
											'ol2'			: {
																'name'			: 'オーバーレイ2 (等層厚線)',
																'parameters'	: { 'layers' : 'ol2' }
																},
											'sec'			: {
																'name'			: '断面線情報',
																'parameters'	: { 'layers' : 'sec' }
																},
											'pnt'			: {
																'name'			: '点で表される位置情報',
																'parameters'	: { 'layers' : 'pnt' }
																},
											'geo_A_label'	: {
																'name'			: '地質分布の面情報 (ラベル)',
																'parameters'	: { 'layers' : 'geo_A_label' }
																}
											}
						};

//----------------------------------------------------------------------
//断面
//表示させたい断面画像のパスと画像の四隅の座標 (緯度、経度、標高のカンマ区切りの文字列) を定義。ltは左上、rtは右上、lbは左下、rbは右下。

DEFINITIONS.sections = [
	{
		'image'			: './sec/s_AB_800.png',
		'coordinates'	: {
								'lt' : '30.4895, 130.1430,  526.7',
								'rt' : '30.4460, 130.2153,  526.7',
								'lb' : '30.4895, 130.1430,  -80.0',
								'rb' : '30.4460, 130.2153,  -80.0'
							}
	},
	{
		'image'			: './sec/s_BC_800.png',
		'coordinates'	: {
								'lt' : '30.4460, 130.2153,  575.6',
								'rt' : '30.4461, 130.2649,  575.6',
								'lb' : '30.4460, 130.2153,  -80.0',
								'rb' : '30.4461, 130.2649,  -80.0'
							}
	},
	{
		'image'			: './sec/s_DB_800.png',
		'coordinates'	: {
								'lt' : '30.4690, 130.2313,  607.1',
								'rt' : '30.4460, 130.2153,  607.1',
								'lb' : '30.4690, 130.2313,  -70.9',
								'rb' : '30.4460, 130.2153,  -70.9'
							}
	},
	{
		'image'			: './sec/s_BE_800.png',
		'coordinates'	: {
								'lt' : '30.4460, 130.2153,  601.5',
								'rt' : '30.4387, 130.2159,  601.5',
								'lb' : '30.4460, 130.2153,  -70.9',
								'rb' : '30.4387, 130.2159,  -70.9'
							}
	},
	{
		'image'			: './sec/s_EF_800.png',
		'coordinates'	: {
								'lt' : '30.4387, 130.2159,  587.0',
								'rt' : '30.4239, 130.2272,  587.0',
								'lb' : '30.4387, 130.2159,  -70.9',
								'rb' : '30.4239, 130.2272,  -70.9'
							}
	}
];
