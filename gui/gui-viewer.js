'use strict';

function Gui(sculptgl)
{
  this.sculptgl_ = sculptgl; //main application

  //files functions
  this.open_ = this.openFile; //open file button (trigger hidden html input...)
  this.saveOBJ_ = this.saveFileAsOBJ; //save mesh as OBJ
  this.savePLY_ = this.saveFileAsPLY; //save mesh as PLY
  this.saveSTL_ = this.saveFileAsSTL; //save mesh as STL

  //online exporters
  this.keyVerold_ = ''; //verold api key
  this.exportVerold_ = this.exportVerold; //upload file on verold
  this.keySketchfab_ = ''; //sketchfab api key
  this.exportSketchfab_ = this.exportSketchfab; //upload file on sketchfab

  //background functions
  this.resetBg_ = this.resetBackground; //reset background
  this.importBg_ = this.importBackground; //import background image

  //functions
  this.resetCamera_ = this.resetCamera; //reset camera position and rotation

  //misc
  this.dummyFunc_ = function () {}; //empty function... stupid trick to get a simple button in dat.gui
}

Gui.prototype = {
  /** Initialize dat-gui stuffs */
  initGui: function ()
  {
    var guiGeneral = new dat.GUI();
    guiGeneral.domElement.style.position = 'absolute';
    guiGeneral.domElement.style.height = '650px';
    this.initGeneralGui(guiGeneral);

    var guiEditing = new dat.GUI();
    this.initEditingGui(guiEditing);

    var main = this.sculptgl_;
    guiGeneral.domElement.addEventListener('mouseout', function ()
    {
      main.focusGui_ = false;
    }, false);
    guiEditing.domElement.addEventListener('mouseout', function ()
    {
      main.focusGui_ = false;
    }, false);
    guiGeneral.domElement.addEventListener('mouseover', function ()
    {
      main.focusGui_ = true;
    }, false);
    guiEditing.domElement.addEventListener('mouseover', function ()
    {
      main.focusGui_ = true;
    }, false);
  },

  /** Initialize the general gui (on the left) */
  initGeneralGui: function (gui)
  {
    var main = this.sculptgl_;
    var self = this;

    //file fold
    var foldFiles = gui.addFolder('Files (export)');
    foldFiles.add(main, 'resetSphere_').name('Reset sphere');
    foldFiles.add(this, 'saveOBJ_').name('Export (obj)');
    foldFiles.add(this, 'savePLY_').name('Export (ply)');
    foldFiles.add(this, 'saveSTL_').name('Export (stl)');

    //Verold fold
    var foldVerold = gui.addFolder('Go to Verold !');
    foldVerold.add(this, 'keyVerold_').name('API key');
    foldVerold.add(this, 'exportVerold_').name('Upload');

    //Sketchfab fold
    var foldSketchfab = gui.addFolder('Go to Sketchfab !');
    foldSketchfab.add(this, 'keySketchfab_').name('API key');
    foldSketchfab.add(this, 'exportSketchfab_').name('Upload');

    //Camera fold
    var cameraFold = gui.addFolder('Camera');
    cameraFold.add(this, 'resetCamera_').name('Reset');
    var optionsCameraMode = {
      'Spherical': Camera.mode.SPHERICAL,
      'Plane': Camera.mode.PLANE
    };
    var ctrlCameraMode = cameraFold.add(main.camera_, 'mode_', optionsCameraMode).name('Mode');
    ctrlCameraMode.onChange(function (value)
    {
      main.camera_.mode_ = parseInt(value, 10);
    });
    var optionsCameraType = {
      'Perspective': Camera.projType.PERSPECTIVE,
      'Orthographic': Camera.projType.ORTHOGRAPHIC
    };
    this.ctrlCameraType_ = cameraFold.add(main.camera_, 'type_', optionsCameraType).name('Type');
    this.ctrlCameraType_.onChange(function (value)
    {
      main.camera_.type_ = parseInt(value, 10);
      self.ctrlFov_.__li.hidden = main.camera_.type_ === Camera.projType.ORTHOGRAPHIC;
      main.camera_.updateProjection();
      main.render();
    });
    this.ctrlFov_ = cameraFold.add(main.camera_, 'fov_', 10, 150).name('Fov');
    this.ctrlFov_.onChange(function ()
    {
      main.camera_.updateProjection();
      main.render();
    });
    var ctrlPivot = cameraFold.add(main.camera_, 'usePivot_').name('Picking pivot');
    ctrlPivot.onChange(function ()
    {
      main.camera_.toggleUsePivot();
      main.render();
    });
    cameraFold.open();

    //background fold
    var backgroundFold = gui.addFolder('background');
    backgroundFold.add(this, 'resetBg_').name('Reset');
    backgroundFold.add(this, 'importBg_').name('Import (jpg, png...)');
    backgroundFold.open();

  },

  /** Initialize the mesh editing gui (on the right) */
  initEditingGui: function (gui)
  {
    var main = this.sculptgl_;
    var self = this;

    //mesh fold
    var foldMesh = gui.addFolder('Mesh');
    this.ctrlNbVertices_ = foldMesh.add(this, 'dummyFunc_').name('Ver : 0');
    this.ctrlNbTriangles_ = foldMesh.add(this, 'dummyFunc_').name('Tri : 0');
    var optionsShaders = {
      'Phong': Render.mode.PHONG,
      'Transparency': Render.mode.TRANSPARENCY,
      'Wireframe (slow)': Render.mode.WIREFRAME,
      'Normal shader': Render.mode.NORMAL,
      'Clay': Render.mode.MATERIAL,
      'Chavant': Render.mode.MATERIAL + 1,
      'Skin': Render.mode.MATERIAL + 2,
      'Drink': Render.mode.MATERIAL + 3,
      'Red velvet': Render.mode.MATERIAL + 4,
      'Orange': Render.mode.MATERIAL + 5,
      'Bronze': Render.mode.MATERIAL + 6
    };
    this.ctrlShaders_ = foldMesh.add(new Render(), 'shaderType_', optionsShaders).name('Shader');
    this.ctrlShaders_.onChange(function (value)
    {
      if (main.mesh_)
      {
        main.mesh_.render_.updateShaders(parseInt(value, 10), main.textures_, main.shaders_);
        main.mesh_.updateBuffers();
        main.render();
      }
    });
    this.ctrlColor_ = foldMesh.addColor(main.sculpt_, 'color_').name('Color');
    this.ctrlColor_.onChange(function (value)
    {
      if (value.length === 3) // rgb [255, 255, 255]
      {
        main.sculpt_.color_ = [value[0], value[1], value[2]];
      }
      else if (value.length === 7) // hex (24 bits style) "#ffaabb"
      {
        var intVal = parseInt(value.slice(1), 16);
        main.sculpt_.color_ = [(intVal >> 16), (intVal >> 8 & 0xff), (intVal & 0xff)];
      }
      else // fuck it
        main.sculpt_.color_ = [168, 66, 66];
    });
    foldMesh.open();
  },
  
  /** Update number of vertices and triangles */
  updateMeshInfo: function (nbVertices, nbTriangles)
  {
    this.ctrlNbVertices_.name('Ver : ' + nbVertices);
    this.ctrlNbTriangles_.name('Tri : ' + nbTriangles);
  },

  /** Open file */
  openFile: function ()
  {
    $('#fileopen').trigger('click');
  },

  /** Reset background */
  resetBackground: function ()
  {
    var bg = this.sculptgl_.background_;
    if (bg)
    {
      var gl = bg.gl_;
      gl.deleteTexture(bg.backgroundLoc_);
      this.sculptgl_.background_ = null;
    }
  },

  /** Immort background */
  resetCamera: function ()
  {
    this.sculptgl_.camera_.reset();
    this.sculptgl_.render();
  },

  /** Immort background */
  importBackground: function ()
  {
    $('#backgroundopen').trigger('click');
  },

  /** Save file as OBJ*/
  saveFileAsOBJ: function ()
  {
    if (!this.sculptgl_.mesh_)
      return;
    var data = [Export.exportOBJ(this.sculptgl_.mesh_)];
    var blob = new Blob(data,
    {
      type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, 'yourMesh.obj');
  },

  /** Save file as PLY */
  saveFileAsPLY: function ()
  {
    if (!this.sculptgl_.mesh_)
      return;
    var data = [Export.exportPLY(this.sculptgl_.mesh_)];
    var blob = new Blob(data,
    {
      type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, 'yourMesh.ply');
  },

  /** Save file as STL */
  saveFileAsSTL: function ()
  {
    if (!this.sculptgl_.mesh_)
      return;
    var data = [Export.exportSTL(this.sculptgl_.mesh_)];
    var blob = new Blob(data,
    {
      type: 'text/plain;charset=utf-8'
    });
    saveAs(blob, 'yourMesh.stl');
  },

  /** Export to Verold */
  exportVerold: function ()
  {
    if (!this.sculptgl_.mesh_)
      return;
    if (this.keyVerold_ === '')
    {
      alert('Please enter a verold API Key.');
      return;
    }
    Export.exportVerold(this.sculptgl_.mesh_, this.keyVerold_);
  },

  /** Export to Sketchfab */
  exportSketchfab: function ()
  {
    if (!this.sculptgl_.mesh_)
      return;
    if (this.keySketchfab_ === '')
    {
      alert('Please enter a sketchfab API Key.');
      return;
    }
    Export.exportSketchfab(this.sculptgl_.mesh_, this.keySketchfab_);
  }
};
