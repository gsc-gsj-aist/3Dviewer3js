///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.controllers.leap.js, 2015-12-25, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		Leap Motionコントローラー
///////////////////////////////////////////////////////////////////////////////
//	残務
//		ジェスチャーの対応
//		サインの追加（人差し指以外等）

'use strict';

( function( Smap ) {

	Smap.controller = ( Smap.controller ) ? Smap.controller : {};

//
//	関数: Smap.controller.leap()
//		Leap Motionコントローラの生成
//
	Smap.controller.leap = function() {
		var
			leapController = { 
				id: 'leap',
				active: true,
				assign: {			// コマンドアサイン
					'palmPositionX': 	{ command: 'rollCameraX',	velocity: 2 },
					'palmPositionY': 	{ command: 'moveZ',			velocity: 2 },
					'palmPositionZ': 	{ command: 'near',			velocity: 0.005 },
					'palmNormZ':		{ command: 'rollCameraY',	velocity: -1 },
					'scissors':			{ command: 'resetView' },
				},
				play: 50,				// センサーのあそび(ピクセル)
				signDuration: 1000,	// サインを認識する持続時間(ms)
			},
			hand,
			sign = { type: null, start: null },		// ユーザサイン
			dpi =72,
		   	dpmm = dpi / 25.4,
			wp = 800,		//ウインドウサイズ,暫定値
			fov = 110,		// fov(360度法）,暫定値
			ph = wp / Math.tan( fov / 180 * Math.PI / 2 ) * 2;
						//ph: ピクセル高度，高度をピクセル数に換算したもの

		if ( typeof Leap == 'undefined' ){	// Leapが定義されていなければ何も返さず終了
			return;
		}

		leapController.original = new Leap.Controller();
		leapController.original.connect();
			//　contorollerは，明示的にconnect()を呼び出さないと起動しない．

		leapController.check = function(){
			var
				map = this.map,
				duration = this.signDuration,
				play = this.play,
				assign = this.assign,
			   	extendedLength = 0,		//伸びている指の数
			   	frame = this.original.frame(),
				hand = frame.hands[ 0 ];

			// operationに対応したコマンドを実行
			function exec( operation, value ){
				var
					action = assign[ operation ];

				if ( action ) {
					if ( Math.abs( value ) < play ){
						// 変位(ピクセル)がplay以下なら動作させない
						return;
					}
					if ( [ 'rollX', 'rollY', 'rollCameraX', 'rollCameraY'
							].indexOf(	action.command ) >= 0 ) {
						value = value / ph;
									// 回転系のコマンドならラジアンに変換
					}
					map.exec( action, value );
				}
			}

			// 手の状態を確認し，duration時間以上維持していたらコマンドを実行
			function checkSign( aType ){
				if ( assign[ aType ] ) {
					if ( sign.type == aType ) { // 状態を維持している
						if ( new Date() - sign.start > duration) {
							map.exec( assign[ aType ], 1, frame.timestamp );
							sign.type = null;
						}
					} else { // 状態の開始
						sign = { type: aType, start: new Date() };
					}
				}
			}

			if ( hand ) {
				var
				   	pos = hand.palmPosition,
					nor = hand.palmNormal,
					dir = hand.direction;

				if ( hand.grabStrength < 0.5 ) {	// にぎっていなければ
					// 伸びている指の数を数える
					for( var j = 0; j < hand.fingers.length; j++ ){
						if ( hand.fingers[ j ].extended ) {
							extendedLength++;
						}
					}
					if ( extendedLength > 3 ) {
						// 指が3本以上伸びていれば通常操作
						exec( 'palmPositionX', pos[0] * dpmm );
						exec( 'palmPositionY', ( pos[1] - 150 ) * dpmm );
						exec( 'palmPositionZ', pos[2] * dpmm );
						exec( 'palmNormX', Math.asin( nor[0] ) * ph );
						exec( 'palmNormY', Math.asin( nor[1] ) * ph );
						exec( 'palmNormZ', Math.asin( nor[2] ) * ph );
						exec( 'directionX', Math.asin( dir[0] ) * ph );
						exec( 'directionY', Math.asin( dir[1] ) * ph );
						exec( 'directionZ', Math.asin( dir[2] ) * ph );
						sign.type = null;
					} else if ( extendedLength == 2 ) {			// 2本指なら
						checkSign( 'twoFingers' );
						if ( hand.fingers[ 1 ].extended 
								&& hand.fingers[ 2 ].extended) {
							checkSign( 'scissors' );			// 人差し指と中指なら
						}
					} else if ( extendedLength == 1 ) {			// 1本指なら
						checkSign( 'oneFinger' );
						if ( hand.fingers[ 1 ].extended ) {		// 人差し指なら
							checkSign( 'firstFinger', 
									hand.fingers[ 1 ].tipPosition );
						}
					}
				}
			}
		}
		return leapController;
	}

} ) ( Smap );
