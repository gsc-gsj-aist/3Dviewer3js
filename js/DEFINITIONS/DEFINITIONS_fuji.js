//----------------------------------------------------------------------------------------------------
//定義格納要のオブジェクト
var DEFINITIONS = {};

//----------------------------------------------------------------------------------------------------
//ビューアのタイトル
DEFINITIONS.title = '3D地質図：富士火山地質図（第2版）';

//----------------------------------------------------------------------------------------------------
//描画領域（図郭）
//lat、lng（EPSG:4326）で指定
DEFINITIONS.area = {};
DEFINITIONS.area.nwLatLng = { 'lat' : 35.6, 'lng' : 138.3 };
DEFINITIONS.area.seLatLng = { 'lat' : 35.1, 'lng' : 139.2 };

//----------------------------------------------------------------------------------------------------
//WMSの定義
DEFINITIONS.wms = {};
//WMSのGetMapの定義
DEFINITIONS.wms.getMap = {};
//URLの指定（念のためGetMapとGetFeatureInfoで別々のURLを指定できるようにしてある）
//DEFINITIONS.wms.getMap.url = 'https://gbankdev.gsj.jp/ows/miscellaneous_00012?';//末尾に「?」
DEFINITIONS.wms.getMap.url = 'https://gbank.gsj.jp/ows/miscellaneous_00012?';//末尾に「?」
//リクエスト用のパラメータ
//crsは基本的にEPSG:3857を指定する必要がある（背景地図タイル、標高タイルがEPSG:3857）。
//但し諸事情によりEPSG:4326を使う場合もあり
DEFINITIONS.wms.getMap.parameters = {
										'version'		: '1.3.0',
										'service'		: 'WMS',
										'request'		: 'GetMap',
										'layers'		: 'geo_A',
										'crs'			: 'EPSG:3857',
										'format'		: 'image/png',
										'transparent'	: 'true'
										//bbox,width,heightは計算で求める
									};
//WMSのGetFeatureInfoの定義
DEFINITIONS.wms.getFeatureInfo = {};
//URLの指定（通常はGetMapと同じURL）
DEFINITIONS.wms.getFeatureInfo.url = DEFINITIONS.wms.getMap.url;
//リクエスト用のパラメータ（GetMapのパラメータに下記パラメータを追加・上書きしてリクエストに使用する）
DEFINITIONS.wms.getFeatureInfo.parameters = {
										'version'		: '1.3.0',
										'service'		: 'WMS',
										'request'		: 'GetFeatureInfo',
										'query_layers'	: 'geo_A',
										'info_format'	: 'text/html'
										//i,jは動的mmap_request_partはGetMapを継承
									};

//----------------------------------------------------------------------------------------------------
//基本データの定義
DEFINITIONS.baseData = {};

//標高データの定義
DEFINITIONS.baseData.elevation = {};
//PNG標高タイルのURLテンプレート
//DEFINITIONS.baseData.elevation.urlTemplate = 'https://gbankdev.gsj.jp/seamless/elev2/elev/gsi10m/{z}/{y}/{x}.png';
DEFINITIONS.baseData.elevation.urlTemplate = 'https://gbank.gsj.jp/tiles/elev/gsi10m/{z}/{y}/{x}.png';
//標高タイルで使用するズームレベル
DEFINITIONS.baseData.elevation.zoom = 10;

//背景地図の定義
DEFINITIONS.baseData.backgroundMap = {};
//背景地図で使用するズームレベル
DEFINITIONS.baseData.backgroundMap.zoom = 12;
//背景地図で利用できるタイル
DEFINITIONS.baseData.backgroundMap.basemaps = {};
DEFINITIONS.baseData.backgroundMap.basemaps.std = {
													'name' : '標準地図',
													'urlTemplate' : 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
												};
DEFINITIONS.baseData.backgroundMap.basemaps.seamlessphoto = {
													'name' : '空中写真',
													'urlTemplate' : 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'
												};
DEFINITIONS.baseData.backgroundMap.basemaps.hillshademap = {
													'name' : '陰影起伏図',
													'urlTemplate' : 'https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'
												};
DEFINITIONS.baseData.backgroundMap.basemaps.slopemap = {
													'name' : '傾斜量図',
													'urlTemplate' : 'https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'
												};

//----------------------------------------------------------------------------------------------------
//初期設定の定義
DEFINITIONS.initial = {};
//標高強調（z伸長）の値
DEFINITIONS.initial.ex = 1;
//オーバーレイ（地質図）の不透明度
DEFINITIONS.initial.opacity = 0.7;
//視点位置（視点の傾きの設定不可：デフォルトは水平）
DEFINITIONS.initial.camera = '35.0339,138.7509,15000';
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
//視点位置を指定しなかった場合のデフォルト値（変更の必要なし）
//視点位置を決める際、DEFINITIONS.initial.cameraをコメントアウトした場合に使用される
DEFINITIONS.nocameraxyz = { 'x' : 0, 'y' : -3000, 'z' : 10000 };

//----------------------------------------------------------------------------------------------------
//three.jsに関する定義
DEFINITIONS.three = {};
//描画先要素id
DEFINITIONS.three.elementId = 'webgl';
//3軸の長さ（0で非表示）
DEFINITIONS.three.axis = 0;
//カメラ（視点の設定）
DEFINITIONS.three.camera = {};
//カメラ位置（初期設定に移動）
//DEFINITIONS.three.camera.position = { 'x' : 100, 'y' : -35000, 'z' : 15000 };
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
//DEFINITIONS.three.ambientLight.intensity = 0.7;
DEFINITIONS.three.ambientLight.intensity = 1.0;
//指向性光の設定
DEFINITIONS.three.directionalLight = {};
//指向性光の色
DEFINITIONS.three.directionalLight.color = 0xffffff;
//指向性光の強度
//DEFINITIONS.three.directionalLight.intensity = 1.8;
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
//デバッグモード（カメラ位置取得ツールインストール）
//DEFINITIONS.debug = false;
