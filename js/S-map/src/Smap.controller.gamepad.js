///////////////////////////////////////////////////////////////////////////////
//	モジュール : Smap.controllers.gamepad.js, 2015-10-15, 西岡 芳晴 ( NISHIOKA Yoshiharu ), 
//		ゲームパッドコントローラー
///////////////////////////////////////////////////////////////////////////////

'use strict';

( function( Smap ) {

	Smap.controller = ( Smap.controller ) ? Smap.controller : {};

//
//	関数: Smap.controller.gamepad()
//		ゲームパッドコントローラーの生成
//
	Smap.controller.gamepad = function() {
		var
			gamepadController = { 
				id: 'gamepad',
				active: true,
				assign: {
					button0:	{ command: 'near',	velocity:  1.4 },		// A Button
					button3:	{ command: 'near',	velocity: -1.4 },		// Y Button
					button4:	{ command: 'rollCameraX',	velocity: -0.6 },
					button5:	{ command: 'rollCameraX',	velocity:  0.6 },
					button6:	{ command: 'rollCameraX',	velocity: -1.8 },
					button7:	{ command: 'rollCameraX',	velocity:  1.8 },
					button12: 	{ command: 'moveY',	velocity: -200 },
					button13: 	{ command: 'moveY',	velocity:  200 },
					button14: 	{ command: 'moveX',	velocity: -200 },
					button15: 	{ command: 'moveX',	velocity:  200 },
					axes0:		{ command: 'moveX',	velocity:  600 },	
																// 左スティック左右
					axes1:		{ command: 'moveY',	velocity:  600 },
																// 左スティック前後
					axes3:		{ command: 'rollCameraY',	velocity:  0.6 },
																// 右スティック前後
					//以下の２行は暫定設定
					button1:	{ command: 'moveZ',	velocity:  400 },
					button2:	{ command: 'moveZ',	velocity: -400 },
				}
			};

		// check()メソッド, Map内のループから定期的に呼び出される
		gamepadController.check = function(){
			var
				gamepads = getGamepads();

			if ( this.active && gamepads ) {
				for ( var i = 0; i < gamepads.length; i++ ) {
					if ( gamepads[i] ) {
				        var
				        	pad = gamepads[i];

						// ボタンの状態チェック
						for( var j = 0; j < 17; j++ ) {
				            if ( pad.buttons[ j ] && pad.buttons[ j ].pressed ) {
				            	var
				            		action = this.assign[ 'button' + j ];
				            	this.map.exec( action, pad.buttons[ j ].value,
				            			pad.timestamp );
				            }
						}

						// スティックの状態チェック
						for( var j = 0; j < 4; j++ ) {
				            if ( Math.abs( pad.axes[ j ] ) > 0.01 ) {
				            									// 閾値を超えたら実行
				            	var
				            		action = this.assign[ 'axes' + j ];
				            	this.map.exec( action, pad.axes[ j ], pad.timestamp );
				            };
						}
					}
				}
			}
		}
		return gamepadController;
	}

	// 内部関数　ブラウザ互換のGamepadオブジェクトの取得
	function getGamepads () {
		var gamepads = null;
		if ( navigator.getGamepads ) {
			gamepads = navigator.getGamepads();
		} else if ( navigator.webkitGetGamepads ) {
			gamepads = navigator.webkitGetGamepads();
		}
		return gamepads;
	}

} ) ( Smap );
