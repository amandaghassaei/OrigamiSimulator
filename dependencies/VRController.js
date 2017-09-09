/**
 * @author Stewart Smith / http://stewartsmith.io
 * @author Jeff Nusz / http://custom-logic.com
 * @author Data Arts Team / https://github.com/dataarts
 */




/*


	THREE.VRController




	Why is this useful?
	1. This creates a THREE.Object3D() per gamepad and passes it to you
	through an event for inclusion in your scene. It then handles copying the
	live positions and orientations from the gamepad to this Object3D.
	2. It also broadcasts button events to you on the Object3D instance.
	For supported devices button names are mapped to the buttons array when
	possible for convenience. (And this support is easy to extend.)

	What do I have to do?
	1. Include THREE.VRController.update() in your animation loop and listen
	for the appropriate events.
	2. When you receive a controller instance -- again, just an Object3D --
	you ought to set its standingMatrix property to equal your
	controls.getStandingMatrix() and if you are expecting 3DOF controllers set
	its head property equal to your camera.


*/




    ///////////////////////
   //                   //
  //   VR Controller   //
 //                   //
///////////////////////


THREE.VRController = function( gamepad ){

	var
	supported,
	style,
	buttonNames = [],
	primaryButtonName,
	axes     = [ 0, 0 ],
	buttons  = [],
	hand     = '';


	THREE.Object3D.call( this );
	this.matrixAutoUpdate = false;


	//  These are special properties you ought to overwrite on the instance
	//  in your own code. For example:
	//    controller.standingMatrix = controls.getStandingMatrix()//  Necessary for 6DOF controllers.
	//    controller.head = camera//  Necessary for 3DOF controllers.
	//  Quick FYI: “DOF” means “Degrees of Freedom”. If you can rotate about 3 axes
	//  and also move along 3 axes then 3 + 3 = 6 degrees of freedom.

	this.standingMatrix = new THREE.Matrix4();
	this.head = {

		position:   new THREE.Vector3(),
		quaternion: new THREE.Quaternion()
	}


	//  Do we recognize this type of controller based on its gamepad.id string?
	//  If not we’ll still roll with it, just the buttons won’t be mapped.

	supported = THREE.VRController.supported[ gamepad.id ];
	if( supported !== undefined ){

		style = supported.style;
		buttonNames = supported.buttons;
		primaryButtonName = supported.primary;
	}


	//  This will allow you to listen for 'primary press began', etc.
	//  even if we don’t explicitly support this controller model.
	//  That is ... if they follow the convention of putting the primary
	//  button in position 0!.

	else primaryButtonName = 'button_0'


	//  It is crucial that we have a reference to the actual gamepad!
	//  In addition to requiring its .pose for position and orientation
	//  updates, it also gives us all the goodies like .id, .index,
	//  and maybe best of all... haptics!
	//  We’ll also add style and DOF here but not onto the actual gamepad
	//  object because that’s the browser’s territory.

	this.gamepad      = gamepad;
	this.gamepadStyle = style;
	this.gamepadDOF   = ( +gamepad.pose.hasOrientation + +gamepad.pose.hasPosition ) * 3;
	this.name         = gamepad.id;


	//  Setup axes and button states so we can watch for change events.
	//  If we have english names for these buttons that’s great.
	//  If not... We’ll just roll with it because trying is important :)

	gamepad.buttons.forEach( function( button, i ){

		buttons[ i ] = {

			name:      buttonNames[ i ] !== undefined ? buttonNames[ i ] : 'button_'+ i,
			value:     button.value,
			isTouched: button.touched,
			isPressed: button.pressed
		}
	})
	this.listenForButtonEvents = function(){

		var
		verbosity  = THREE.VRController.verbosity,
		controller = this,
		prefix = '> #'+ controller.gamepad.index +' '+ controller.gamepad.id +' ('+ controller.gamepad.hand +') ';


		//  Did the handedness change?

		if( hand !== controller.gamepad.hand ){

			if( verbosity >= 0.5 ) console.log( prefix +'hand changed from "'+ hand +'" to "'+ controller.gamepad.hand +'"' );
			hand = controller.gamepad.hand;
			controller.dispatchEvent({ type: 'hand changed', hand: hand });
		}


		//  Did any axes (assuming a 2D trackpad) values change?

		if( axes[ 0 ] !== gamepad.axes[ 0 ] || axes[ 1 ] !== gamepad.axes[ 1 ]){

			axes[ 0 ] = gamepad.axes[ 0 ];
			axes[ 1 ] = gamepad.axes[ 1 ];
			if( verbosity >= 0.5 ) console.log( prefix +'axes changed', axes );
			controller.dispatchEvent({ type: 'axes changed', axes: axes });
		}


		//  Did any button states change?

		buttons.forEach( function( button, i ){

			var
			prefixFull = prefix + button.name +' ',
			isPrimary  = button.name === primaryButtonName ? ' isPrimary!' : '',
			suffix;

			if( button.value !== gamepad.buttons[ i ].value ){

				button.value = gamepad.buttons[ i ].value;
				if( verbosity >= 0.5 ) console.log( prefixFull +'value changed'+ isPrimary, button.value );
				controller.dispatchEvent({ type: button.name  +' value changed', value: button.value });
				if( isPrimary !== '' ) controller.dispatchEvent({ type: 'primary value changed', value: button.value });
			}
			if( button.isTouched !== gamepad.buttons[ i ].touched ){

				button.isTouched = gamepad.buttons[ i ].touched;
				suffix = ' ' + ( button.isTouched ? 'began' : 'ended' );
				if( verbosity >= 0.5 ) console.log( prefixFull +'touch'+ suffix + isPrimary );
				controller.dispatchEvent({ type: button.name  +' touch'+ suffix });
				if( isPrimary !== '' ) controller.dispatchEvent({ type: 'primary touch'+ suffix });
			}
			if( button.isPressed !== gamepad.buttons[ i ].pressed ){

				button.isPressed = gamepad.buttons[ i ].pressed;
				suffix = ' ' + ( button.isPressed ? 'began' : 'ended' );
				if( verbosity >= 0.5 ) console.log( prefixFull +'press'+ suffix + isPrimary );
				controller.dispatchEvent({ type: button.name  +' press'+ suffix });
				if( isPrimary !== '' ) controller.dispatchEvent({ type: 'primary press'+ suffix });
			}
		})
	}


	//  Ok, we’ve got button events covered.
	//  But what if you want to react to something WHILE or AS LONG AS a button is pressed?
	//  Sure, you could set up your own trip boolean and use the above events....
	//  Or you could just check the button’s current state yourself in your update loop!

	this.getButton = function( buttonNameOrIndex ){

		if( typeof buttonNameOrIndex === 'number' ) return buttons[ buttonNameOrIndex ]
		else if( typeof buttonNameOrIndex === 'string' ){

			if( buttonNameOrIndex === 'primary' ) buttonNameOrIndex = primaryButtonName
			return buttons.find( function( button ){

				return button.name === buttonNameOrIndex
			})
		}
	}
}
THREE.VRController.prototype = Object.create( THREE.Object3D.prototype );
THREE.VRController.prototype.constructor = THREE.VRController;




//  Update the position, orientation, and button states,
//  fire button events if nessary.

THREE.VRController.prototype.update = function(){

	var
	gamepad = this.gamepad,
	pose = gamepad.pose;


	//  ORIENTATION.
	//  Everyone should have this -- this is expected of 3DOF controllers.
	//  If we don’t have it this could mean we’re in the process of losing tracking.
	//  Fallback plan is just to retain the previous orientation data.
	//  If somehow we never had orientation data it will use the default
	//  THREE.Quaternion our controller’s Object3D was initialized with.

	if( pose.orientation !== null ) this.quaternion.fromArray( pose.orientation );


	//  POSITION -- EXISTS!
	//  If we have position data then we can assume we also have orientation
	//  because this is the expected behavior of 6DOF controllers.
	//  If we don’t have orientation it will just use the previous orientation data.

	if( pose.position !== null ){

		this.position.fromArray( pose.position );
		this.matrix.compose( this.position, this.quaternion, this.scale );
	}


	//  POSITION -- NOPE ;(
	//  But if we don’t have position data we’ll assume our controller is only 3DOF
	//  and use an arm model that takes head position and orientation into account.
	//  So don’t forget to set controller.head to reference your VR camera so we can
	//  do the following math.

	else {


		//  If this is our first go-round with a 3DOF this then we’ll need to
		//  create the arm model.

		if( this.armModel === undefined ) this.armModel = new OrientationArmModel();


		//  Now and forever after we can just update this arm model
		//  with the head (camera) position and orientation
		//  and use its output to predict where the this is.

		this.armModel.setHeadPosition( this.head.position );
		this.armModel.setHeadOrientation( this.head.quaternion );
		this.armModel.setControllerOrientation(( new THREE.Quaternion() ).fromArray( pose.orientation ));
		this.armModel.update();
		this.matrix.compose(

			this.armModel.getPose().position,
			this.armModel.getPose().orientation,
			this.scale
		);
	}


	//  Ok, we know where the this ought to be so let’s set that.
	//  For 6DOF controllers it’s necessary to set controller.standingMatrix
	//  to reference your VRControls.standingMatrix, otherwise your controllers
	//  will be on the floor instead of up in your hands!
	//  NOTE: “VRControls” and “VRController” are similarly named but two
	//  totally different things! VRControls is what reads your headset’s
	//  position and orientation, then moves your camera appropriately.
	//  Whereas this VRController instance is for the VR controllers that
	//  you hold in your hands.

	this.matrix.multiplyMatrices( this.standingMatrix, this.matrix );
	this.matrixWorldNeedsUpdate = true;


	//  BUTTON EVENTS.

	this.listenForButtonEvents();


	//  If you’ve ever wanted to run the same function over and over --
	//  once per update loop -- now’s your big chance.

	if( typeof this.updateCallback === 'function' ) this.updateCallback();
}




    /////////////////
   //             //
  //   Statics   //
 //             //
/////////////////


//  This makes inspecting through the console a little bit saner.

THREE.VRController.verbosity = 0;//0.5;


//  We need to keep a record of found controllers
//  and have some connection / disconnection handlers.

THREE.VRController.controllers = {};
THREE.VRController.onGamepadConnect = function( gamepad ){


	//  Let’s create a new controller object
	//  that’s really an extended THREE.Object3D
	//  and pass it a reference to this gamepad.

	var
	scope = THREE.VRController,
	controller = new scope( gamepad );


	//  We also need to store this reference somewhere so that we have a list
	//  controllers that we know need updating, and by using the gamepad.index
	//  as the key we also know which gamepads have already been found.

	scope.controllers[ gamepad.index ] = controller;


	//  Let’s give the controller a little rumble; some haptic feedback to
	//  let the user know it’s connected and happy.

	var hapticActuators = controller.gamepad.hapticActuators
	if( hapticActuators && hapticActuators[ 0 ]) hapticActuators[ 0 ].pulse( 0.1, 300 );


	//  Now we’ll broadcast a global connection event.
	//  We’re not using THREE’s dispatchEvent because this event
	//  is the means of delivering the controller instance.
	//  How would we listen for events on the controller instance
	//  if we don’t already have a reference to it?!

	if( scope.verbosity >= 0.5 ) console.log( 'vr controller connected', controller );
	window.setTimeout( function(){

		window.dispatchEvent( new CustomEvent( 'vr controller connected', { detail: controller }));

	}, 500 );
}
THREE.VRController.onGamepadDisconnect = function( gamepad ){


	//  We need to find the controller that holds the reference to this gamepad.
	//  Then we can broadcast the disconnection event on the controller itself
	//  and also overwrite our controllers object with undefined. Goodbye!
	//  When you receive this event don’t forget to remove your meshes and whatnot
	//  from your scene so you can either reuse them upon reconnect -- or you
	//  should detroy them. You don’t want memory leaks, right?

	var
	scope = THREE.VRController,
	controller = scope.controllers[ gamepad.index ];

	if( scope.verbosity >= 0.5 ) console.log( 'vr controller disconnected', controller );
	controller.dispatchEvent({ type: 'disconnected', controller: controller });
	scope.controllers[ gamepad.index ] = undefined;
}


//  This is what makes everything so convenient. We keep track of found
//  controllers right here. And by adding this one update function into your
//  animation loop we automagically update all the controller positions,
//  orientations, and button states.
//  Why not just wrap this in its own requestAnimationFrame loop? Performance!
//  https://jsperf.com/single-raf-draw-calls-vs-multiple-raf-draw-calls
//  But also, you will likely be switching between window.requestAnimationFrame
//  which aims for 60fps and vrDisplay.requestAnimationFrame which aims for 90
//  when switching between non-VR and VR rendering. This makes it trivial to
//  make the choices YOU want to.

THREE.VRController.update = function(){

	var gamepads, gamepad, i;


	//  Before we do anything we ought to see if getGamepads even exists.
	// (Perhaps in addition to actual VR rigs you’re also supporting
	//  iOS devices via magic window?) If it doesn’t exist let’s bail:

	if( navigator.getGamepads === undefined ) return;


	//  Yes, we need to scan the gamepads Array with each update loop
	//  because it is the *safest* way to detect new gamepads / lost gamepads
	//  and we avoid Doob’s proposed problem of a user accidentally including
	//  VRControllers.js multiple times if we were using the 'ongamepadconnected'
	//  and 'ongamepaddisconnected' events firing multiple times.
	//  Also... those connection events are not widely supported yet anyhow.

	gamepads = navigator.getGamepads()
	for( i = 0; i < gamepads.length; i ++ ){


		//  The Gamepad API is a funny thing. I need to write more about how it works
		//  in actual practice but for brevity here I’ll just say we won’t outright
		//  accept what the API tells us exists. (It can create ghost controllers!)
		//  Instead we will consider a Gamepad exists only when it is reported by the
		//  API and it ALSO has a not-null position or not-null orientation.

		//  We could probably change this to “if( gamepad instanceof Gamepad )” but
		//  dealing with these things across browsers and devices has made me extra
		//  paranoid. Best to just verify the pose object is really there.

		gamepad = gamepads[ i ];
		if( gamepad      !== undefined &&//  Just for you, Microsoft Edge!
			gamepad      !== null &&     //  Meanwhile Chrome and Firefox do it this way.
			gamepad.pose !== undefined &&
			gamepad.pose !== null ){


			//  We've just confirmed that a “ready” Gamepad instance exists in this slot.
			//  If it's not already in our controllers list we need to initiate it!
			//  And either way we need to call update() on it.

			if( gamepad.pose.orientation !== null || gamepad.pose.position !== null ){

				if( this.controllers[ i ] === undefined ) THREE.VRController.onGamepadConnect( gamepad );
				this.controllers[ i ].update();
			}


			//  If we've lost orientation and position then we've lost this controller.
			//  Unfortunately we cannot rely on gamepad.connected because it will ALWAYS
			//  equal true -- even if you power down the controller!
			//  That doesn’t seem like the API’s intended behavior but it’s what I see in practice.

			else if( this.controllers[ i ] !== undefined ) THREE.VRController.onGamepadDisconnect( gamepad );
		}
	}
}




    /////////////////
   //             //
  //   Support   //
 //             //
/////////////////


//  Let’s take an ID string as reported directly from the gamepad API,
//  translate that to a more generic “style name”
//  and also see if we can’t map some names to the buttons!
//  (This stuff was definitely fun to figure out.)

THREE.VRController.supported = {

	'Daydream Controller': {

		style: 'daydream',


		//  Daydream’s thumbpad is both a 2D trackpad and a button.
		//  X axis: -1 = Left, +1 = Right
		//  Y axis: -1 = Top,  +1 = Bottom  NOTE THIS IS FLIPPED FROM VIVE!

		buttons: [ 'thumbpad' ],
		primary: 'thumbpad'
	},
	'OpenVR Gamepad': {

		style: 'vive',
		buttons: [


			//  Vive’s thumpad is both a 2D trackpad and a button. We can
			//  1. touch it -- simply make contact with the trackpad (binary)
			//  2. press it -- apply force to depress the button (binary)
			//  3. get XY values for the point of contact on the trackpad.
			//  X axis: -1 = Left,   +1 = Right
			//  Y axis: -1 = Bottom, +1 = Top

			'thumbpad',


			//  Vive’s trigger offers a binary touch and a
			//  gradient of “pressed-ness” values from 0.0 to 1.0.
			//  Here’s my best guess at the trigger’s internal rules:
			//  if( value > 0.00 ) touched = true else touched = false
			//  if( value > 0.51 ) pressed = true   THRESHOLD FOR TURNING ON
			//  if( value < 0.45 ) pressed = false  THRESHOLD FOR TURNING OFF

			'trigger',


			//  Each Vive controller has two grip buttons, one on the left and one on the right.
			//  They are not distinguishable -- pressing either one will register as a press
			//  with no knowledge of which one was pressed.
			//  This value is binary, it is either touched/pressed (1) or not (0)
			//  so no need to track anything other than the pressed boolean.

			'grips',


			//  The menu button is the tiny button above the thumbpad (NOT the one below it).
			//  It’s simple; just a binary on / off press.

			'menu'
		],
		primary: 'trigger'
	},
	'Oculus Touch (Right)': {


		//  NOTE: Previously I’d named the style “Rift” and referred to this as a “Rift”
		//  in the comments because it’s so much easier to write and to say than “Oculus”.
		//  Lazy, right? But deep down in your dark heart I know you agree with me.
		//  But I changed it all to “oculus” now because that’s what both the headset and
		//  the controllers report themselves as. There’s no mention of “Rift” in those
		//  ID strings at all. I felt in the end consistency was better than ease.

		style: 'oculus',
		buttons: [


			//  Oculus’s thumbstick has axes values and is also a button,
			//  with touch and press states similar to Vive’s thumbpad.
			//  X axis: -1 = Left, +1 = Right
			//  Y axis: -1 = Top,  +1 = Bottom  NOTE THIS IS FLIPPED FROM VIVE!

			'thumbstick',


			//  Oculus’s trigger is twitchier than Vive’s.
			//  Compare these threshold guesses to Vive’s trigger:
			//  if( value > 0.1 ) pressed = true   THRESHOLD FOR TURNING ON
			//  if( value < 0.1 ) pressed = false  THRESHOLD FOR TURNING OFF

			'trigger',


			//  Oculus’s grip button follows the exact same pattern as the trigger.

			'grip',


			//  Oculus has two old-school video game buttons, A and B.
			// (For the left-hand controller these are X and Y.)
			//  They report separate binary on/off values for both touch and press.

			'A', 'B',


			//  Oculus has an inert base “button” that’s really just a resting place
			//  for your thumbs and only reports a binary on/off for touch.

			'thumbrest'
		],
		primary: 'trigger'
	},
	'Oculus Touch (Left)': {

		style: 'oculus',
		buttons: [

			'thumbstick',
			'trigger',
			'grip',
			'X', 'Y',
			'thumbrest'
		],
		primary: 'trigger'
	}
}




    ///////////////////
   //               //
  //   Arm Model   //
 //               //
///////////////////


//  Adapted from Boris’ code in a hurry -- many thanks, Mr. Smus!
//  Represents the arm model for the Daydream controller.
//  Feed it a camera and the controller. Update it on a RAF.
//  Get the model's pose using getPose().

function OrientationArmModel(){

	this.isLeftHanded = false;


	//  Current and previous controller orientations.

	this.controllerQ     = new THREE.Quaternion();
	this.lastControllerQ = new THREE.Quaternion();


	//  Current and previous head orientations.

	this.headQ = new THREE.Quaternion();


	//  Current head position.

	this.headPos = new THREE.Vector3();


	//  Positions of other joints (mostly for debugging).

	this.elbowPos = new THREE.Vector3();
	this.wristPos = new THREE.Vector3();


	//  Current and previous times the model was updated.

	this.time     = null;
	this.lastTime = null;


	//  Root rotation.

	this.rootQ = new THREE.Quaternion();


	//  Current pose that this arm model calculates.

	this.pose = {

		orientation: new THREE.Quaternion(),
		position:    new THREE.Vector3()
	}
}


//  STATICS.

Object.assign( OrientationArmModel, {

	HEAD_ELBOW_OFFSET       : new THREE.Vector3(  0.155, -0.465, -0.15 ),
	ELBOW_WRIST_OFFSET      : new THREE.Vector3(  0, 0, -0.25 ),
	WRIST_CONTROLLER_OFFSET : new THREE.Vector3(  0, 0, 0.05 ),
	ARM_EXTENSION_OFFSET    : new THREE.Vector3( -0.08, 0.14, 0.08 ),
	ELBOW_BEND_RATIO        : 0.4,//  40% elbow, 60% wrist.
	EXTENSION_RATIO_WEIGHT  : 0.4,
	MIN_ANGULAR_SPEED       : 0.61//  35˚ per second, converted to radians.
});


//  SETTERS.
//  Methods to set controller and head pose (in world coordinates).

OrientationArmModel.prototype.setControllerOrientation = function( quaternion ){

	this.lastControllerQ.copy( this.controllerQ );
	this.controllerQ.copy( quaternion );
}
OrientationArmModel.prototype.setHeadOrientation = function( quaternion ){

	this.headQ.copy( quaternion );
}
OrientationArmModel.prototype.setHeadPosition = function( position ){

	this.headPos.copy( position );
}
OrientationArmModel.prototype.setLeftHanded = function( isLeftHanded ){//  TODO(smus): Implement me!

	this.isLeftHanded = isLeftHanded;
}


/**
 * Called on a RAF.
 */
OrientationArmModel.prototype.update = function(){

	this.time = performance.now();


	//  If the controller’s angular velocity is above a certain amount,
	//  we can assume torso rotation and move the elbow joint relative
	//  to the camera orientation.

	var
	headYawQ = this.getHeadYawOrientation_(),
	timeDelta = (this.time - this.lastTime) / 1000,
	angleDelta = this.quatAngle_( this.lastControllerQ, this.controllerQ ),
	controllerAngularSpeed = angleDelta / timeDelta;

	if( controllerAngularSpeed > OrientationArmModel.MIN_ANGULAR_SPEED ){

		this.rootQ.slerp( headYawQ, angleDelta / 10 );// Attenuate the Root rotation slightly.
	}
	else this.rootQ.copy( headYawQ );


	// We want to move the elbow up and to the center as the user points the
	// controller upwards, so that they can easily see the controller and its
	// tool tips.
	var controllerEuler = new THREE.Euler().setFromQuaternion(this.controllerQ, 'YXZ');
	var controllerXDeg = THREE.Math.radToDeg(controllerEuler.x);
	var extensionRatio = this.clamp_((controllerXDeg - 11) / (50 - 11), 0, 1);

	// Controller orientation in camera space.
	var controllerCameraQ = this.rootQ.clone().inverse();
	controllerCameraQ.multiply(this.controllerQ);

	// Calculate elbow position.
	var elbowPos = this.elbowPos;
	elbowPos.copy(this.headPos).add(OrientationArmModel.HEAD_ELBOW_OFFSET);
	var elbowOffset = new THREE.Vector3().copy(OrientationArmModel.ARM_EXTENSION_OFFSET);
	elbowOffset.multiplyScalar(extensionRatio);
	elbowPos.add(elbowOffset);

	// Calculate joint angles. Generally 40% of rotation applied to elbow, 60%
	// to wrist, but if controller is raised higher, more rotation comes from
	// the wrist.
	var totalAngle = this.quatAngle_(controllerCameraQ, new THREE.Quaternion());
	var totalAngleDeg = THREE.Math.radToDeg(totalAngle);
	var lerpSuppression = 1 - Math.pow(totalAngleDeg / 180, 4); // TODO(smus): ???

	var elbowRatio = OrientationArmModel.ELBOW_BEND_RATIO;
	var wristRatio = 1 - OrientationArmModel.ELBOW_BEND_RATIO;
	var lerpValue = lerpSuppression *
			(elbowRatio + wristRatio * extensionRatio * OrientationArmModel.EXTENSION_RATIO_WEIGHT);

	var wristQ = new THREE.Quaternion().slerp(controllerCameraQ, lerpValue);
	var invWristQ = wristQ.inverse();
	var elbowQ = controllerCameraQ.clone().multiply(invWristQ);

	// Calculate our final controller position based on all our joint rotations
	// and lengths.
	/*
	position_ =
		root_rot_ * (
			controller_root_offset_ +
2:      (arm_extension_ * amt_extension) +
1:      elbow_rot * (kControllerForearm + (wrist_rot * kControllerPosition))
		);
	*/
	var wristPos = this.wristPos;
	wristPos.copy(OrientationArmModel.WRIST_CONTROLLER_OFFSET);
	wristPos.applyQuaternion(wristQ);
	wristPos.add(OrientationArmModel.ELBOW_WRIST_OFFSET);
	wristPos.applyQuaternion(elbowQ);
	wristPos.add(this.elbowPos);

	var offset = new THREE.Vector3().copy(OrientationArmModel.ARM_EXTENSION_OFFSET);
	offset.multiplyScalar(extensionRatio);

	var position = new THREE.Vector3().copy(this.wristPos);
	position.add(offset);
	position.applyQuaternion(this.rootQ);

	var orientation = new THREE.Quaternion().copy(this.controllerQ);


	//  Set the resulting pose orientation and position.

	this.pose.orientation.copy( orientation );
	this.pose.position.copy( position );

	this.lastTime = this.time;
}




//  GETTERS.
//  Returns the pose calculated by the model.

OrientationArmModel.prototype.getPose = function(){

	return this.pose;
}


//  Debug methods for rendering the arm model.

OrientationArmModel.prototype.getForearmLength = function(){

	return OrientationArmModel.ELBOW_WRIST_OFFSET.length();
}
OrientationArmModel.prototype.getElbowPosition = function(){

	var out = this.elbowPos.clone();

	return out.applyQuaternion( this.rootQ );
}
OrientationArmModel.prototype.getWristPosition = function(){

	var out = this.wristPos.clone();

	return out.applyQuaternion( this.rootQ );
}
OrientationArmModel.prototype.getHeadYawOrientation_ = function(){

	var
	headEuler = new THREE.Euler().setFromQuaternion( this.headQ, 'YXZ' ),
	destinationQ;

	headEuler.x  = 0;
	headEuler.z  = 0;
	destinationQ = new THREE.Quaternion().setFromEuler( headEuler );
	return destinationQ;
}


//  General tools...

OrientationArmModel.prototype.clamp_ = function( value, min, max ){

	return Math.min( Math.max( value, min ), max );
}
OrientationArmModel.prototype.quatAngle_ = function( q1, q2 ){

	var
	vec1 = new THREE.Vector3( 0, 0, -1 ),
	vec2 = new THREE.Vector3( 0, 0, -1 );

	vec1.applyQuaternion( q1 );
	vec2.applyQuaternion( q2 );
	return vec1.angleTo( vec2 );
}
