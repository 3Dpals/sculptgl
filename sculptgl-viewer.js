'use strict';

function SculptGL()
{
  this.gl_ = null; //webgl context

  //controllers stuffs
  this.lastMouseX_ = 0; //the last position of the mouse in x
  this.lastMouseY_ = 0; //the last position of the mouse in y
  this.sumDisplacement_ = 0; //sum of the displacement mouse
  this.mouseButton_ = 0; //which mouse button is pressed
  this.cameraTimer_ = -1; //interval id (used for zqsd/wasd/arrow moves)
  this.usePenRadius_ = true; //the pen pressure acts on the tool's radius
  this.usePenIntensity_ = false; //the pen pressure acts on the tool's intensity

  //symmetry stuffs
  this.symmetry_ = false; //if symmetric sculpting is enabled
  this.continuous_ = false; //continuous sculpting
  this.sculptTimer_ = -1; //continuous interval timer
  this.pressureRadius_ = 0; //for continuous sculpting
  this.pressureIntensity_ = 0; //for continuous sculpting
  this.mouseX_ = 0; //for continuous sculpting
  this.mouseY_ = 0; //for continuous sculpting
  this.ptPlane_ = [0, 0, 0]; //point origin of the plane symmetry
  this.nPlane_ = [1, 0, 0]; //normal of plane symmetry

  //core of the app
  this.states_ = new States(); //for undo-redo
  this.camera_ = new Camera(); //the camera
  this.picking_ = new Picking(this.camera_); //the ray picking
  this.pickingSym_ = new Picking(this.camera_); //the symmetrical picking
  this.background_ = null; //the background
  this.mesh_ = null; //the mesh

  //datas
  this.textures_ = {}; //textures
  this.shaders_ = {}; //shaders
  this.sphere_ = ''; //sphere

}

SculptGL.elementIndexType = 0; //element index type (ushort or uint)
SculptGL.indexArrayType = Uint16Array; //typed array for index element (uint16Array or uint32Array)

SculptGL.prototype = {
  /** Initialization */
  start: function (model)
  {
    this.initWebGL();
    this.loadShaders();
    this.onWindowResize();
    this.model = model;
    this.loadTextures();
    this.initEvents();
  },

  /** Initialize */
  initEvents: function ()
  {
    var self = this;
    var $canvas = $('#canvas-viewer');
    $('#fileopen').change(function (event)
    {
      self.loadFile(event);
    });
    $('#backgroundopen').change(function (event)
    {
      self.loadBackground(event);
    });
    $canvas.mousedown(function (event)
    {
      self.onMouseDown(event);
    });
    $canvas.mouseup(function (event)
    {
      self.onMouseUp(event);
    });
    $canvas.mousewheel(function (event, delta)
    {
      self.onMouseWheel(event, delta);
    });
    $canvas.mousemove(function (event)
    {
      self.onMouseMove(event);
    });
    $canvas.mouseout(function (event)
    {
      self.onMouseOut(event);
    });
    $canvas[0].addEventListener('webglcontextlost', self.onContextLost, false);
    $canvas[0].addEventListener('webglcontextrestored', self.onContextRestored, false);
    $canvas.keydown(function (event)
    {
      self.onKeyDown(event);
    });
    $canvas.keyup(function (event)
    {
      self.onKeyUp(event);
    });
    $(window).resize(function (event)
    {
      self.onWindowResize(event);
    });
    $canvas.bind('contextmenu', function(e){
		return false;
	}); 
  },

  /** Load webgl context */
  initWebGL: function ()
  {
    var attributes = {
      antialias: false,
      stencil: true
    };
    try
    {
      this.gl_ = $('#canvas-viewer')[0].getContext('webgl', attributes) || $('#canvas-viewer')[0].getContext('experimental-webgl', attributes);
    }
    catch (e)
    {
      alert('Could not initialise WebGL.');
    }
    var gl = this.gl_;
    if (gl)
    {
      if (gl.getExtension('OES_element_index_uint'))
      {
        SculptGL.elementIndexType = gl.UNSIGNED_INT;
        SculptGL.indexArrayType = Uint32Array;
      }
      else
      {
        SculptGL.elementIndexType = gl.UNSIGNED_SHORT;
        SculptGL.indexArrayType = Uint16Array;
      }
      gl.viewportWidth = $(window).width();
      gl.viewportHeight = $(window).height();
      gl.clearColor(0.2, 0.2, 0.2, 1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
  },

  /** Load textures (preload) */
  loadTextures: function ()
  {
    var self = this;
    var loadTex = function (path, mode)
    {
      var mat = new Image();
      mat.src = path;
      var gl = self.gl_;
      mat.onload = function ()
      {
        var idTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, idTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mat);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        self.textures_[mode] = idTex;
        if (mode === Render.mode.MATERIAL)
          self.loadModel();
      };
    };
    loadTex('sculptgl/ressources/clay.jpg', Render.mode.MATERIAL);
    loadTex('sculptgl/ressources/chavant.jpg', Render.mode.MATERIAL + 1);
    loadTex('sculptgl/ressources/skin.jpg', Render.mode.MATERIAL + 2);
    loadTex('sculptgl/ressources/drink.jpg', Render.mode.MATERIAL + 3);
    loadTex('sculptgl/ressources/redvelvet.jpg', Render.mode.MATERIAL + 4);
    loadTex('sculptgl/ressources/orange.jpg', Render.mode.MATERIAL + 5);
    loadTex('sculptgl/ressources/bronze.jpg', Render.mode.MATERIAL + 6);
  },

  /** Load shaders as a string */
  loadShaders: function ()
  {
    var xhrShader = function (path)
    {
      var shaderXhr = new XMLHttpRequest();
      shaderXhr.open('GET', path, false);
      shaderXhr.send(null);
      return shaderXhr.responseText;
    };
    var shaders = this.shaders_;
    shaders.phongVertex = xhrShader('sculptgl/shaders/phong.vert');
    shaders.phongFragment = xhrShader('sculptgl/shaders/phong.frag');
    shaders.transparencyVertex = xhrShader('sculptgl/shaders/transparency.vert');
    shaders.transparencyFragment = xhrShader('sculptgl/shaders/transparency.frag');
    shaders.wireframeVertex = xhrShader('sculptgl/shaders/wireframe.vert');
    shaders.wireframeFragment = xhrShader('sculptgl/shaders/wireframe.frag');
    shaders.normalVertex = xhrShader('sculptgl/shaders/normal.vert');
    shaders.normalFragment = xhrShader('sculptgl/shaders/normal.frag');
    shaders.reflectionVertex = xhrShader('sculptgl/shaders/reflection.vert');
    shaders.reflectionFragment = xhrShader('sculptgl/shaders/reflection.frag');
    shaders.backgroundVertex = xhrShader('sculptgl/shaders/background.vert');
    shaders.backgroundFragment = xhrShader('sculptgl/shaders/background.frag');
  },

  /** Load the sphere */
  loadSphere: function ()
  {
    var sphereXhr = new XMLHttpRequest();
    sphereXhr.open('GET', 'sculptgl/ressources/sphere.obj', true);
    var self = this;
    sphereXhr.onload = function ()
    {
      self.sphere_ = this.responseText;
      self.resetSphere();
    };
    sphereXhr.send(null);
  },

  /** Load the model */
  loadModel: function ()
  {
	var self = this;
	$.ajax({
		url : 'api/file/'+self.model.file+'/content',
		type : 'GET',
		success : function (html) {
			self.sphere_ = JSON.parse(html).content;
			if (!self.sphere_  || self.sphere_ == '') { // Empty model, so we load the default sphere:
				self.loadSphere();
			} else {
				self.resetSphere();
			}
		}
	});
  },


  /** Render mesh */
  render: function ()
  {
    var gl = this.gl_;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.camera_.updateView();
    if (this.background_)
    {
      gl.depthMask(false);
      this.background_.render();
      gl.depthMask(true);
    }
    if (this.mesh_)
      this.mesh_.render(this.camera_, this.picking_, [0,0], [0,0]);
  },

  /** Called when the window is resized */
  onWindowResize: function ()
  {
    var newWidth = $(window).width(),
      newHeight = $(window).height();
    this.camera_.width_ = newWidth;
    this.camera_.height_ = newHeight;
    $('#canvas-viewer').attr('width', newWidth);
    $('#canvas-viewer').attr('height', newHeight);
    var gl = this.gl_;
    gl.viewportWidth = newWidth;
    gl.viewportHeight = newHeight;
    gl.viewport(0, 0, newWidth, newHeight);
    this.camera_.updateProjection();
    this.render();
  },

  /** Key pressed event */
  onKeyDown: function (event)
  {
    event.stopPropagation();
    if (!this.focusGui_)
      event.preventDefault();
    var key = event.which;
    if (event.ctrlKey && key === 90) //z key
    {
      this.onUndo();
      return;
    }
    else if (event.ctrlKey && key === 89) //y key
    {
      this.onRedo();
      return;
    }
    if (event.altKey)
    {
      if (this.camera_.usePivot_)
        this.picking_.intersectionMouseMesh(this.mesh_, this.lastMouseX_, this.lastMouseY_, 0.5);
      this.camera_.start(this.lastMouseX_, this.lastMouseY_, this.picking_);
    }
    switch (key)
    {
    case 37: // LEFT
    case 81: // Q
    case 65: // A
      this.camera_.moveX_ = -1;
      break;
    case 39: // RIGHT
    case 68: // D
      this.camera_.moveX_ = 1;
      break;
    case 38: // UP
    case 90: // Z
    case 87: // W
      this.camera_.moveZ_ = -1;
      break;
    case 40: // DOWN
    case 83: // S
      this.camera_.moveZ_ = 1;
      break;
    }
    var self = this;
    if (this.cameraTimer_ === -1)
    {
      this.cameraTimer_ = setInterval(function ()
      {
        self.camera_.updateTranslation();
        self.render();
      }, 20);
    }
  },

  /** Key released event */
  onKeyUp: function (event)
  {
    event.stopPropagation();
    event.preventDefault();
    var key = event.which;
    switch (key)
    {
    case 37: // LEFT
    case 81: // Q
    case 65: // A
    case 39: // RIGHT
    case 68: // D
      this.camera_.moveX_ = 0;
      break;
    case 38: // UP
    case 90: // Z
    case 87: // W
    case 40: // DOWN
    case 83: // S
      this.camera_.moveZ_ = 0;
      break;
    case 70: //F
      this.camera_.resetViewFront();
      this.render();
      break;
    case 84: //T
      this.camera_.resetViewTop();
      this.render();
      break;
    case 76: //L
      this.camera_.resetViewLeft();
      this.render();
      break;
    }
    if (this.cameraTimer_ !== -1 && this.camera_.moveX_ === 0 && this.camera_.moveZ_ === 0)
    {
      clearInterval(this.cameraTimer_);
      this.cameraTimer_ = -1;
    }
  },

  /** Mouse pressed event */
  onMouseDown: function (event)
  {
    event.stopPropagation();
    event.preventDefault();
    var mouseX = event.pageX,
      mouseY = event.pageY;
    this.mouseButton_ = event.which;
    var button = event.which;
    var pressure = Tablet.pressure();
    var pressureRadius = this.usePenRadius_ ? pressure : 1;
    var pressureIntensity = this.usePenIntensity_ ? pressure : 1;
    if (button === 3)
    {
      if (this.camera_.usePivot_)
        this.picking_.intersectionMouseMesh(this.mesh_, mouseX, mouseY, pressureRadius);
      this.camera_.start(mouseX, mouseY, this.picking_);
    }
  },

  /** Mouse released event */
  onMouseUp: function (event)
  {
    event.stopPropagation();
    event.preventDefault();
    if (this.mesh_)
      this.mesh_.checkLeavesUpdate();
    if (this.sculptTimer_ !== -1)
    {
      clearInterval(this.sculptTimer_);
      this.sculptTimer_ = -1;
    }
    this.mouseButton_ = 0;
  },

  /** Mouse out event */
  onMouseOut: function ()
  {
    if (this.mesh_)
      this.mesh_.checkLeavesUpdate();
    if (this.sculptTimer_ !== -1)
    {
      clearInterval(this.sculptTimer_);
      this.sculptTimer_ = -1;
    }
    this.mouseButton_ = 0;
  },

  /** Mouse wheel event */
  onMouseWheel: function (event, delta)
  {
    event.stopPropagation();
    event.preventDefault();
    this.camera_.zoom(delta / 100);
    this.render();
  },

  /** Mouse move event */
  onMouseMove: function (event)
  {
    event.stopPropagation();
    event.preventDefault();
    var mouseX = event.pageX,
      mouseY = event.pageY;
    var button = this.mouseButton_;
    
    if (button === 3 || (event.altKey && !event.shiftKey && !event.ctrlKey))
      this.camera_.rotate(mouseX, mouseY);
    else if (button === 2 || (event.altKey && event.shiftKey))
      this.camera_.translate((mouseX - this.lastMouseX_) / 3000, (mouseY - this.lastMouseY_) / 3000);
    else if (event.altKey && event.ctrlKey)
      this.camera_.zoom((mouseY - this.lastMouseY_) / 3000);
    this.lastMouseX_ = mouseX;
    this.lastMouseY_ = mouseY;
    this.render();
  },

  /** WebGL context is lost */
  onContextLost: function ()
  {
    alert('shit happens : context lost');
  },

  /** WebGL context is restored */
  onContextRestored: function ()
  {
    alert('context is restored');
  },

  /** Load file */
  loadFile: function (event)
  {
    event.stopPropagation();
    event.preventDefault();
    if (event.target.files.length === 0)
      return;
    var file = event.target.files[0];
    var name = file.name;
    var fileType = '';
    fileType = name.endsWith('.obj') ? 'obj' : fileType;
    fileType = name.endsWith('.stl') ? 'stl' : fileType;
    fileType = name.endsWith('.ply') ? 'ply' : fileType;
    if (fileType === '')
      return;
    var reader = new FileReader();
    var self = this;
    reader.onload = function (evt)
    {
      self.startMeshLoad();
      if (fileType === 'obj')
        Import.importOBJ(evt.target.result, self.mesh_);
      else if (fileType === 'stl')
        Import.importSTL(evt.target.result, self.mesh_);
      else if (fileType === 'ply')
        Import.importPLY(evt.target.result, self.mesh_);
      self.endMeshLoad();
      $('#fileopen').replaceWith($('#fileopen').clone(true));
    };
    if (fileType === 'obj')
      reader.readAsText(file);
    else if (fileType === 'stl')
      reader.readAsBinaryString(file);
    else if (fileType === 'ply')
      reader.readAsBinaryString(file);
  },

  /** Load background */
  loadBackground: function (event)
  {
    if (event.target.files.length === 0)
      return;
    var file = event.target.files[0];
    if (!file.type.match('image.*'))
      return;
    if (!this.background_)
    {
      this.background_ = new Background(this.gl_);
      this.background_.init(this.shaders_);
    }
    var reader = new FileReader();
    var self = this;
    reader.onload = function (evt)
    {
      var bg = new Image();
      bg.src = evt.target.result;
      self.background_.loadBackgroundTexture(bg);
      self.render();
    };
    reader.readAsDataURL(file);
  },

  /** Open file */
  resetSphere: function ()
  {
    this.startMeshLoad();
    Import.importOBJ(this.sphere_, this.mesh_);
    this.endMeshLoad();
  },
  /** Initialization before loading the mesh */
  startMeshLoad: function ()
  {
    this.mesh_ = new Mesh(this.gl_);
    this.states_.reset();
    this.states_.mesh_ = this.mesh_;
    //reset flags (not necessary...)
    Mesh.stateMask_ = 1;
    Vertex.tagMask_ = 1;
    Vertex.sculptMask_ = 1;
    Triangle.tagMask_ = 1;
  },

  /** The loading is finished, set stuffs ... and update camera */
  endMeshLoad: function ()
  {
    var mesh = this.mesh_;
    mesh.render_.shaderType_ = Render.mode.MATERIAL;
    
    mesh.initMesh(this.textures_, this.shaders_);
    mesh.moveTo([0, 0, 0]);
    this.camera_.reset();
    this.render();
  },
};
