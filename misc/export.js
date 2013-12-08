var Export = {};

/** Export OBJ file */
Export.exportOBJ = function (mesh)
{
  var vAr = mesh.vertexArray_;
  var iAr = mesh.indexArray_;
  var data = 's 0\n';
  var nbVertices = mesh.vertices_.length;
  var nbTriangles = mesh.triangles_.length;
  var scale = 1 / mesh.scale_;
  var i = 0,
    j = 0;
  for (i = 0; i < nbVertices; ++i)
  {
    j = i * 3;
    data += 'v ' + vAr[j] * scale + ' ' + vAr[j + 1] * scale + ' ' + vAr[j + 2] * scale + '\n';
  }
  for (i = 0; i < nbTriangles; ++i)
  {
    j = i * 3;
    data += 'f ' + (1 + iAr[j]) + ' ' + (1 + iAr[j + 1]) + ' ' + (1 + iAr[j + 2]) + '\n';
  }
  return data;
};

/** Export OBJ file to Verold */
Export.exportVerold = function (mesh, key)
{
  var fd = new FormData();

  fd.append('api_key', key);
  var model = Export.exportOBJ(mesh);

  fd.append('model', new Blob([model]), 'model.obj');
  fd.append('title', 'Model');
  fd.append('description', 'Imported from SculptGL.');

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://studio.verold.com/projects.json');

  var result = function ()
  {
    var res = JSON.parse(xhr.responseText);
    console.log(res);
    if (res.errors)
      alert('Verold upload error :\n' + res.errors[0]);
    else
      alert('Upload success !');
  };
  xhr.addEventListener('load', result, true);
  xhr.send(fd);
};

/** Export OBJ file to Sketchfab */
Export.exportSketchfab = function (mesh, key)
{
  var fd = new FormData();

  fd.append('token', key);
  var model = Export.exportOBJ(mesh);

  fd.append('fileModel', new Blob([model]));
  fd.append('filenameModel', 'model.obj');

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.sketchfab.com/v1/models');

  var result = function ()
  {
    var res = JSON.parse(xhr.responseText);
    console.log(res);
    if (!res.success)
      alert('Sketchfab upload error :\n' + res.error);
    else
      alert('Upload success !');
  };
  xhr.addEventListener('load', result, true);
  xhr.send(fd);
};
