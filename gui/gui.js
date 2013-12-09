'use strict';

function Gui(sculptgl)
{
  this.sculptgl_ = sculptgl; //main application

  //ui stuffs
  this.ctrlColor_ = null; //color controller
  this.ctrlShaders_ = null; //shaders controller
  this.ctrlSculpt_ = null; //sculpt controller
  this.ctrlClay_ = null; //clay sculpting controller
  this.ctrlNegative_ = null; //negative sculpting controller
  this.ctrlContinuous_ = null; //continuous sculpting controller
  this.ctrlSymmetry_ = null; //symmetry controller
  this.ctrlSculptCulling_ = null; //sculpt culling controller
  this.ctrlRadius_ = null; //radius controller
  this.ctrlIntensity_ = null; //intensity sculpting controller
  this.ctrlCameraType_ = null; //camera type controller
  this.ctrlDetailSubdivision_ = null; //subdivision detail slider
  this.ctrlDetailDecimation_ = null; //decimation detail slider
  this.ctrlNbVertices_ = null; //display number of vertices controller
  this.ctrlNbTriangles_ = null; //display number of triangles controller
  this.ctrlFov_ = null; //vertical field of view controller
  this.ctrlCut_ = null; //apply cut controller
  this.ctrlFillHoles_ = null; //fill holes controller

  this.foldTopo_ = null; //fold topo controller

  //files functions
  this.open_ = this.openFile; //open file button (trigger hidden html input...)
  this.saveOBJ_ = this.saveFileAsOBJ; //save mesh as OBJ
  this.savePLY_ = this.saveFileAsPLY; //save mesh as PLY
  this.saveSTL_ = this.saveFileAsSTL; //save mesh as STL
  this.saveInDb_ = this.saveFileInDb; //save mesh as OBJ in DB

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

    //Pen tablet ui stuffs
    var foldPenTablet = gui.addFolder('Wacom tablet');
    foldPenTablet.add(main, 'usePenRadius_').name('Pressure radius');
    foldPenTablet.add(main, 'usePenIntensity_').name('Pressure intensity');

    //file fold
    var foldFiles = gui.addFolder('Files (save/import/export)');
    foldFiles.add(main, 'resetSphere_').name('Reset sphere');
    foldFiles.add(this, 'saveInDb_').name('Save');
    foldFiles.add(this, 'open_').name('Import (obj, ply, stl)');
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

    //history fold
    var foldHistory = gui.addFolder('History');
    foldHistory.add(main, 'undo_').name('Undo (Ctrl+Z)');
    foldHistory.add(main, 'redo_').name('Redo (Ctrl+Y)');
    foldHistory.open();
  },

  /** Initialize the mesh editing gui (on the right) */
  initEditingGui: function (gui)
  {
    var main = this.sculptgl_;
    var self = this;

    //sculpt fold
    var foldSculpt = gui.addFolder('Sculpt');
    var optionsSculpt = {
      'Brush (1)': Sculpt.tool.BRUSH,
      'Inflate (2)': Sculpt.tool.INFLATE,
      'Rotate (3)': Sculpt.tool.ROTATE,
      'Smooth (4)': Sculpt.tool.SMOOTH,
      'Flatten (5)': Sculpt.tool.FLATTEN,
      'Pinch (6)': Sculpt.tool.PINCH,
      'Crease (7)': Sculpt.tool.CREASE,
      'Drag (8)': Sculpt.tool.DRAG,
      'Paint (9)': Sculpt.tool.COLOR,
      'Scale (0)': Sculpt.tool.SCALE,
      'Cut': Sculpt.tool.CUT
    };
    this.ctrlSculpt_ = foldSculpt.add(main.sculpt_, 'tool_', optionsSculpt).name('Tool');
    this.ctrlSculpt_.onChange(function (value)
    {
      main.sculpt_.tool_ = parseInt(value, 10);
      var tool = main.sculpt_.tool_;
      var st = Sculpt.tool;
      self.ctrlClay_.__li.hidden = tool !== st.BRUSH;
      self.ctrlNegative_.__li.hidden = tool !== st.BRUSH && tool !== st.INFLATE && tool !== st.CREASE;
      self.ctrlContinuous_.__li.hidden = tool === st.ROTATE || tool === st.DRAG || tool === st.SCALE || tool === st.CUT;
      self.ctrlSymmetry_.__li.hidden = tool === st.CUT;
      self.ctrlSculptCulling_.__li.hidden = tool === st.CUT;
      self.ctrlRadius_.__li.hidden = tool === st.CUT;
      self.ctrlIntensity_.__li.hidden = self.ctrlContinuous_.__li.hidden;
      self.ctrlColor_.__li.hidden = tool !== st.COLOR;
      self.ctrlCameraType_.__li.hidden = tool === st.CUT;
      self.ctrlCut_.__li.hidden = tool !== st.CUT;
      self.ctrlFillHoles_.__li.hidden = tool !== st.CUT;
      self.ctrlSubdDetailCut_.__li.hidden = tool !== st.CUT;
      self.foldTopo_.__ul.hidden = tool === st.CUT;
      if (tool === st.CUT)
        self.ctrlCameraType_.setValue(Camera.projType.ORTHOGRAPHIC);
      else
      {
        main.sculpt_.lineOrigin_ = [0, 0];
        main.sculpt_.lineNormal_ = [0, 0];
      }
    });
    this.ctrlClay_ = foldSculpt.add(main.sculpt_, 'clay_').name('Clay');
    this.ctrlNegative_ = foldSculpt.add(main.sculpt_, 'negative_').name('Negative (N)');
    this.ctrlContinuous_ = foldSculpt.add(main, 'continuous_').name('Continuous');
    this.ctrlSymmetry_ = foldSculpt.add(main, 'symmetry_').name('Symmetry');
    this.ctrlSculptCulling_ = foldSculpt.add(main.sculpt_, 'culling_').name('Sculpt culling');
    this.ctrlRadius_ = foldSculpt.add(main.picking_, 'rDisplay_', 5, 200).name('Radius');
    this.ctrlIntensity_ = foldSculpt.add(main.sculpt_, 'intensity_', 0, 1).name('Intensity');
    this.ctrlCut_ = foldSculpt.add(main, 'cut_', 0, 1).name('Click to cut !');
    this.ctrlCut_.__li.hidden = true;
    this.ctrlFillHoles_ = foldSculpt.add(main.sculpt_, 'fillHoles_', 0, 1).name('fill holes (buggy)');
    this.ctrlSubdDetailCut_ = foldSculpt.add(main.sculpt_, 'subdDetailCut_', 0, 4).name('Detail');
    this.ctrlFillHoles_.__li.hidden = true;
    foldSculpt.open();

    //topo fold
    this.foldTopo_ = gui.addFolder('Topology');
    var optionsTopo = {
      'Static': Sculpt.topo.STATIC,
      'Dynamic': Sculpt.topo.SUBDIVISION,
      'Adaptive (!)': Sculpt.topo.ADAPTIVE
    };
    var ctrlTopo = this.foldTopo_.add(main.sculpt_, 'topo_', optionsTopo).name('Tool');
    ctrlTopo.onChange(function (value)
    {
      main.sculpt_.topo_ = parseInt(value, 10);
      var topo = main.sculpt_.topo_;
      var st = Sculpt.topo;
      self.ctrlDetailSubdivision_.__li.hidden = topo === st.STATIC;
      self.ctrlDetailDecimation_.__li.hidden = topo !== st.SUBDIVISION;
    });
    this.ctrlDetailSubdivision_ = this.foldTopo_.add(main.sculpt_, 'detailSubdivision_', 0, 1).name('Subdivision');
    this.ctrlDetailDecimation_ = this.foldTopo_.add(main.sculpt_, 'detailDecimation_', 0, 1).name('Decimation');
    this.foldTopo_.open();

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

  /** Update information on mesh */
  updateMesh: function (mesh)
  {
    if (!mesh)
      return;
    this.ctrlShaders_.object = mesh.render_;
    this.ctrlShaders_.updateDisplay();
    this.updateMeshInfo(mesh.vertices_.length, mesh.triangles_.length);
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
 
  /** Save file in Database*/
  saveFileInDb: function ()
  {
    if (!this.sculptgl_.mesh_)
      return;
    var data = [Export.exportOBJ(this.sculptgl_.mesh_)];
    // Saving file:
    $.ajax({
		url : "api/file/"+fileId+"/content",
		type : 'PUT',
		data : {
			content : data
		},
		success : function (html) {
			if (html) {
				var myObjects = JSON.parse(html);
				$('div#returnstatus').append('<div class="alert alert-success alert-dismissable"> <button type="button" class="close" data-dismiss="alert">&times;</button><strong>Success!</strong> File Saved (' + myObjects.status + ').</div>');
				
			} else {
				$('div#returnstatus').append('<div class="alert alert-danger alert-dismissable"> <button type="button" class="close" data-dismiss="alert">&times;</button><strong>Error!</strong> Problem occured</div>');
			}
		}
	});
	
	// Saving square thumbnail:
	var thumbailSize = 200; // TO DO: define somewhere else...
	var img    = $('#canvas')[0].toDataURL("image/jpg");
	var xClip = yClip = 0, wClip = hClip = 0;
	if ($('#canvas').width()/$('#canvas').height() > 1) {
		hClip = wClip = $('#canvas').height();
		xClip = ($('#canvas').width() - wClip) / 2;
	} else {
		hClip = wClip = $('#canvas').width();
		yClip = ($('#canvas').height() - hClip) / 2;
	}
	var resizerCanvas = $('<canvas/>').width(thumbailSize).height(thumbailSize);
	resizerCanvas.getContext("2d").drawImage(img,xClip,yClip,wClip,hClip,0,0,thumbailSize,thumbailSize);
	img    = resizerCanvas.toDataURL("image/jpg");
    
    $.ajax({
		url : "api/file/"+thumbnailId+"/content",
		type : 'PUT',
		data : {
			content : img
		},
		success : function (html) {
			if (!html) {
				$('div#returnstatus').append('<div class="alert alert-danger alert-dismissable"> <button type="button" class="close" data-dismiss="alert">&times;</button><strong>Error!</strong> Problem occured</div>');
			}
		}
	});
	
	
    }
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
