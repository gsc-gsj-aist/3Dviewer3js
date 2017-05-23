//----------------------------------------------------------------------------------------------------
//定義格納要のオブジェクト
var DEFINITIONS = {};

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
DEFINITIONS.baseData.elevation.urlTemplate = 'https://gbank.gsj.jp/tiles/elev/gsi10m/{z}/{y}/{x}.png';
//標高タイルで使用するズームレベル
DEFINITIONS.baseData.elevation.zoom = 10;
//背景地図の定義
DEFINITIONS.baseData.backgroundMap = {};
//背景地図タイル（地理院標準地図）のURLテンプレート
DEFINITIONS.baseData.backgroundMap.urlTemplate = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
//背景地図で使用するズームレベル
DEFINITIONS.baseData.backgroundMap.zoom = 12;

//----------------------------------------------------------------------------------------------------
//初期設定の定義
DEFINITIONS.initial = {};
//z伸長の値
DEFINITIONS.initial.zScale = 1;
//オーバーレイの不透明度
DEFINITIONS.initial.opacity = 0.7;

//----------------------------------------------------------------------------------------------------
//three.jsに関する定義
DEFINITIONS.three = {};
//描画先要素id
DEFINITIONS.three.elementId = 'wrapper';
//3軸の長さ（0で非表示）
DEFINITIONS.three.axis = 0;
//カメラ（視点の設定）
DEFINITIONS.three.camera = {};
//カメラ位置
DEFINITIONS.three.camera.position = { 'x' : 100, 'y' : -35000, 'z' : 15000 };
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
DEFINITIONS.three.ambientLight.intensity = 0.7;
//指向性光の設定
DEFINITIONS.three.directionalLight = {};
//指向性光の色
DEFINITIONS.three.directionalLight.color = 0xffffff;
//指向性光の強度
DEFINITIONS.three.directionalLight.intensity = 1.8;
//指向性光の照射方向（この方向から照射）
DEFINITIONS.three.directionalLight.position = { 'x' : 1, 'y' : -1, 'z' : 0.3 };
//レンダリングに関する設定
DEFINITIONS.three.renderer = {};
//背景色
DEFINITIONS.three.renderer.clearColor = 0x7ca2d2;
//クリック位置にpingを立てるための設定
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
DEFINITIONS.debug = false;
