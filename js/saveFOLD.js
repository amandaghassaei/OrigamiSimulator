/**
 * Created by amandaghassaei on 5/6/17.
 */

function saveFOLD(){


    var filename = $("#foldFilename").val();
    if (filename == "") filename = globals.filename;
    if (globals.itterate==true){
      var json = {
          file_spec: 1.1,
          file_creator: "Origami Simulator: http://git.amandaghassaei.com/OrigamiSimulator/",
          file_author: $("#foldAuthor").val(),
          file_classes: ["singleModel"],
          frame_title: filename,
          frame_classes: ["foldedForm"],
          frame_attributes: ["3D"],
          frame_unit: globals.foldUnits,
          fold_percent: [],
          // vertices_coords: [],
          // edges_vertices: [],
          // edges_assignment: [],
          // edges_crease_angle: [],
          // faces_vertices: []
      };

  var creasePercent = 0;
  globals.previousCreasePercent = creasePercent;
  globals.setCreasePercent(creasePercent);
  globals.shouldChangeCreasePercent=true;
  globals.save_flag=true;
      while(creasePercent<=1 && creasePercent>=-1){
        var fold_percents= {
          fold_percent:[],
          vertices_coords: [],
          edges_vertices: [],
          edges_assignment: [],
          edges_crease_angle: [],
          faces_vertices: []
        };
        creasePercent=globals.previousCreasePercent;
        console.log(creasePercent);

        globals.threeView.saveFOLDloop();
          var do_save_now=globals.do_save_fold;
          if (do_save_now){
              var geo=getGeometry();
              creasePercent=globals.previousCreasePercent;
              console.log(do_save_now);
              console.log(creasePercent);
              console.log(globals.creasePercent);
              fold_percents.fold_percent=creasePercent;

              for (var i=0;i<geo.vertices.length;i++){
                  var vertex = geo.vertices[i];
                  fold_percents.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
              }
              var edgecount=0;
              var useTriangulated = globals.triangulateFOLDexport;
              var fold = globals.pattern.getFoldData(!useTriangulated);
              fold_percents.edges_vertices = fold.edges_vertices;
              var assignment = [];
              for (var i=0;i<fold.edges_assignment.length;i++){
                  if (fold.edges_assignment[i] == "C"){
                      assignment.push("B");
                      edgecount+=1;

                  }else{
                   assignment.push(fold.edges_assignment[i]);
                   if (fold.edges_assignment[i] == "B") {
                     edgecount+=1;

                   }
                 }
              }

              fold_percents.edges_assignment = assignment;
              fold_percents.faces_vertices = fold.faces_vertices;

              creaseThetas=grabThetas();
              console.log("grabed thetas")
              for(var i=1; i<=edgecount; i++){
                  creaseThetas.unshift(undefined);
                  console.log(creaseThetas)
              }//Add undefined angles based on if edge.

              fold_percents.edges_crease_angle=creaseThetas;

              if (globals.exportFoldAngle){
                  fold_percents.edges_foldAngle = fold.edges_foldAngle;
              }
              json.fold_percent.push(fold_percents);

          }

      }
      globals.save_flag=false;
    }else{
      var json = {
          file_spec: 1.1,
          file_creator: "Origami Simulator: http://git.amandaghassaei.com/OrigamiSimulator/",
          file_author: $("#foldAuthor").val(),
          file_classes: ["singleModel"],
          frame_title: filename,
          frame_classes: ["foldedForm"],
          frame_attributes: ["3D"],
          frame_unit: globals.foldUnits,
          fold_angle: [],
          vertices_coords: [],
          edges_vertices: [],
          edges_assignment: [],
          edges_crease_angle: [],
          faces_vertices: []
      };
        var geo=getGeometry();
        var thetas=grabThetas();
        for (var i=0;i<geo.vertices.length;i++){
            var vertex = geo.vertices[i];
            json.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
        }

        var useTriangulated = globals.triangulateFOLDexport;
        var fold = globals.pattern.getFoldData(!useTriangulated);
        json.edges_vertices = fold.edges_vertices;
        var assignment = [];
        for (var i=0;i<fold.edges_assignment.length;i++){
            if (fold.edges_assignment[i] == "C") assignment.push("B");
            else assignment.push(fold.edges_assignment[i]);
        }
        json.edges_assignment = assignment;
        json.faces_vertices = fold.faces_vertices;
        json.edges_crease_angle = thetas;
        if (globals.exportFoldAngle){
            json.edges_foldAngle = fold.edges_foldAngle;
        }
    }
    // for (var i=0;i<geo.vertices.length;i++){
    //     var vertex = geo.vertices[i];
    //     json.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
    // }
    //
    // var useTriangulated = globals.triangulateFOLDexport;
    // var fold = globals.pattern.getFoldData(!useTriangulated);
    // json.edges_vertices = fold.edges_vertices;
    // var assignment = [];
    // for (var i=0;i<fold.edges_assignment.length;i++){
    //     if (fold.edges_assignment[i] == "C") assignment.push("B");
    //     else assignment.push(fold.edges_assignment[i]);
    // }
    // json.edges_assignment = assignment;
    // json.faces_vertices = fold.faces_vertices;
    // json.edges_crease_angle = thetas;
    // if (globals.exportFoldAngle){
    //     json.edges_foldAngle = fold.edges_foldAngle;
    // }

    var blob = new Blob([JSON.stringify(json, null, 4)], {type: 'application/octet-binary'});
    saveAs(blob, filename + ".fold");
}

function grabThetas(){
  var creases = globals.model.getCreases();
  var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );
  var thetas = [];

      var geometry = globals.model.getGeometry();
      var indices = geometry.index.array;
      var normals = [];
      var positions = globals.model.getPositionsArray();
      var cb = new THREE.Vector3(), ab = new THREE.Vector3();
      for (var j=0;j<indices.length;j+=3){
          var index = 3*indices[j];
          var vA = new THREE.Vector3(positions[index], positions[index+1], positions[index+2]);
          index = 3*indices[j+1];
          var vB = new THREE.Vector3(positions[index], positions[index+1], positions[index+2]);
          index = 3*indices[j+2];
          var vC = new THREE.Vector3(positions[index], positions[index+1], positions[index+2]);
          cb.subVectors( vC, vB );
          ab.subVectors( vA, vB );
          cb.cross( ab );

          cb.normalize();
          normals.push(cb.clone());
      }
      for (var j=0;j<creases.length;j++){
          var crease = creases[j];
          var normal1 = normals[crease.face1Index];
          var normal2 = normals[crease.face2Index];
          var dotNormals = normal1.dot(normal2);
          if (dotNormals < -1.0) dotNormals = -1.0;
          else if (dotNormals > 1.0) dotNormals = 1.0;

          var creaseVector = crease.getVector().normalize();
          //https://math.stackexchange.com/questions/47059/how-do-i-calculate-a-dihedral-angle-given-cartesian-coordinates
          var theta = Math.atan2((normal1.clone().cross(creaseVector)).dot(normal2), dotNormals);
          thetas[j] = theta*180/Math.PI;
      }
      return thetas;

}
function getGeometry(){
  var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );

  if (geo.vertices.length == 0 || geo.faces.length == 0) {
      globals.warn("No geometry to save.");
      return;
  }

  if (globals.exportScale != 1){
      for (var i=0;i<geo.vertices.length;i++){
          geo.vertices[i].multiplyScalar(globals.exportScale);
      }
  }
  return geo;
}
