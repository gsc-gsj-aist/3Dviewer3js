# Geologic-Map-3D-viewer
*概要*  
three.jsで地質図を3D表示し、メタ情報を取得するページのソースコードの例

　産総研知的財産管理番号：H29PRO-2086

本例では、three.js使って3D地質図を表示します。ここでは、three.jsのほか、複数のオープンソースライブラリの機能を利用して地質図WMSとベース地図とを重ね合わせ、標高データを利用して3D表示を実現しています。また地質図のメタ情報 (凡例) も配信サービスで取得し、これらを地図中に小ウィンドウとして表示します。

本ソースコードの実行には、以下のオープンソースライブラリを必要とします。最新版は公式サイトよりダウンロードしてください。利用に際しては、各ライブラリのライセンスにしたがってください。

・three.js　(MIT License)  
・jQuery (MIT License)  
・S-map (Apache Licenses 2.0)  
・Proj4js (MIT License)  
・GeoLib (MIT License)  
・Leaflet (BSD License)  
・jQuery UI (MIT License)

本ソースコードのライセンスについては、「GitHubアカウント「gsc-gsj-aist」について」をご確認ください。  
https://github.com/gsc-gsj-aist/About-this-account
