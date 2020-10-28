//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// RotatingTranslatedTriangle.js (c) 2012 matsuda
//
// jtRotatingTranslatedTriangle.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//		(converted to 2D->4D; 3 verts --> 6 verts, 2 triangles arranged as long 
// 		(rectangle with small gap fills one single Vertex Buffer Object (VBO);
//		(draw same rectangle over and over, but with different matrix tranforms
//		(found from a tree of transformations to construct a jointed 'robot arm'
// SA
//	NormalRobotArm.js  (no change)

// Vertex shader program----------------------------------
var VSHADER_SOURCE =
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';
// Each instance computes all the on-screen attributes for just one VERTEX,
// specifying that vertex so that it can be used as part of a drawing primitive
// depicted in the CVV coord. system (+/-1, +/-1, +/-1) that fills our HTML5
// 'canvas' object.  The program gets all its info for that vertex through the
// 'attribute vec4' variable a_Position, which feeds it values for one vertex 
// taken from from the Vertex Buffer Object (VBO) we created inside the graphics
// hardware by calling the 'initVertexBuffers()' function.
//
//    ?What other vertex attributes can you set within a Vertex Shader? Color?
//    surface normal? texture coordinates?
//    ?How could you set each of these attributes separately for each vertex in
//    our VBO?  Could you store them in the VBO? Use them in the Vertex Shader?

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
 //  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';
//  Each instance computes all the on-screen attributes for just one PIXEL.
// here we do the bare minimum: if we draw any part of any drawing primitive in 
// any pixel, we simply set that pixel to the constant color specified here.


// Global Variable -- Rotation angle rate (degrees/second)
var ANGLE_STEP = 45.0;              // angle change rate for open the umbrella

var g_last = Date.now();    			// Timestamp for most-recently-drawn image; 
                                    // in milliseconds; used by 'animate()' fcn 
                                    // (now called 'timerAll()' ) to find time
                                    // elapsed since last on-screen image.
var g_angle01 = 0;                  // initial rotation angle for left/right rotation of robot arm
var g_angle01Rate = 20.0;           // rotation speed, in degrees/second 
var g_angle02 = 0;                  // initial rotation angle for inward/outward rotation of robot arm
var g_angle02Rate = 10.0;           // rotation speed, in degrees/second
var g_angle03 = 0;                  // initial rotation angle for inward/outward rotation of snowman arm
var g_angle03Rate = 90.0;           // rotation speed, in degrees/second 
var g_angle04 = 0;                  // initial rotation angle for left/right rotation of snowman arm
var g_angle04Rate = 20.0;           // rotation speed, in degrees/second 

window.addEventListener("keydown", myKeyDown, false);
window.addEventListener("mousedown", myMouseDown); 
window.addEventListener("mousemove", myMouseMove); 
window.addEventListener("mouseup", myMouseUp);

var canvas = document.getElementById('webgl');
var gl =  getWebGLContext(canvas);;
var tn = 0;                        // total number of vertices
var modelMatrix = new Matrix4();
var u_ModelMatrix = null;
var umb_flag = 0;                  // 0:umbrella is not in use. 1:umbrella is openning. 2:umbrella is in use.

var angleJ = 25.0;      // angle for opening the umberlla
var g_isDrag = false;		// mouse-drag: true when user move mouse
var g_isClick = false;  // mouse-click: true when user holds down mouse button
var g_xMclik = 0.0;			// last mouse button-down position. For drag.
var g_xClick = 0.0;			// last mouse button-down position. For click.
var	g_yClick = 0.0;     // last mouse button-down position. For click.
var g_xMdragTot = 0.0;	// total (accumulated) mouse-drag amounts.

var cn = 0;             // cylinder vertices number.
var wn = 0;             // waterdrop vertices number.
var sn = 0;             // sphere vertices number.

var rainPosition = new Float32Array(200);
var waterDropLevel = new Float32Array([0,0,0,0,0,0,0,0]);          //0: no waterdrop; 1: small waterdrop; 2:big waterdrop; 3:drop from the umbrella; 4:fly away because of rotation
var waterDropPosition = new Float32Array([0,0,0,0,0,0,0,0]);       //position of falling waterdrop

var meltLevel = 0;            // level of melt;
var melt = 1;                 // decrease with time if meltLevel is not 0;
var meltCounter = 0;          // time counter for melting;

var redRust = 0.0;
var blackRust = 0.0;
var vertexBuffer = gl.createBuffer();

function main() {
//==============================================================================
  // Retrieve <canvas> element

  // Get the rendering context for WebGL
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Write the positions of vertices into an array, transfer
  // array contents to a Vertex Buffer Object created in the
  // graphics hardware.
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.7, 0.7, 0.7, 1);
  gl.enable(gl.DEPTH_TEST);
  // Get storage location of u_ModelMatrix
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  tick();
}

  // Start drawing
  function tick() {
    if(umb_flag == 1) { //if umbrella is opening
    	angleJ = animate(angleJ);  // Update the rotation angle
      if(angleJ < 25.0) angleJ = 25.0;
      else if(angleJ >65.0) {
        angleJ = 65.0;
        umb_flag = 2;  // is opened
      }
    }
    draw();   // Draw the triangle
    requestAnimationFrame(tick, canvas);   // Request that the browser ?calls tick
  };

function initVertexBuffers(gl) {
//==============================================================================
  var vertices = new Float32Array ([
     -0.05, 0.00, 0.05, 1.00,		0.3, 	0.3,	0.3,//robot arm
     0.05, 0.00, 0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05,  0.50, 0.05, 1.00,   0.3,  0.3, 0.3,
     0.05, 0.00, 0.05, 1.00,		0.3, 	0.3,	0.3,
     0.05, 0.50, 0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05, 0.50, 0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05, 0.00, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05, 0.50, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05, 0.00, -0.05, 1.00,   0.3, 	0.3,	0.3,
     -0.05, 0.00, -0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05, 0.50, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05, 0.50, -0.05, 1.00,   0.3, 	0.3,	0.3,
     -0.05, 0.00, -0.05, 1.00,		0.3, 	0.3,	0.3,
     -0.05,  0.50, -0.05, 1.00,   0.3,  0.3,  0.3,
     0.05, 0.00, -0.05, 1.00,    0.3,  0.3,  0.3,
     0.05, 0.00, -0.05, 1.00,		0.3, 	0.3,	0.3,
     -0.05, 0.50, -0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.50, -0.05, 1.00,    0.3,  0.3,  0.3,
     0.05, 0.00, 0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.00, -0.05, 1.00,   0.3, 	0.3,	0.3,
     0.05, 0.50, 0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.00, -0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.50, -0.05, 1.00,   0.3, 	0.3,	0.3,
     0.05, 0.50, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05, 0.00, 0.05, 1.00,		0.3, 	0.3,	0.3,
     0.05, 0.00, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05,  0.00, -0.05, 1.00,   0.3, 	0.3,	0.3,
     0.05, 0.00, 0.05, 1.00,		0.3, 	0.3,	0.3,
     0.05, 0.00, -0.05, 1.00,     0.3, 	0.3,	0.3,
     -0.05, 0.00, -0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05, 0.50, 0.05, 1.00,		0.3, 	0.3,	0.3,
     0.05, 0.50, 0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05,  0.50, -0.05, 1.00,   0.3,  0.3,  0.3,
     0.05, 0.50, 0.05, 1.00,		 0.3, 	0.3,	0.3,
     0.05, 0.50, -0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05, 0.50, -0.05, 1.00,    0.3,  0.3,  0.3,
     0.00, 1.00, 0.00, 1.00,		0.2, 	0.2,	0.2,// surface of umbrella
     0.0, 0.0, -1, 1.00,    0.2,  0.2,  0.2,
     0.704, 0.704, 0.00, 1.00,    0.2,  0.2,  0.2,
  ]);
  var n = 39;   // The number of vertices

  var cylResult = makeCylinder2(0); // umbrella stick and snowman's arm
  cn = cylResult[1];
  var cylVerts = cylResult[0];
  var rainResult = makeCylinder2(1); // rain
  var rainVerts = rainResult[0];
  var waterDropResult = makeSphere2();  // waterdrop
  wn = waterDropResult[1];
  var waterDropVerts = waterDropResult[0];
	var snowmanResult = makeSphere();  // snowman
	sn = snowmanResult[1];
	var snowmanVerts = snowmanResult[0];
	var hatVerts = makeHat()[0];  // hat
	var scarfVerts = makeScarf()[0];  // scarf
  
  for (var i=0; i < 200 ;i++){
    rainPosition[i] = 2*Math.random();
  }
  var totalVertices = new Float32Array(n*7+cn*4+wn+sn);
  for (var i=0; i < n*7; i++) {
    totalVertices[i] = vertices[i];
  }
  for (var i=0; i<cn; i++) {
    totalVertices[i+n*7] = cylVerts[i];
  }
  for (var i=0; i<cn; i++) {
    totalVertices[i+n*7+cn] = rainVerts[i];
  }
  for (var i=0; i<wn; i++) {
    totalVertices[i+n*7+cn*2] = waterDropVerts[i];
  }
	for (var i=0; i<sn; i++) {
    totalVertices[i+n*7+cn*2+wn] = snowmanVerts[i];
  }
	for (var i=0; i<cn; i++) {
    totalVertices[i+n*7+cn*2+wn+sn] = hatVerts[i];
  }
	for (var i=0; i<cn; i++) {
    totalVertices[i+n*7+cn*3+wn+sn] = scarfVerts[i];
  }
  tn = n + (4*cn+wn+sn)/7;

  // Create a buffer object
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, totalVertices, gl.STATIC_DRAW);

  var FSIZE = totalVertices.BYTES_PER_ELEMENT; // how many bytes per stored value?

  // Assign the buffer object to a_Position variable
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * 7, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

/* REMOVED -- global 'g_vertsMax' means we don't need it anymore
  return nn;
*/
  return tn;
}

function myKeyDown(kev) {
	switch(kev.code) {
		case "ArrowLeft": 	
      animateKey(0);
			break;
		case "ArrowRight":
      animateKey(1);
  		break;
		case "ArrowUp":
      animateKey(2);
  		break;
		case "ArrowDown":
      animateKey(3);
  		break;
		case "KeyA":
      animateKey(4);
  		break;
		case "KeyD":
      animateKey(5);
  		break;
		case "KeyW":
      animateKey(6);
  		break;
		case "KeyS":
      animateKey(7);
  		break;
    default:
      break;
	}
}

function myMouseDown(ev) {  
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	g_xMclik = x;													// record where mouse-dragging began
	g_isClick = true;
	// report on webpage
};

function myMouseMove(ev) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  if (g_isClick == false) return;
  g_isDrag = true;
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
	// Report new mouse position & how far we moved on webpage:

	g_xMclik = x;													// Make next drag-measurement from here.
};

function myMouseUp(ev) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	if (g_isDrag == true) { // if mouse move, drag
	// accumulate any final bit of mouse-dragging we did:
		g_xMdragTot += (x - g_xMclik);
		for(var i=0; i<8 ;i++){
    	if((waterDropLevel[i] === 1)||(waterDropLevel[i] === 2)){
      	waterDropLevel[i] = 4
    	}
  	}
	}
	else { // if not move, click
		g_xClick = x;													// record where mouse-dragging began
		g_yClick = y;
		if(g_xClick > 0 && g_yClick < 0) {
			umb_flag = 1;
			g_last = Date.now();
	  	tick();
		}
	}
	g_isDrag = false;
	g_isClick = false;
};

function animateKey(direction) {
  var now = Date.now();
  var gap = now - g_last;
  g_last = now;

  var angleChange = 0; 
	if(direction < 2) {// robot arm left/right rotation
  	if (direction == 0) { 
    	angleChange = g_angle01Rate * gap / 1000;
  	}
  	else {
    	angleChange = g_angle01Rate * -1 * gap / 1000;
  	}
  	g_angle01 += angleChange;
  	if (g_angle01 > 20) g_angle01 = 20;
  	if (g_angle01 < -20) g_angle01 = -20;
	}
	else if(direction < 4) {// robot arm inward/outward rotation
		if(direction == 2) {
			angleChange = g_angle02Rate * gap / 1000;
		}
		else {
			angleChange = g_angle02Rate * -1 * gap / 1000;
		}
		g_angle02 += angleChange;
  	if (g_angle02 > 5) g_angle02 = 5;
  	if (g_angle02 < -5) g_angle02 = -5;
	}
		else if(direction < 6) {// snowman arm inward/outward rotation
		if(direction == 4) {
			angleChange = g_angle03Rate * gap / 1000;
		}
		else {
			angleChange = g_angle03Rate * -1 * gap / 1000;
		}
		g_angle03 += angleChange;
  	if (g_angle03 > 20) g_angle03 = 20;
  	if (g_angle03 < -20) g_angle03 = -20;
	}
		else {// snowman arm left/right rotation
		if(direction == 6) {
			angleChange = g_angle04Rate * gap / 1000;
		}
		else {
			angleChange = g_angle04Rate * -1 * gap / 1000;
		}
		g_angle04 += angleChange;
  	if (g_angle04 > 20) g_angle04 = 20;
  	if (g_angle04 < -20) g_angle04 = -20;
	}
}

function draw() {
//==============================================================================
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	g_last = Date.now();
  
	//timer for rust
  if(umb_flag == 0 || g_angle01 > 15){
  	if(redRust < 0.2) redRust += 0.001;
		else if (!(redRust < 0.2) && blackRust < 0.2) blackRust +=0.001
	}
	colorChange();

  //================draw rain in the background===========
  for(var i=0; i < 100; i+=2) {
    modelMatrix.setTranslate(rainPosition[i]-1,rainPosition[i+1]+1,1.0);
    rainPosition[i+1]-=0.03;
    var nowY = rainPosition[i+1]+1;
    if (nowY <= -1) rainPosition[i+1] = 1+nowY;
    modelMatrix.rotate(90,1,0,0);
    modelMatrix.scale(0.003,0.003,0.04)
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP,(cn/7+39),cn/7);
  }

  //-------Draw Lower Arm---------------
  //debugger;
  modelMatrix.setTranslate(0.4,-1, 0.0);  // 'set' means DISCARD old matrix,
  						// (drawing axes centered in CVV), and then make new
  						// drawing axes moved to the lower-left corner of CVV. 

  //modelMatrix.rotate(currentAngle, 0, 0, 1);
  modelMatrix.rotate(g_angle01, 0, 0, 1);  
  modelMatrix.rotate(-10, 0, 1, 0);  
  modelMatrix.rotate(45, 1, 0, 0);  

  //modelMatrix.rotate(3*currentAngle, 0,1,0);  // SPIN ON Y AXIS!!!
	modelMatrix.translate(-0.1, 0,0);						// Move box so that we pivot
							// around the MIDDLE of it's lower edge, and not the left corner.

  modelMatrix.scale(0.8,0.8,0.8);				// Make new drawing axes that
  // DRAW BOX:  Use this matrix to transform & draw our VBo's contents:
  		// Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  		// Draw the rectangle held in the VBO we created in initVertexBuffers().
  gl.drawArrays(gl.TRIANGLES, 0, 36);


  //-------Draw Upper Arm----------------
  modelMatrix.rotate(-45, 1, 0, 0); 
  modelMatrix.translate(-0.06, 0.37,0);	
  modelMatrix.rotate(g_angle02, 1, 0, 0);
  modelMatrix.rotate(g_xMdragTot*90, 0, 1, 0); // rotate when dragging
  //modelMatrix2.translate(0.4, 0.5, 0); 			// Make new drawing axes that
  						// we moved upwards (+y) measured in prev. drawing axes, and
  						// moved rightwards (+x) by half the width of the box we just drew.
  modelMatrix.scale(0.7,0.7,0.7);				// Make new drawing axes that
  						// are smaller that the previous drawing axes by 0.6.
  //modelMatrix.translate(-0.1, 0, 0);			// Make new drawing axes that
  						// move sideways by half the width of our rectangle model
  						// (REMEMBER! modelMatrix.scale() DIDN'T change the 
  						// the vertices of our model stored in our VBO; instead
  						// we changed the DRAWING AXES used to draw it. Thus
  						// we translate by the 0.1, not 0.1*0.6.)

  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

	// DRAW PINCERS:====================================================
	modelMatrix.translate(0.1, 0.5, 0.0);	// Make new drawing axes at 
						  // the robot's "wrist" -- at the center top of upper arm
	
	// SAVE CURRENT DRAWING AXES HERE--------------------------
	//  copy current matrix so that we can return to these same drawing axes
	// later, when we draw the UPPER jaw of the robot pincer.  HOW?
	// Try a 'push-down stack'.  We want to 'push' our current modelMatrix
	// onto the stack to save it; then later 'pop' when we're ready to draw
	// the upper pincer.
	//----------------------------------------------------------
	pushMatrix(modelMatrix);
	//-----------------------------------------------------------
	// CAUTION!  Instead of our textbook's matrix library 
	//  (WebGL Programming Guide:  
	//
	//				lib/cuon-matrix.js
	//
	// be sure your HTML file loads this MODIFIED matrix library:
	//
	//				cuon-matrix-mod.js
	// where Adrien Katsuya Tateno (your diligent classmate in EECS351)
	// has added push-down matrix-stack functions 'push' and 'pop'.
	//--------------------------------------------------------------
	//=========Draw lower jaw of robot pincer============================
	modelMatrix.rotate(-45.0, 0,0,1);		
	modelMatrix.translate(-0.05, -0.06, 0.0);
						// make new drawing axes that rotate for lower-jaw

	modelMatrix.scale(0.3, 0.3, 0.3);		// Make new drawing axes that
						// have size of just 40% of previous drawing axes,
						// (Then translate? no need--we already have the box's 
						//	left corner at the wrist-point; no change needed.)

	// Draw inner lower jaw segment:				
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

	// Now move drawing axes to the centered end of that lower-jaw segment:
	modelMatrix.translate(0.1, 0.5, 0.0);
	modelMatrix.rotate(70.0, 0,0,1);		// make bend in the lower jaw
	modelMatrix.translate(-0.1, 0.05, 0.0);	// re-center the outer segment,
	// Draw outer lower jaw segment:				
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
  
  // RETURN to the saved drawing axes at the 'wrist':
	// RETRIEVE PREVIOUSLY-SAVED DRAWING AXES HERE:
	//---------------------
	modelMatrix = popMatrix();
	//----------------------

	//=========Draw lower jaw of robot pincer============================
	// (almost identical to the way I drew the upper jaw)
	modelMatrix.rotate(45.0, 0,0,1);		
						// make new drawing axes that rotate upper jaw symmetrically
						// with lower jaw: changed sign of 15.0 and of 0.5
	modelMatrix.scale(0.3, 0.3, 0.3);		// Make new drawing axes that
						// have size of just 40% of previous drawing axes,
	modelMatrix.translate(-0.3, 0.27, 0);  // move box LEFT corner at wrist-point.
	
	// Draw inner upper jaw segment:				(same as for lower jaw)
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

	// Now move drawing axes to the centered end of that upper-jaw segment:
	modelMatrix.translate(0.03, 0.35, 0.0);
	modelMatrix.rotate(-70.0, 0,0,1);		// make bend in the upper jaw that
																			// is opposite of lower jaw (+/-40.0)
                
	modelMatrix.translate(-0.1, 0.0, 0.0);
	// Draw outer upper jaw segment:		(same as for lower jaw)		
  // DRAW BOX: Use this matrix to transform & draw our VBO's contents:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
  
	//==========Draw umbrella stick====================================
	modelMatrix.translate(0.2, 0.5, 0.0);
	modelMatrix.rotate(25.0, 0,0,1);		
	modelMatrix.rotate(90.0,1,0,0);	
	modelMatrix.scale(0.2, 0.2, 0.2);		// Make new drawing axes that	
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 39, cn/7);

	pushMatrix(modelMatrix);

	modelMatrix.translate(0.0, 0.0, -18);
	modelMatrix.scale(0.5, 0.5, 19);		// Make new drawing axes that	
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 39, cn/7);
  
	//==========Draw umbrella bones===================================
  for (var i = 0; i < 8; i++) {
	  modelMatrix = popMatrix();
	  pushMatrix(modelMatrix);
	  modelMatrix.translate(Math.cos(Math.PI/180*i*45.0)*14.20*Math.sin(Math.PI/180*angleJ), Math.sin(Math.PI/180*i*45.0)*14.20*Math.sin(Math.PI/180*angleJ), -21-14.20*(1-Math.cos(Math.PI/180*angleJ)));// moves when openging the umbrella
	  modelMatrix.rotate(i*45.0, 0,0,1);		
	  modelMatrix.rotate(angleJ,0,1,0);		
	  modelMatrix.scale(0.3, 0.3, 15);		// Make new drawing axes that	
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 39, cn/7);
    if(waterDropLevel[i] != 3){
      var r = Math.random();
      if(r > 0.99){
        waterDropLevel[i]++;
      }
    }
		//=============draw waterdrops in different level===================
    if(!(waterDropLevel[i] === 0)){
      if(waterDropLevel[i] === 1) {
        modelMatrix.translate(-1,0,0.99);
        modelMatrix.rotate(180,0,1,0);
        modelMatrix.scale(1.0,1.0,0.02);
        modelMatrix.rotate(-angleJ,0,1,0);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP,(2*cn/7+39),wn/7);
      }
      else if(waterDropLevel[i] === 2){
        modelMatrix.translate(-1,0,1);
        modelMatrix.rotate(180,0,1,0);
        modelMatrix.scale(1.5,1.5,0.03);
        modelMatrix.rotate(-angleJ,0,1,0);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP,(2*cn/7+39),wn/7);
      }
      else if(waterDropLevel[i] === 3){
        modelMatrix.translate(-1,0,1);
        waterDropPosition[i]+=2.5;
        modelMatrix.rotate(180,0,1,0);
        modelMatrix.scale(1.5,1.5,0.03);
        modelMatrix.rotate(-angleJ,0,1,0);
        modelMatrix.rotate(-g_angle01, -Math.sin(Math.PI/180*i*45), Math.cos(Math.PI/180*i*45), 0);  
        modelMatrix.translate(0,0,-waterDropPosition[i]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP,(2*cn/7+39),wn/7);
        if(waterDropPosition[i] > 150){
          waterDropPosition[i] = 0;
          waterDropLevel[i] = 0;
        }
      }
        else if(waterDropLevel[i] === 4){
        modelMatrix.translate(-1,0,1+waterDropPosition[i]);
        waterDropPosition[i]+=0.07;
        modelMatrix.rotate(180,0,1,0);
        modelMatrix.scale(1.5,1.5,0.03);
        modelMatrix.rotate(-angleJ,0,1,0);
        modelMatrix.rotate(-g_xMdragTot*90, 0, 0, 1);
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_STRIP,(2*cn/7+39),wn/7);
        if(waterDropPosition[i] > 1.0){
          waterDropPosition[i] = 0;
          waterDropLevel[i] = 0;
        }
      }
    }
  }
  //==============draw the surface of umbrella===================
  modelMatrix = popMatrix();
	pushMatrix(modelMatrix);
	modelMatrix.translate(0.0, 0.0,-34.5+27.6*Math.cos(Math.PI/180*angleJ)-0.3*Math.sin(Math.PI/180*angleJ));
  modelMatrix.scale(Math.sin(Math.PI/180*angleJ), Math.sin(Math.PI/180*angleJ), Math.cos(Math.PI/180*angleJ));	
  modelMatrix.scale(28, 28, 28);		// Make new drawing axes that	
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 36, 3);

  for(var i = 0; i < 7; i++) {
	modelMatrix.rotate(45.0, 0,0,1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 36, 3);
	}
  
  //=============evaluating melt level==========================
	if((umb_flag == 0 || g_angle01 < 15) && !((meltLevel/10 + melt) > 1) && meltLevel < 2){
		meltCounter += 0.005;
	}

	if(meltCounter > 1 && !(meltCounter > 2)) meltLevel = 1;
	else if(meltCounter > 2) meltLevel = 2;

  if(!(meltLevel == 0)){
		if(meltLevel == 1 && melt > 0.9) {
			melt -= 0.0005;
		}
		else if(meltLevel == 2 && melt > 0.8) {
			melt -= 0.0005;
		}
	}
	//==============draw snowman==================================
  modelMatrix.setTranslate(-0.7,-1.0,0.0);
  modelMatrix.scale(0.4*melt,0.4*melt,0.4*melt);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,((2*cn+wn)/7+39),sn/7);

  modelMatrix.translate(0.0,1.5*melt,0.0);
	modelMatrix.scale(0.7,0.7,0.7);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,((2*cn+wn)/7+39),sn/7);

 //==============draw snowman's arm=============================
	modelMatrix.translate(0.75,-0.7,0);
  modelMatrix.rotate(-g_angle04,0,1,0);
	modelMatrix.translate(0.75,-0.7,0);
  modelMatrix.rotate(90,0,1,0);
	if(!(meltLevel == 2)) modelMatrix.rotate(60,1,0,0); // arm drop when meltLevel is 2
	else {
		modelMatrix.translate(0,(-(0.9-melt))*40,((0.9-melt))*20);
		modelMatrix.rotate(60+(0.9-melt)*1500,1,0,0);
	}
	pushMatrix(modelMatrix);
	modelMatrix.scale(0.03,0.3,0.03);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 39, cn/7);

  modelMatrix = popMatrix();
	modelMatrix.translate(0.0,0.26,-0.075);
  modelMatrix.rotate(-g_angle03,1,0,0);
	modelMatrix.translate(0.0,0.26,-0.075);
  modelMatrix.rotate(-30,1,0,0);
	modelMatrix.scale(0.03,0.3,0.03);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, 39, cn/7);
  
	//=============draw hat and scarf===============================
  modelMatrix.setTranslate(-0.85,-0.17-(1-melt)*30,-0.4-(1-melt)*5); // hat drops when meltLevel is 1
  modelMatrix.rotate(120,0,0,1);
  modelMatrix.rotate(130+(1-melt)*1500,0,1,0);
  modelMatrix.scale(0.12,0.12,0.08);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,((2*cn+wn+sn)/7+39),cn/7);

  modelMatrix.setTranslate(-0.7,-0.63-(1-melt)*0.5,0);
  modelMatrix.rotate(90,0,0,1);
  modelMatrix.rotate(90,0,1,0);
  modelMatrix.scale(0.2,0.2,0.05);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,((3*cn+wn+sn)/7+39),cn/7);
}

// Last time that this function was called:  (used for animation timing)
function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  //if(angle >   20.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  //if(angle <  -85.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function makeCylinder2(type) {
var floatsPerVertex = 7;
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var Colr = 0.1;
 if (type == 1){
   Colr = 0.8
 }
 var topColr = new Float32Array([0.1, 0.3, Colr]);	// light yellow top,
 var walColr = new Float32Array([0.1, 0.5, Colr]);	// dark green walls,
 var botColr = new Float32Array([0.1, 0.1, Colr]);	// light blue bottom,
 var ctrColr = new Float32Array([0.7, 0.2, Colr]); // near black end-cap centers,
 var errColr = new Float32Array([0.7, 0.7, Colr]);	// Bright-red trouble color.

 var capVerts = 18;	// # of vertices around the topmost 'cap' of the shape
 var topRadius = 1.0;		// radius of top of cylinder (bottom is always 1.0)
 
 // Create a (global) array to hold all of this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
 // # of vertices * # of elements needed to store them. How many vertices?
										// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
 										// (includes blue transition-edge that links end-cap & wall);
 										// + Cylinder wall requires   (2*capVerts) vertices;
 										// + Cylinder top end-cap:    (2*capVerts) -1 vertices
 										// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the 
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	// 
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {	
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before 
		// we reach the starting vertex at 1,0,-1. 
		if(v%2 ==0)
		{				// put even# vertices around bottom cap's outer edge,starting at v=0.
						// visit each outer-edge location only once; don't return to 
						// to the location of the v=0 vertex (at 1,0,-1).
						// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0, 
						// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*v/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*v/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = botColr[] 
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again, 
								// and put all even# verts along outer edge of bottom cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// ==z  BOTTOM cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr[]				
				cylVerts[j+4]=walColr[0]; 
				cylVerts[j+5]=walColr[1]; 
				cylVerts[j+6]=walColr[2];			
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0]; 
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
				}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
				cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// == z TOP cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr;
				cylVerts[j+4]=walColr[0]; 
				cylVerts[j+5]=walColr[1]; 
				cylVerts[j+6]=walColr[2];			
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0]; 
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}		
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			
			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
	}
  var returnValue = [cylVerts,((capVerts*6) -2) * floatsPerVertex];
  return returnValue;
}


function makeHat() {
var floatsPerVertex = 7;
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var topColr = new Float32Array([0.1, 0.5, 0.1]);	// light yellow top,
 var walColr = new Float32Array([0.1, 0.1, 0.1]);	// dark green walls,
 var botColr = new Float32Array([0.5, 0.1, 0.1]);	// light blue bottom,
 var ctrColr = new Float32Array([0.1, 0.1, 0.4]); // near black end-cap centers,
 var errColr = new Float32Array([0.1, 0.3, 0.3]);	// Bright-red trouble color.

 var capVerts = 18;	// # of vertices around the topmost 'cap' of the shape
 var topRadius = 1.0;		// radius of top of cylinder (bottom is always 1.0)
 
 // Create a (global) array to hold all of this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
 // # of vertices * # of elements needed to store them. How many vertices?
										// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
 										// (includes blue transition-edge that links end-cap & wall);
 										// + Cylinder wall requires   (2*capVerts) vertices;
 										// + Cylinder top end-cap:    (2*capVerts) -1 vertices
 										// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the 
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	// 
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {	
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before 
		// we reach the starting vertex at 1,0,-1. 
		if(v%2 ==0)
		{				// put even# vertices around bottom cap's outer edge,starting at v=0.
						// visit each outer-edge location only once; don't return to 
						// to the location of the v=0 vertex (at 1,0,-1).
						// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0, 
						// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*v/capVerts)*1.5;			// x
			cylVerts[j+1] = Math.sin(Math.PI*v/capVerts)*1.5;			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = botColr[] 
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again, 
								// and put all even# verts along outer edge of bottom cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// ==z  BOTTOM cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr[]				
				cylVerts[j+4]=walColr[0]; 
				cylVerts[j+5]=walColr[1]; 
				cylVerts[j+6]=walColr[2];			
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0]; 
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
				}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
				cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// == z TOP cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr;
				cylVerts[j+4]=walColr[0]; 
				cylVerts[j+5]=walColr[1]; 
				cylVerts[j+6]=walColr[2];			
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0]; 
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}		
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			
			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
	}
  var returnValue = [cylVerts,((capVerts*6) -2) * floatsPerVertex];
  return returnValue;
}

function makeScarf() {
var floatsPerVertex = 7;
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var topColr = new Float32Array([0.4, 0.1, 0.7]);	// light yellow top,
 var walColr = new Float32Array([0.4, 0.5, 0.1]);	// dark green walls,
 var botColr = new Float32Array([0.1, 0.1, 0.1]);	// light blue bottom,
 var ctrColr = new Float32Array([0.4, 0.3, 0.2]); // near black end-cap centers,
 var errColr = new Float32Array([0.4, 0.1, 0.1]);	// Bright-red trouble color.

 var capVerts = 18;	// # of vertices around the topmost 'cap' of the shape
 var topRadius = 1.0;		// radius of top of cylinder (bottom is always 1.0)
 
 // Create a (global) array to hold all of this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
 // # of vertices * # of elements needed to store them. How many vertices?
										// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
 										// (includes blue transition-edge that links end-cap & wall);
 										// + Cylinder wall requires   (2*capVerts) vertices;
 										// + Cylinder top end-cap:    (2*capVerts) -1 vertices
 										// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the 
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	// 
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=0,j=0;   v<(2*capVerts)-1;   v++,j+=floatsPerVertex) {	
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before 
		// we reach the starting vertex at 1,0,-1. 
		if(v%2 ==0)
		{				// put even# vertices around bottom cap's outer edge,starting at v=0.
						// visit each outer-edge location only once; don't return to 
						// to the location of the v=0 vertex (at 1,0,-1).
						// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0, 
						// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*v/capVerts)*1.1;			// x
			cylVerts[j+1] = Math.sin(Math.PI*v/capVerts)*1.1;			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = botColr[] 
			cylVerts[j+4]=botColr[0]; 
			cylVerts[j+5]=botColr[1]; 
			cylVerts[j+6]=botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] =-1.0; 
			cylVerts[j+3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for(v=0; v< 2*capVerts;   v++, j+=floatsPerVertex) {
		if(v%2==0)	// count verts from zero again, 
								// and put all even# verts along outer edge of bottom cap:
		{		
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts)*1.1;		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts)*1.1;		// y
				cylVerts[j+2] =-1.0;	// ==z  BOTTOM cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr[]				
				cylVerts[j+4]=walColr[0]; 
				cylVerts[j+5]=walColr[1]; 
				cylVerts[j+6]=walColr[2];			
			if(v==0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0]; 
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
				}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
				cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// == z TOP cap,
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = walColr;
				cylVerts[j+4]=walColr[0]; 
				cylVerts[j+5]=walColr[1]; 
				cylVerts[j+6]=walColr[2];			
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		// count vertices from zero again, and
		if(v%2==0) {	// position even #'d vertices around top cap's outer edge.
			cylVerts[j  ] = topRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = topRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0]; 
			cylVerts[j+5]=topColr[1]; 
			cylVerts[j+6]=topColr[2];
			if(v==0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
										// triangles; 1 in cap, 1 in step, 1 in wall.
					cylVerts[j+4] = errColr[0]; 
					cylVerts[j+5] = errColr[1];
					cylVerts[j+6] = errColr[2];		// (make it red; see lecture notes)
			}		
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;	
			cylVerts[j+2] = 1.0; 
			cylVerts[j+3] = 1.0;			
			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0]; 
			cylVerts[j+5]=ctrColr[1]; 
			cylVerts[j+6]=ctrColr[2];
		}
	}
  var returnValue = [cylVerts,((capVerts*6) -2) * floatsPerVertex];
  return returnValue;
}

function makeSphere() {
//==============================================================================
// Make a sphere from one TRIANGLE_STRIP drawing primitive,  using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.   
// Sphere radius==1.0, centered at the origin, with 'south' pole at 
// (x,y,z) = (0,0,-1) and 'north' pole at (0,0,+1).  The tri-strip starts at the
// south-pole end-cap spiraling upwards (in +z direction) in CCW direction as  
// viewed from the origin looking down (from inside the sphere). 
// Between the south end-cap and the north, it creates ring-like 'slices' that 
// defined by parallel planes of constant z.  Each slice of the tri-strip 
// makes up an equal-lattitude portion of the sphere, and the stepped-spiral
// slices follow the same design used to the makeCylinder2() function.
//
// (NOTE: you'll get better-looking results if you create a 'makeSphere3() 
// function that uses the 'degenerate stepped spiral' design (Method 3 in 
// lecture notes).
//
  var floatsPerVertex = 7;
  var slices = 12;		// # of slices of the sphere along the z axis, including 
  									// the south-pole and north pole end caps. ( >=2 req'd)
  var sliceVerts	= 21;	// # of vertices around the top edge of the slice
										// (same number of vertices on bottom of slice, too)
										// (HINT: odd# or prime#s help avoid accidental symmetry)
  var topColr = new Float32Array([0.8, 1.0, 1.0]);	// South Pole: dark-gray
  var botColr = new Float32Array([1.0, 0.8, 1.0]);	// North Pole: light-gray.
  var errColr = new Float32Array([1.0, 1.0, 0.8]);	// Bright-red trouble colr
  var sliceAngle = Math.PI/slices;	// One slice spans this fraction of the 
  // 180 degree (Pi radian) lattitude angle between south pole and north pole.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices*2*sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// Each end-cap slice requires (2*sliceVerts -1) vertices 
										// and each slice between them requires (2*sliceVerts).
	// Create the entire sphere as one single tri-strip array. This first for() loop steps through each 'slice', and the for() loop it contains steps through each vertex in the current slice.
	// INITIALIZE:
	var cosBot = 0.0;					// cosine and sine of the lattitude angle for
	var sinBot = 0.0;					// 	the current slice's BOTTOM (southward) edge. 
	// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
	var cosTop = 0.0;					// "	" " for current slice's TOP (northward) edge
	var sinTop = 0.0;
	// for() loop's s var counts slices; 
	// 				  its v var counts vertices; 
	// 					its j var counts Float32Array elements 
	//					(vertices * elements per vertex)	
	var j = 0;							// initialize our array index
	var isFirstSlice = 1;		// ==1 ONLY while making south-pole slice; 0 otherwise
	var isLastSlice = 0;		// ==1 ONLY while making north-pole slice; 0 otherwise
	for(s=0; s<slices; s++) {	// for each slice of the sphere,---------------------
		// For current slice's top & bottom edges, find lattitude angle sin,cos:
		if(s==0) {
			isFirstSlice = 1;		// true ONLY when we're creating the south-pole slice
			cosBot =  0.0; 			// initialize: first slice's lower edge is south pole.
			sinBot = -1.0;			// (cos(lat) sets slice diameter; sin(lat) sets z )
		}
		else {					// otherwise, set new bottom edge == old top edge
			isFirstSlice = 0;	
			cosBot = cosTop;
			sinBot = sinTop;
		}								// then compute sine,cosine of lattitude of new top edge.
		cosTop = Math.cos((-Math.PI/2) +(s+1)*sliceAngle); 
		sinTop = Math.sin((-Math.PI/2) +(s+1)*sliceAngle);
		// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
		// (       use cos(lat) to set slice radius, sin(lat) to set slice z coord)
		// Go around entire slice; start at x axis, proceed in CCW direction 
		// (as seen from origin inside the sphere), generating TRIANGLE_STRIP verts.
		// The vertex-counter 'v' starts at 0 at the start of each slice, but:
		// --the first slice (the South-pole end-cap) begins with v=1, because
		// 		its first vertex is on the TOP (northwards) side of the tri-strip
		// 		to ensure correct winding order (tri-strip's first triangle is CCW
		//		when seen from the outside of the sphere).
		// --the last slice (the North-pole end-cap) ends early (by one vertex)
		//		because its last vertex is on the BOTTOM (southwards) side of slice.
		//
		if(s==slices-1) isLastSlice=1;// (flag: skip last vertex of the last slice).
		var isTopVert = 0;
		for(v=isFirstSlice;    v< 2*sliceVerts-isLastSlice;   v++,j+=floatsPerVertex)
		{						// for each vertex of this slice,
				if(v%2 ==0) { // put vertices with even-numbered v at slice's bottom edge;
										// by circling CCW along longitude (east-west) angle 'theta':
										// (0 <= theta < 360deg, increases 'eastward' on sphere).
										// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
										// where			theta = 2*PI*(v/2)/capVerts = PI*v/capVerts
					sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
					sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
					sphVerts[j+2] = sinBot;																			// z
					sphVerts[j+3] = 1.0;																				// w.				
				}
				else {	// put vertices with odd-numbered v at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI* ((v-1)/2)*sliceVerts)
							// (why (v-1)? because we want longitude angle 0 for vertex 1).  
					sphVerts[j  ] = cosTop * Math.cos(Math.PI * (v-1)/sliceVerts); 	// x
					sphVerts[j+1] = cosTop * Math.sin(Math.PI * (v-1)/sliceVerts);	// y
					sphVerts[j+2] = sinTop;		// z
					sphVerts[j+3] = 1.0;	
				}
			// finally, set some interesting colors for vertices:
			if(v==0) { 	// Troublesome vertex: this vertex gets shared between 3 
			// important triangles; the last triangle of the previous slice, the 
			// anti-diagonal 'step' triangle that connects previous slice and next 
			// slice, and the first triangle of that next slice.  Smooth (Gouraud) 
			// shading of this vertex prevents us from choosing separate colors for 
			// each slice.  For a better solution, use the 'Degenerate Stepped Spiral' 
			// (Method 3) described in the Lecture Notes.
				sphVerts[j+4]=errColr[0]; 
				sphVerts[j+5]=errColr[1]; 
				sphVerts[j+6]=errColr[2];				
				}
			else if(isFirstSlice==1) {	
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
				}
			else if(isLastSlice==1) {
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
			}
			else {	// for all non-top, not-bottom slices, set vertex colors randomly				
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];			
			}
		}
	}
  var returnValue = [sphVerts,((slices*2*sliceVerts) -2) * floatsPerVertex];
  return returnValue;
}

function makeSphere2() {
//==============================================================================
// Make a sphere from one TRIANGLE_STRIP drawing primitive,  using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.   
// Sphere radius==1.0, centered at the origin, with 'south' pole at 
// (x,y,z) = (0,0,-1) and 'north' pole at (0,0,+1).  The tri-strip starts at the
// south-pole end-cap spiraling upwards (in +z direction) in CCW direction as  
// viewed from the origin looking down (from inside the sphere). 
// Between the south end-cap and the north, it creates ring-like 'slices' that 
// defined by parallel planes of constant z.  Each slice of the tri-strip 
// makes up an equal-lattitude portion of the sphere, and the stepped-spiral
// slices follow the same design used to the makeCylinder2() function.
//
// (NOTE: you'll get better-looking results if you create a 'makeSphere3() 
// function that uses the 'degenerate stepped spiral' design (Method 3 in 
// lecture notes).
//
  var floatsPerVertex = 7;
  var slices = 12;		// # of slices of the sphere along the z axis, including 
  									// the south-pole and north pole end caps. ( >=2 req'd)
  var sliceVerts	= 21;	// # of vertices around the top edge of the slice
										// (same number of vertices on bottom of slice, too)
										// (HINT: odd# or prime#s help avoid accidental symmetry)
  var topColr = new Float32Array([0.3, 0.1, 0.8]);	// South Pole: dark-gray
  var botColr = new Float32Array([0.3, 0.3, 0.1]);	// North Pole: light-gray.
  var errColr = new Float32Array([0.1, 0.3, 0.8]);	// Bright-red trouble colr
  var sliceAngle = Math.PI/slices;	// One slice spans this fraction of the 
  // 180 degree (Pi radian) lattitude angle between south pole and north pole.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((16*sliceVerts) -1 + sliceVerts*3) * floatsPerVertex);
										// # of vertices * # of elements needed to store them. 
										// Each end-cap slice requires (2*sliceVerts -1) vertices 
										// and each slice between them requires (2*sliceVerts).
	// Create the entire sphere as one single tri-strip array. This first for() loop steps through each 'slice', and the for() loop it contains steps through each vertex in the current slice.
	// INITIALIZE:
	var cosBot = 0.0;					// cosine and sine of the lattitude angle for
	var sinBot = 0.0;					// 	the current slice's BOTTOM (southward) edge. 
	// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
	var cosTop = 0.0;					// "	" " for current slice's TOP (northward) edge
	var sinTop = 0.0;
	// for() loop's s var counts slices; 
	// 				  its v var counts vertices; 
	// 					its j var counts Float32Array elements 
	//					(vertices * elements per vertex)	
	var j = 0;							// initialize our array index
	var isFirstSlice = 1;		// ==1 ONLY while making south-pole slice; 0 otherwise
	var isLastSlice = 0;		// ==1 ONLY while making north-pole slice; 0 otherwise
	for(s=0; s<9; s++) {	// for each slice of the sphere,---------------------
		// For current slice's top & bottom edges, find lattitude angle sin,cos:
		if(s==0) {
			isFirstSlice = 1;		// true ONLY when we're creating the south-pole slice
			cosBot =  0.0; 			// initialize: first slice's lower edge is south pole.
			sinBot = -1.0;			// (cos(lat) sets slice diameter; sin(lat) sets z )
		}
		else {					// otherwise, set new bottom edge == old top edge
			isFirstSlice = 0;	
			cosBot = cosTop;
			sinBot = sinTop;
		}								// then compute sine,cosine of lattitude of new top edge.
		cosTop = Math.cos((-Math.PI/2) +(s+1)*sliceAngle); 
		sinTop = Math.sin((-Math.PI/2) +(s+1)*sliceAngle);
		// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
		// (       use cos(lat) to set slice radius, sin(lat) to set slice z coord)
		// Go around entire slice; start at x axis, proceed in CCW direction 
		// (as seen from origin inside the sphere), generating TRIANGLE_STRIP verts.
		// The vertex-counter 'v' starts at 0 at the start of each slice, but:
		// --the first slice (the South-pole end-cap) begins with v=1, because
		// 		its first vertex is on the TOP (northwards) side of the tri-strip
		// 		to ensure correct winding order (tri-strip's first triangle is CCW
		//		when seen from the outside of the sphere).
		// --the last slice (the North-pole end-cap) ends early (by one vertex)
		//		because its last vertex is on the BOTTOM (southwards) side of slice.
		//
		if(s==slices-1) isLastSlice=1;// (flag: skip last vertex of the last slice).
		var isTopVert = 0;
		for(v=isFirstSlice;    v< 2*sliceVerts-isLastSlice;   v++,j+=floatsPerVertex)
		{						// for each vertex of this slice,
			if(s != 8)
			{
				if(v%2 ==0) { // put vertices with even-numbered v at slice's bottom edge;
										// by circling CCW along longitude (east-west) angle 'theta':
										// (0 <= theta < 360deg, increases 'eastward' on sphere).
										// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
										// where			theta = 2*PI*(v/2)/capVerts = PI*v/capVerts
					sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
					sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
					sphVerts[j+2] = sinBot;																			// z
					sphVerts[j+3] = 1.0;																				// w.				
				}
				else {	// put vertices with odd-numbered v at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI* ((v-1)/2)*sliceVerts)
							// (why (v-1)? because we want longitude angle 0 for vertex 1).  
					sphVerts[j  ] = cosTop * Math.cos(Math.PI * (v-1)/sliceVerts); 	// x
					sphVerts[j+1] = cosTop * Math.sin(Math.PI * (v-1)/sliceVerts);	// y
					sphVerts[j+2] = sinTop;		// z
					sphVerts[j+3] = 1.0;	
				}
			}
			else{
				if(v%2 ==0) { // put vertices with even-numbered v at slice's bottom edge;
										// by circling CCW along longitude (east-west) angle 'theta':
										// (0 <= theta < 360deg, increases 'eastward' on sphere).
										// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
										// where			theta = 2*PI*(v/2)/capVerts = PI*v/capVerts
					if(isTopVert == 0){
						sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
						sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
						sphVerts[j+2] = sinBot;																			// z
						sphVerts[j+3] = 1.0;	
						isTopVert = 1;
						v--;
					}		
					else{
						sphVerts[j  ] = 0	// x
						sphVerts[j+1] = 0	// y
						sphVerts[j+2] = 2.0;																			// z
						sphVerts[j+3] = 1.0;
						isTopVert = 0;	
					}																	// w.				
				}
				else {	// put vertices with odd-numbered v at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI* ((v-1)/2)*sliceVerts)
							// (why (v-1)? because we want longitude angle 0 for vertex 1).  
					    sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
						sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
						sphVerts[j+2] = sinBot;																			// z
						sphVerts[j+3] = 1.0;	
				}
			}
			// finally, set some interesting colors for vertices:
			if(v==0) { 	// Troublesome vertex: this vertex gets shared between 3 
			// important triangles; the last triangle of the previous slice, the 
			// anti-diagonal 'step' triangle that connects previous slice and next 
			// slice, and the first triangle of that next slice.  Smooth (Gouraud) 
			// shading of this vertex prevents us from choosing separate colors for 
			// each slice.  For a better solution, use the 'Degenerate Stepped Spiral' 
			// (Method 3) described in the Lecture Notes.
				sphVerts[j+4]=errColr[0]; 
				sphVerts[j+5]=errColr[1]; 
				sphVerts[j+6]=errColr[2];				
				}
			else if(isFirstSlice==1) {	
				sphVerts[j+4]=botColr[0]; 
				sphVerts[j+5]=botColr[1]; 
				sphVerts[j+6]=botColr[2];	
				}
			else if(isLastSlice==1) {
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];	
			}
			else {	// for all non-top, not-bottom slices, set vertex colors randomly				
				sphVerts[j+4]=topColr[0]; 
				sphVerts[j+5]=topColr[1]; 
				sphVerts[j+6]=topColr[2];			
			}
		}
	}
  var returnValue = [sphVerts,((16*sliceVerts) -1 + sliceVerts*3) * floatsPerVertex];
  return returnValue;
}

function colorChange(){
	var changeVertices = new Float32Array([
		 -0.05, 0.00, 0.05, 1.00,		0.3-blackRust, 	0.3-redRust,	0.3-redRust,// first triangle   (x,y,z,w==1)
     0.05, 0.00, 0.05, 1.00,    0.3,  0.3-blackRust,  0.3-blackRust,
     -0.05,  0.50, 0.05, 1.00,   0.3,  0.3, 0.3,
     0.05, 0.00, 0.05, 1.00,		0.3, 	0.3,	0.3,// second triangle
     0.05, 0.50, 0.05, 1.00,    0.3-blackRust,  0.3-redRust,  0.3-redRust,
     -0.05, 0.50, 0.05, 1.00,    0.3,  0.3-blackRust,  0.3-blackRust,
     -0.05, 0.00, 0.05, 1.00,    0.3, 	0.3-blackRust,	0.3-blackRust,
     -0.05, 0.50, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05, 0.00, -0.05, 1.00,   0.3-blackRust, 	0.3-redRust,	0.3-redRust,
     -0.05, 0.00, -0.05, 1.00,    0.3-blackRust, 	0.3-redRust,	0.3-redRust,
     -0.05, 0.50, 0.05, 1.00,    0.3, 	0.3-blackRust,	0.3-blackRust,
     -0.05, 0.50, -0.05, 1.00,   0.3, 	0.3,	0.3,
     -0.05, 0.00, -0.05, 1.00,		0.3, 	0.3,	0.3,// first triangle   (x,y,z,w==1)
     -0.05,  0.50, -0.05, 1.00,   0.3-blackRust,  0.3-redRust,  0.3-redRust,
     0.05, 0.00, -0.05, 1.00,    0.3,  0.3-blackRust,  0.3-blackRust,
     0.05, 0.00, -0.05, 1.00,		0.3, 	0.3-blackRust,	0.3-blackRust,// second triangle
     -0.05, 0.50, -0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.50, -0.05, 1.00,    0.3-blackRust,  0.3-redRust,  0.3-redRust,
     0.05, 0.00, 0.05, 1.00,    0.3-blackRust, 	0.3-redRust,	0.3-redRust,
     0.05, 0.00, -0.05, 1.00,   0.3, 	0.3-blackRust,	0.3-blackRust,
     0.05, 0.50, 0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.00, -0.05, 1.00,    0.3, 	0.3,	0.3,
     0.05, 0.50, -0.05, 1.00,   0.3-blackRust, 	0.3-redRust,	0.3-redRust,
     0.05, 0.50, 0.05, 1.00,    0.3, 	0.3-blackRust,	0.3-blackRust,
     -0.05, 0.00, 0.05, 1.00,		0.3, 	0.3-blackRust,	0.3-blackRust,// first triangle   (x,y,z,w==1)
     0.05, 0.00, 0.05, 1.00,    0.3, 	0.3,	0.3,
     -0.05,  0.00, -0.05, 1.00,   0.3-blackRust, 	0.3-redRust,	0.3-redRust,
     0.05, 0.00, 0.05, 1.00,		0.3-blackRust, 	0.3-redRust,	0.3-redRust,// second triangle
     0.05, 0.00, -0.05, 1.00,     0.3, 	0.3-blackRust,	0.3-blackRust,
     -0.05, 0.00, -0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05, 0.50, 0.05, 1.00,		0.3, 	0.3,	0.3,// first triangle   (x,y,z,w==1)
     0.05, 0.50, 0.05, 1.00,    0.3-blackRust,  0.3-redRust,  0.3-redRust,
     -0.05,  0.50, -0.05, 1.00,   0.3,  0.3-blackRust,  0.3-blackRust,
     0.05, 0.50, 0.05, 1.00,		 0.3, 	0.3-blackRust,	0.3-blackRust,// second triangle
     0.05, 0.50, -0.05, 1.00,    0.3,  0.3,  0.3,
     -0.05, 0.50, -0.05, 1.00,    0.3-blackRust,  0.3-redRust,  0.3-redRust,
	])
	gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER,0,changeVertices);
	gl.bindBuffer(gl.ARRAY_BUFFER,null);
}