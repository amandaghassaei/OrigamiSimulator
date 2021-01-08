/**
 * Created by amandaghassaei on 5/6/17.
 */

function saveFOLD(){


    var filename = $("#foldFilename").val();
    if (filename == "") filename = globals.filename;

    if (globals.Itterate==true){
        var json = {
            file_spec: 1.1,
            file_creator: "Origami Simulator: http://git.amandaghassaei.com/OrigamiSimulator/",
            file_author: $("#foldAuthor").val(),
            file_classes: ["singleModel"],
            file_frames: [],
            edges_vertices: [],
            edges_assignment: [],
            faces_vertices: []
        };
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
            vertices_coords: [],
            edges_vertices: [],
            edges_assignment: [],
            faces_vertices: []
        };
    }
    var useTriangulated = globals.triangulateFOLDseriesExport;
    var fold = globals.pattern.getFoldData(!useTriangulated);


    json.edges_vertices = fold.edges_vertices;

    var edgecount = 0;
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
    json.edges_assignment = assignment;

    json.faces_vertices = fold.faces_vertices;

    if (globals.exportFoldSeriesAngle){
        json.edges_foldAngle = fold.edges_foldAngle;
    }

    if (globals.Itterate==true){
        var sigFig = 100000; //Where to round percents
        var startPercent = globals.startPercent/100;
        var toPercent = globals.toPercent/100;
        var creasePercent = startPercent;
        var nextCreasePercent = startPercent;

        globals.setCreasePercent(creasePercent);
        globals.shouldChangeCreasePercent=true;


        creasePercent=Math.round(creasePercent*sigFig)/sigFig;


        var previousDate = new Date();
        var previousError = globals.globalErrors;
        function getFrames(json,filename){//(creasePercent<=toPercent && creasePercent>=-1){

            var file_frame= {
                frame_title: filename,
                frame_classes: ["foldedForm"],
                frame_attributes: ["3D"],
                frame_unit: globals.foldUnits,
                frame_inherit: true,
                fold_percent_os: [],
                vertices_coords: [],
            };

            globals.threeView.saveFOLDloop();
            var itteration_save_output=should_do_save_fold(previousError,previousDate);

            var do_save_now=itteration_save_output[0];
            previousError=itteration_save_output[1];
            previousDate=itteration_save_output[2];

            nextCreasePercent=itteration_save_output[3];

            nextCreasePercent=Math.round(nextCreasePercent*sigFig)/sigFig;

            if (do_save_now){
                var geo=getGeometry();
                var fold = globals.pattern.getFoldData(!useTriangulated);

                console.log(creasePercent);

                file_frame.fold_percent_os=creasePercent;

                for (var i=0;i<geo.vertices.length;i++){
                    var vertex = geo.vertices[i];
                    file_frame.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
                }

                if (globals.exportFoldSeriesActualAngle){
                    creaseThetas=grabThetas();

                    for(var i=1; i<=edgecount; i++){
                        creaseThetas.unshift(undefined);
                    }//Add undefined angles based on whether at edge of model.

                    file_frame.edges_crease_angle_os=creaseThetas;
                }

                json.file_frames.push(file_frame);

            }
            //document.getElementById("foldPercentOutput").innerHTML = creasePercent;
            var $foldPercentProgress = $("#foldPercentOutput");
            $("#foldPercentOutput").html((nextCreasePercent*100).toFixed(3) + " %");

            creasePercent=nextCreasePercent;
            console.log(creasePercent);
            if(globals.break){
                globals.break=false;
            }else if (creasePercent<=toPercent && creasePercent>=-1){
                setTimeout(function(){getFrames(json,filename);},5);
            }else{
                $("#FOLDseriesProgressModal").modal('hide');
                saveJSON(json,filename);
            }
        }
        getFrames(json,filename);

    }else{

        var geo=getGeometry();


        for (var i=0;i<geo.vertices.length;i++){
            var vertex = geo.vertices[i];
            json.vertices_coords.push([vertex.x, vertex.y, vertex.z]);
        }

        if (globals.exportFoldActualAngle){
            creaseThetas=grabThetas();
            for(var i=1; i<=edgecount; i++){
                creaseThetas.unshift(undefined);
            }
            json.edges_crease_angle_os=creaseThetas;
        }
        saveJSON(json,filename);
    }



}

function saveJSON(json,filename){
    var blob = new Blob([JSON.stringify(json, null, 4)], {type: 'application/octet-binary'});
    saveAs(blob, filename + ".fold");
}
function grabThetas(){
//Copied from rigidSolver + a few changes
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



function should_do_save_fold(previousError,previousDate){


    var do_save_fold = false;

    var de = globals.errorDif; //Error Difference
    var dp = globals.stepSize/100; //How much to add to percent
    var dt = 1000; //Time between error dif

    var currentError = globals.globalErrors;

    var diffError = Math.abs(currentError-previousError);
    console.log(diffError);

    currentDate = new Date();
    var dateDiff=currentDate.getTime()-previousDate.getTime();

    var nextCreasePercent = globals.creasePercent;
     if (dateDiff > dt) {

        previousDate =  currentDate;
        var diffError = Math.abs(currentError-previousError);

        previousError = currentError;
        if (diffError < de || globals.skip){
            nextCreasePercent = nextCreasePercent + dp;
            console.log(nextCreasePercent);
            globals.setCreasePercent(nextCreasePercent);
            globals.shouldChangeCreasePercent=true;
            globals.controls.updateCreasePercent();
            do_save_fold = true;
            if (globals.skip){
                globals.skip=false;
                do_save_fold=false;
            }

        }
    }


    return [do_save_fold, previousError, previousDate, nextCreasePercent]
}
